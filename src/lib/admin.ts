import { supabase } from "@/integrations/supabase/client";
import { SEED_STATIONS, SEED_TRAINS } from "./seedData";

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

export async function addAdminByEmail(email: string): Promise<{ success: boolean; message: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  // 1. Try the database RPC grant_admin_by_email
  try {
    const { data, error } = await (supabase.rpc as any)("grant_admin_by_email", {
      p_email: clean,
    });
    if (!error && data) {
      const res = data as { success: boolean; message: string };
      if (!res.success) throw new Error(res.message);
      return res;
    }
  } catch (rpcErr: any) {
    console.warn("grant_admin_by_email RPC fallback:", rpcErr);
  }

  // 2. Direct profiles lookup fallback
  const { data: userProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, email, name")
    .ilike("email", clean)
    .maybeSingle();

  if (profileErr) throw new Error(profileErr.message);

  if (!userProfile) {
    throw new Error(
      `No registered user found with email "${email}". Ask them to create an account on RailAurum first, then you can make them an admin.`
    );
  }

  await setAdmin(userProfile.id, true);
  return { success: true, message: `Admin privileges granted to ${email}.` };
}

/* ---------- one-click network seeder (100 stations & 50 trains) ---------- */

export async function seedNetworkData(
  onProgress?: (msg: string) => void,
): Promise<{ stationsCount: number; trainsCount: number }> {
  onProgress?.("Writing 100 stations to database...");

  // 1. Upsert 100 stations in chunks of 50
  for (let i = 0; i < SEED_STATIONS.length; i += 50) {
    const chunk = SEED_STATIONS.slice(i, i + 50);
    const { error } = await supabase.from("stations").upsert(
      chunk.map((s) => ({
        station_code: s.station_code,
        station_name: s.station_name,
        city: s.city,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      { onConflict: "station_code" },
    );
    if (error) throw new Error(`Station seed failed: ${error.message}`);
  }

  onProgress?.("Mapping stations...");
  const { data: stations, error: sErr } = await supabase
    .from("stations")
    .select("id, station_code");
  if (sErr) throw new Error(sErr.message);

  const codeToId = new Map((stations ?? []).map((s) => [s.station_code, s.id]));

  // 2. Upsert 50 trains
  onProgress?.("Writing 50 trains to database...");
  const trainRows = SEED_TRAINS.map((t) => {
    const srcId = codeToId.get(t.source_code);
    const dstId = codeToId.get(t.destination_code);
    if (!srcId || !dstId) {
      throw new Error(`Station codes ${t.source_code} or ${t.destination_code} not found for ${t.train_number}`);
    }
    return {
      train_number: t.train_number,
      train_name: t.train_name,
      source_station_id: srcId,
      destination_station_id: dstId,
      total_seats: t.total_seats,
    };
  });

  const { error: tErr } = await supabase
    .from("trains")
    .upsert(trainRows, { onConflict: "train_number" });
  if (tErr) throw new Error(`Train seed failed: ${tErr.message}`);

  // 3. Fetch trains mapping
  const { data: allTrains, error: trErr } = await supabase
    .from("trains")
    .select("id, train_number, source_station_id, destination_station_id, total_seats");
  if (trErr) throw new Error(trErr.message);

  const trainMap = new Map((allTrains ?? []).map((t) => [t.train_number, t]));

  // 4. Upsert train_stops (Timetable)
  onProgress?.("Creating timetable stops for live tracking...");
  const stopRows: any[] = [];
  for (const st of SEED_TRAINS) {
    const tr = trainMap.get(st.train_number);
    if (!tr) continue;
    stopRows.push({
      train_id: tr.id,
      station_id: tr.source_station_id,
      stop_order: 1,
      departure_time: st.dep,
      arrival_time: null,
      day_offset: 0,
      distance_km: 0,
      halt_minutes: 0,
    });
    stopRows.push({
      train_id: tr.id,
      station_id: tr.destination_station_id,
      stop_order: 2,
      departure_time: null,
      arrival_time: st.arr,
      day_offset: 0,
      distance_km: 750,
      halt_minutes: 0,
    });
  }

  if (stopRows.length > 0) {
    await supabase.from("train_stops").upsert(stopRows, { onConflict: "train_id,stop_order" });
  }

  // 5. Generate schedules for 14 days
  onProgress?.("Generating schedules for the next 14 days...");
  const scheduleRows: any[] = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const d = new Date(today.getTime() + dayOffset * 86400000);
    const dateStr = d.toISOString().slice(0, 10);

    for (const st of SEED_TRAINS) {
      const tr = trainMap.get(st.train_number);
      if (!tr) continue;

      for (const cls of st.classes) {
        const mult =
          cls === "EC" ? 1.8 : cls === "1A" ? 3.5 : cls === "2A" ? 2.4 : cls === "3A" ? 1.7 : 1.0;
        scheduleRows.push({
          train_id: tr.id,
          journey_date: dateStr,
          departure_time: st.dep,
          arrival_time: st.arr,
          travel_class: cls,
          fare: Math.round(st.base_fare * mult),
          available_seats: Math.max(15, Math.floor(tr.total_seats / st.classes.length)),
        });
      }
    }
  }

  for (let i = 0; i < scheduleRows.length; i += 100) {
    const chunk = scheduleRows.slice(i, i + 100);
    await supabase.from("schedules").upsert(chunk, { onConflict: "train_id,journey_date,travel_class" });
  }

  onProgress?.("Seeding complete!");
  return { stationsCount: SEED_STATIONS.length, trainsCount: SEED_TRAINS.length };
}
