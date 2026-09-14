
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','customer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          COALESCE(NEW.email,''),
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- REFERENCE DATA
CREATE TABLE public.stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code text NOT NULL UNIQUE,
  station_name text NOT NULL,
  city text NOT NULL
);
GRANT SELECT ON public.stations TO anon, authenticated;
GRANT ALL ON public.stations TO service_role;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations public read" ON public.stations FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.trains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number text NOT NULL UNIQUE,
  train_name text NOT NULL,
  source_station_id uuid NOT NULL REFERENCES public.stations(id),
  destination_station_id uuid NOT NULL REFERENCES public.stations(id),
  total_seats integer NOT NULL CHECK (total_seats > 0),
  CHECK (source_station_id <> destination_station_id)
);
GRANT SELECT ON public.trains TO anon, authenticated;
GRANT ALL ON public.trains TO service_role;
ALTER TABLE public.trains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trains public read" ON public.trains FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_id uuid NOT NULL REFERENCES public.trains(id) ON DELETE CASCADE,
  journey_date date NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  travel_class text NOT NULL DEFAULT 'SL',
  fare numeric(10,2) NOT NULL CHECK (fare >= 0),
  available_seats integer NOT NULL CHECK (available_seats >= 0),
  UNIQUE (train_id, journey_date, travel_class)
);
GRANT SELECT ON public.schedules TO anon, authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules public read" ON public.schedules FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX idx_schedules_date ON public.schedules (journey_date);

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.schedules(id),
  booking_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED')),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0)
);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer NOT NULL CHECK (age > 0 AND age < 120),
  gender text NOT NULL CHECK (gender IN ('Male','Female','Other')),
  seat_number text NOT NULL
);
GRANT SELECT, INSERT ON public.passengers TO authenticated;
GRANT ALL ON public.passengers TO service_role;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own passengers read" ON public.passengers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

-- BOOKING TRANSACTION
CREATE OR REPLACE FUNCTION public.book_ticket(p_schedule_id uuid, p_passengers jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'You must be signed in to book.'; END IF;
  IF v_count IS NULL OR v_count < 1 OR v_count > 6 THEN RAISE EXCEPTION 'Add between 1 and 6 passengers.'; END IF;

  SELECT s.available_seats, s.fare, t.total_seats INTO v_avail, v_fare, v_total
  FROM public.schedules s JOIN public.trains t ON t.id = s.train_id
  WHERE s.id = p_schedule_id FOR UPDATE OF s;

  IF NOT FOUND THEN RAISE EXCEPTION 'This train is no longer available.'; END IF;
  IF v_avail < v_count THEN
    RAISE EXCEPTION 'Only % seat(s) left on this train.', v_avail;
  END IF;

  v_pnr := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));

  INSERT INTO public.bookings (pnr_number, user_id, schedule_id, total_amount)
  VALUES (v_pnr, v_user, p_schedule_id, v_fare * v_count)
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

  RETURN v_pnr;
END; $$;

GRANT EXECUTE ON FUNCTION public.book_ticket(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sched uuid; v_n int;
BEGIN
  SELECT schedule_id INTO v_sched FROM public.bookings
  WHERE id = p_booking_id AND user_id = auth.uid() AND status = 'CONFIRMED' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO v_n FROM public.passengers WHERE booking_id = p_booking_id;
  UPDATE public.bookings SET status = 'CANCELLED' WHERE id = p_booking_id;
  UPDATE public.schedules SET available_seats = available_seats + v_n WHERE id = v_sched;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

-- SEED
INSERT INTO public.stations (station_code, station_name, city) VALUES
 ('NDLS','New Delhi','Delhi'),
 ('BCT','Mumbai Central','Mumbai'),
 ('HWH','Howrah Junction','Kolkata'),
 ('MAS','Chennai Central','Chennai'),
 ('SBC','KSR Bengaluru','Bengaluru'),
 ('HYB','Hyderabad Deccan','Hyderabad'),
 ('PUNE','Pune Junction','Pune'),
 ('ADI','Ahmedabad Junction','Ahmedabad'),
 ('JP','Jaipur Junction','Jaipur'),
 ('LKO','Lucknow Charbagh','Lucknow');

INSERT INTO public.trains (train_number, train_name, source_station_id, destination_station_id, total_seats)
SELECT v.num, v.nm, s.id, d.id, v.seats
FROM (VALUES
 ('12951','Mumbai Rajdhani','NDLS','BCT',480),
 ('12952','Mumbai Rajdhani Return','BCT','NDLS',480),
 ('12301','Howrah Rajdhani','NDLS','HWH',420),
 ('12302','Delhi Rajdhani','HWH','NDLS',420),
 ('12621','Tamil Nadu Express','NDLS','MAS',560),
 ('12622','Tamil Nadu Express Return','MAS','NDLS',560),
 ('12027','Shatabdi Express','SBC','MAS',320),
 ('12028','Shatabdi Express Return','MAS','SBC',320),
 ('11301','Udyan Express','BCT','SBC',500),
 ('12123','Deccan Queen','PUNE','BCT',380),
 ('12009','Shatabdi Ahmedabad','BCT','ADI',300),
 ('12958','Swarna Jayanti Rajdhani','ADI','NDLS',440),
 ('12015','Ajmer Shatabdi','NDLS','JP',300),
 ('12004','Lucknow Shatabdi','NDLS','LKO',330),
 ('12723','Telangana Express','HYB','NDLS',520),
 ('12724','Telangana Express Return','NDLS','HYB',520)
) AS v(num, nm, src, dst, seats)
JOIN public.stations s ON s.station_code = v.src
JOIN public.stations d ON d.station_code = v.dst;

INSERT INTO public.schedules (train_id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats)
SELECT t.id,
       d::date,
       c.dep,
       c.arr,
       c.cls,
       round((800 + (('x' || substr(md5(t.train_number || c.cls),1,6))::bit(24)::int % 1400)) * c.mult)::numeric,
       greatest(12, (t.total_seats * c.share)::int - (('x' || substr(md5(t.train_number || d::text || c.cls),1,4))::bit(16)::int % 40))
FROM public.trains t
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + 45, interval '1 day') AS d
CROSS JOIN (VALUES
 ('SL', time '06:15', time '14:40', 1.0, 0.5),
 ('3A', time '16:30', time '06:10', 1.9, 0.3),
 ('2A', time '22:05', time '11:25', 2.8, 0.2)
) AS c(cls, dep, arr, mult, share);
