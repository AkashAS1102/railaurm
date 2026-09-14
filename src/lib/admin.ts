import { supabase } from "@/integrations/supabase/client";

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

/* ---------- stations ---------- */

export type StationRow = {
  id: string;
  station_code: string;
  station_name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export const listStations = async () =>
  ok<StationRow[]>(
    await supabase
      .from("stations")
      .select("id, station_code, station_name, city, latitude, longitude")
      .order("station_code"),
  );

export async function saveStation(row: Partial<StationRow>) {
  const payload = {
    station_code: (row.station_code ?? "").toUpperCase().trim(),
    station_name: (row.station_name ?? "").trim(),
    city: (row.city ?? "").trim(),
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
  const res = row.id
    ? await supabase.from("stations").update(payload).eq("id", row.id)
    : await supabase.from("stations").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteStation(id: string) {
  const { error } = await supabase.from("stations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- trains ---------- */

export type TrainRow = {
  id: string;
  train_number: string;
  train_name: string;
  source_station_id: string;
  destination_station_id: string;
  total_seats: number;
};

export const listTrains = async () =>
  ok<TrainRow[]>(
    await supabase
      .from("trains")
      .select("id, train_number, train_name, source_station_id, destination_station_id, total_seats")
      .order("train_number"),
  );

export async function saveTrain(row: Partial<TrainRow>) {
  const payload = {
    train_number: (row.train_number ?? "").trim(),
    train_name: (row.train_name ?? "").trim(),
    source_station_id: row.source_station_id!,
    destination_station_id: row.destination_station_id!,
    total_seats: Number(row.total_seats ?? 0),
  };
  const res = row.id
    ? await supabase.from("trains").update(payload).eq("id", row.id)
    : await supabase.from("trains").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteTrain(id: string) {
  const { error } = await supabase.from("trains").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- schedules ---------- */

export type ScheduleRow = {
  id: string;
  train_id: string;
  journey_date: string;
  departure_time: string;
  arrival_time: string;
  travel_class: string;
  fare: number;
  available_seats: number;
};

export const listSchedules = async (trainId: string) =>
  ok<ScheduleRow[]>(
    await supabase
      .from("schedules")
      .select("id, train_id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats")
      .eq("train_id", trainId)
      .order("journey_date")
      .order("travel_class")
      .limit(200),
  );

export async function saveSchedule(row: Partial<ScheduleRow>) {
  const payload = {
    train_id: row.train_id!,
    journey_date: row.journey_date!,
    departure_time: row.departure_time!,
    arrival_time: row.arrival_time!,
    travel_class: row.travel_class ?? "SL",
    fare: Number(row.fare ?? 0),
    available_seats: Number(row.available_seats ?? 0),
  };
  const res = row.id
    ? await supabase.from("schedules").update(payload).eq("id", row.id)
    : await supabase.from("schedules").insert(payload);
  if (res.error) throw new Error(res.error.message);
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- bookings ---------- */

export type AdminBooking = {
  id: string;
  pnr_number: string;
  user_id: string;
  status: string;
  total_amount: number;
  booking_date: string;
  passengers: { id: string; name: string; seat_number: string }[];
  schedules: {
    journey_date: string;
    travel_class: string;
    trains: { train_number: string; train_name: string };
  } | null;
};

export async function listBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, pnr_number, user_id, status, total_amount, booking_date,
       passengers ( id, name, seat_number ),
       schedules ( journey_date, travel_class, trains ( train_number, train_name ) )`,
    )
    .order("booking_date", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AdminBooking[];
}

export async function setBookingStatus(id: string, status: string) {
  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBooking(id: string) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- users ---------- */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
};

export async function listUsers(): Promise<AdminUser[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, email, phone")
    .order("created_at");
  if (error) throw new Error(error.message);
  const { data: roles, error: rErr } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "admin");
  if (rErr) throw new Error(rErr.message);
  const admins = new Set((roles ?? []).map((r) => r.user_id));
  return (profiles ?? []).map((p) => ({ ...p, isAdmin: admins.has(p.id) }));
}

export async function setAdmin(userId: string, grant: boolean) {
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: userId,
    p_role: "admin",
    p_grant: grant,
  });
  if (error) throw new Error(error.message);
}
