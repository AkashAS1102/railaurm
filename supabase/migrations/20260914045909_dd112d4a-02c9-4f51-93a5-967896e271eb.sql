CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- train stops (real timetable) ----------
CREATE TABLE public.train_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_id uuid NOT NULL REFERENCES public.trains(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES public.stations(id) ON DELETE RESTRICT,
  stop_order int NOT NULL,
  arrival_time time,
  departure_time time,
  day_offset int NOT NULL DEFAULT 0,
  distance_km int NOT NULL DEFAULT 0,
  halt_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (train_id, stop_order)
);

GRANT SELECT ON public.train_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.train_stops TO authenticated;
GRANT ALL ON public.train_stops TO service_role;
ALTER TABLE public.train_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "train_stops public read" ON public.train_stops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "train_stops admin write" ON public.train_stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER train_stops_touch BEFORE UPDATE ON public.train_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- payments ----------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  seats int NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  method text NOT NULL DEFAULT 'CARD',
  card_last4 text,
  reference text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin payments read" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER payments_touch BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- admin management policies ----------
GRANT INSERT, UPDATE, DELETE ON public.stations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.trains TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT INSERT, DELETE ON public.bookings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.passengers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE POLICY "stations admin write" ON public.stations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "trains admin write" ON public.trains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "schedules admin write" ON public.schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "bookings admin all" ON public.bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "passengers admin all" ON public.passengers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin read" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles admin read" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles admin write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- payment + booking flow ----------
CREATE OR REPLACE FUNCTION public.start_payment(p_schedule_id uuid, p_seats int)
RETURNS TABLE (payment_id uuid, amount numeric, reference text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_fare numeric;
  v_amount numeric;
  v_ref text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be signed in to pay.'; END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 6 THEN RAISE EXCEPTION 'Add between 1 and 6 passengers.'; END IF;
  SELECT s.fare INTO v_fare FROM public.schedules s WHERE s.id = p_schedule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This train is no longer available.'; END IF;
  v_amount := round(v_fare * p_seats * 1.02);
  v_ref := 'PAY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  INSERT INTO public.payments (user_id, schedule_id, seats, amount, reference)
  VALUES (v_user, p_schedule_id, p_seats, v_amount, v_ref)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, v_amount, v_ref;
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_payment(p_payment_id uuid, p_card_last4 text, p_method text DEFAULT 'CARD')
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You must be signed in to pay.'; END IF;
  SELECT status INTO v_status FROM public.payments
   WHERE id = p_payment_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF v_status = 'PAID' THEN RETURN 'PAID'; END IF;
  IF v_status <> 'PENDING' THEN RAISE EXCEPTION 'This payment can no longer be completed.'; END IF;
  UPDATE public.payments
     SET status = 'PAID', card_last4 = p_card_last4, method = coalesce(p_method,'CARD')
   WHERE id = p_payment_id;
  RETURN 'PAID';
END; $$;

DROP FUNCTION IF EXISTS public.book_ticket(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.book_ticket(p_schedule_id uuid, p_passengers jsonb, p_payment_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count int := jsonb_array_length(p_passengers);
  v_avail int;
  v_total int;
  v_fare numeric;
  v_pnr text;
  v_booking uuid;
  v_p jsonb;
  v_idx int := 0;
  v_pay public.payments%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be signed in to book.'; END IF;
  IF v_count IS NULL OR v_count < 1 OR v_count > 6 THEN RAISE EXCEPTION 'Add between 1 and 6 passengers.'; END IF;

  SELECT * INTO v_pay FROM public.payments
   WHERE id = p_payment_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found for this booking.'; END IF;
  IF v_pay.status <> 'PAID' THEN RAISE EXCEPTION 'Payment has not been completed yet.'; END IF;
  IF v_pay.booking_id IS NOT NULL THEN RAISE EXCEPTION 'This payment has already been used.'; END IF;
  IF v_pay.schedule_id <> p_schedule_id OR v_pay.seats <> v_count THEN
    RAISE EXCEPTION 'Payment does not match this journey.';
  END IF;

  SELECT s.available_seats, s.fare, t.total_seats INTO v_avail, v_fare, v_total
  FROM public.schedules s JOIN public.trains t ON t.id = s.train_id
  WHERE s.id = p_schedule_id FOR UPDATE OF s;

  IF NOT FOUND THEN RAISE EXCEPTION 'This train is no longer available.'; END IF;
  IF v_avail < v_count THEN
    UPDATE public.payments SET status = 'REFUNDED' WHERE id = p_payment_id;
    RAISE EXCEPTION 'Only % seat(s) left on this train. Your payment has been refunded.', v_avail;
  END IF;

  v_pnr := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  INSERT INTO public.bookings (pnr_number, user_id, schedule_id, total_amount)
  VALUES (v_pnr, v_user, p_schedule_id, v_pay.amount)
  RETURNING id INTO v_booking;

  FOR v_p IN SELECT * FROM jsonb_array_elements(p_passengers) LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.passengers (booking_id, name, age, gender, seat_number)
    VALUES (v_booking,
            v_p->>'name',
            (v_p->>'age')::int,
            v_p->>'gender',
            'S' || ((v_total - v_avail + v_idx - 1) / 8 + 1)::text || '-' || ((v_total - v_avail + v_idx - 1) % 8 + 1)::text);
  END LOOP;

  UPDATE public.schedules SET available_seats = available_seats - v_count WHERE id = p_schedule_id;
  UPDATE public.payments SET booking_id = v_booking WHERE id = p_payment_id;

  RETURN v_pnr;
END; $$;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role app_role, p_grant boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only.'; END IF;
  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
  END IF;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.start_payment(uuid,int) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid,text,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.book_ticket(uuid,jsonb,uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_user_role(uuid,app_role,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_payment(uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_ticket(uuid,jsonb,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid,app_role,boolean) TO authenticated;
