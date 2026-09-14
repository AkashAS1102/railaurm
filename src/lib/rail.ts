import { supabase } from "@/integrations/supabase/client";

export type Station = {
  id: string;
  station_code: string;
  station_name: string;
  city: string;
};

export type TrainRef = {
  id: string;
  train_number: string;
  train_name: string;
  total_seats: number;
  source: Station;
  destination: Station;
};

export type ScheduleResult = {
  id: string;
  journey_date: string;
  departure_time: string;
  arrival_time: string;
  travel_class: string;
  fare: number;
  available_seats: number;
  trains: TrainRef;
};

export const CLASSES = [
  { code: "SL", label: "Sleeper" },
  { code: "3A", label: "AC 3 Tier" },
  { code: "2A", label: "AC 2 Tier" },
] as const;

const TRAIN_SELECT = `id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats,
  trains!inner (
    id, train_number, train_name, total_seats, source_station_id, destination_station_id,
    source:stations!trains_source_station_id_fkey ( id, station_code, station_name, city ),
    destination:stations!trains_destination_station_id_fkey ( id, station_code, station_name, city )
  )`;

export const DEFAULT_STATIONS: Station[] = [
  { id: "s1", station_code: "NDLS", station_name: "New Delhi", city: "Delhi" },
  { id: "s2", station_code: "BCT", station_name: "Mumbai Central", city: "Mumbai" },
  { id: "s3", station_code: "HWH", station_name: "Howrah Junction", city: "Kolkata" },
  { id: "s4", station_code: "MAS", station_name: "Chennai Central", city: "Chennai" },
  { id: "s5", station_code: "SBC", station_name: "KSR Bengaluru", city: "Bengaluru" },
  { id: "s6", station_code: "HYB", station_name: "Hyderabad Deccan", city: "Hyderabad" },
  { id: "s7", station_code: "PUNE", station_name: "Pune Junction", city: "Pune" },
  { id: "s8", station_code: "ADI", station_name: "Ahmedabad Junction", city: "Ahmedabad" },
  { id: "s9", station_code: "JP", station_name: "Jaipur Junction", city: "Jaipur" },
  { id: "s10", station_code: "LKO", station_name: "Lucknow Charbagh", city: "Lucknow" },
];

export async function fetchStations(): Promise<Station[]> {
  try {
    const { data, error } = await supabase
      .from("stations")
      .select("id, station_code, station_name, city")
      .order("station_name");
    if (!error && data && data.length > 0) {
      return data as Station[];
    }
  } catch (err) {
    console.warn("Could not fetch stations from database, using fallback list:", err);
  }
  return DEFAULT_STATIONS;
}

export async function searchSchedules(params: {
  from: string;
  to: string;
  date: string;
  cls: string;
}): Promise<ScheduleResult[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select(TRAIN_SELECT)
    .eq("journey_date", params.date)
    .eq("travel_class", params.cls)
    .eq("trains.source_station_id", params.from)
    .eq("trains.destination_station_id", params.to)
    .order("departure_time");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScheduleResult[];
}

export async function fetchSchedule(id: string): Promise<ScheduleResult | null> {
  const { data, error } = await supabase
    .from("schedules")
    .select(TRAIN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as ScheduleResult) ?? null;
}

export type PassengerInput = { name: string; age: number; gender: string };

export type PaymentIntent = { payment_id: string; amount: number; reference: string };

/** Creates a pending payment for the journey and returns the amount to collect. */
export async function startPayment(scheduleId: string, seats: number): Promise<PaymentIntent> {
  const { data, error } = await supabase.rpc("start_payment", {
    p_schedule_id: scheduleId,
    p_seats: seats,
  });
  if (error) throw new Error(friendlyError(error.message));
  const row = (data as PaymentIntent[])[0];
  if (!row) throw new Error("Could not start the payment. Please retry.");
  return { ...row, amount: Number(row.amount) };
}

export async function confirmPayment(paymentId: string, cardLast4: string, method = "CARD") {
  const { error } = await supabase.rpc("confirm_payment", {
    p_payment_id: paymentId,
    p_card_last4: cardLast4,
    p_method: method,
  });
  if (error) throw new Error(friendlyError(error.message));
}

export async function bookTicket(
  scheduleId: string,
  passengers: PassengerInput[],
  paymentId: string,
) {
  const { data, error } = await supabase.rpc("book_ticket", {
    p_schedule_id: scheduleId,
    p_passengers: passengers,
    p_payment_id: paymentId,
  });
  if (error) throw new Error(friendlyError(error.message));
  return data as string;
}


export async function cancelBooking(bookingId: string) {
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(friendlyError(error.message));
  return data as boolean;
}

export type BookingRow = {
  id: string;
  pnr_number: string;
  booking_date: string;
  status: string;
  total_amount: number;
  schedules: ScheduleResult;
  passengers: {
    id: string;
    name: string;
    age: number;
    gender: string;
    seat_number: string;
  }[];
};

const BOOKING_SELECT = `id, pnr_number, booking_date, status, total_amount,
  passengers ( id, name, age, gender, seat_number ),
  schedules ( ${TRAIN_SELECT} )`;

export async function fetchMyBookings(): Promise<BookingRow[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("booking_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BookingRow[];
}

export async function fetchBookingByPnr(pnr: string): Promise<BookingRow | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("pnr_number", pnr)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as BookingRow) ?? null;
}

function friendlyError(message: string) {
  if (message.includes("seat(s) left")) return message.replace(/^.*?(Only )/, "$1");
  if (message.toLowerCase().includes("signed in"))
    return "Please sign in again to complete this booking.";
  return message;
}

export function formatTime(t: string) {
  return t.slice(0, 5);
}

export function durationBetween(dep: string, arr: string) {
  const d = dep.split(":").map(Number);
  const a = arr.split(":").map(Number);
  const dh = d[0] ?? 0;
  const dm = d[1] ?? 0;
  const ah = a[0] ?? 0;
  const am = a[1] ?? 0;
  let mins = ah * 60 + am - (dh * 60 + dm);
  if (mins <= 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function prettyDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ---------- Live network map (real timetables) ---------- */

export type GeoStation = Station & { latitude: number; longitude: number };

export type StopPoint = {
  stationId: string;
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  arrival: string | null;
  departure: string | null;
  /** minutes from the train's own origin departure */
  arriveAt: number | null;
  departAt: number | null;
  km: number;
};

export type LiveRun = {
  scheduleId: string;
  trainNumber: string;
  trainName: string;
  fare: number;
  seats: number;
  departure: string;
  arrival: string;
  stops: StopPoint[];
  from: StopPoint;
  to: StopPoint;
  /** total run time in minutes */
  duration: number;
};

const clock = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export async function fetchLiveRuns(): Promise<LiveRun[]> {
  const { data, error } = await supabase
    .from("schedules")
    .select(
      `id, departure_time, arrival_time, fare, available_seats,
       trains!inner (
         train_number, train_name,
         train_stops ( stop_order, arrival_time, departure_time, day_offset, distance_km,
           stations ( id, station_code, station_name, city, latitude, longitude ) )
       )`,
    )
    .eq("journey_date", todayISO())
    .eq("travel_class", "SL")
    .order("departure_time");
  if (error) throw new Error(error.message);

  type RawStop = {
    stop_order: number;
    arrival_time: string | null;
    departure_time: string | null;
    day_offset: number;
    distance_km: number;
    stations: {
      id: string;
      station_code: string;
      station_name: string;
      city: string;
      latitude: number | null;
      longitude: number | null;
    };
  };
  type Row = {
    id: string;
    departure_time: string;
    arrival_time: string;
    fare: number;
    available_seats: number;
    trains: { train_number: string; train_name: string; train_stops: RawStop[] };
  };

  const runs: LiveRun[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    const raw = [...(row.trains.train_stops ?? [])].sort((a, b) => a.stop_order - b.stop_order);
    if (raw.length < 2) continue;
    const originDep = raw[0]?.departure_time;
    if (!originDep) continue;
    const zero = clock(originDep);

    const stops: StopPoint[] = raw
      .filter((s) => s.stations?.latitude != null && s.stations?.longitude != null)
      .map((s) => ({
        stationId: s.stations.id,
        code: s.stations.station_code,
        name: s.stations.station_name,
        city: s.stations.city,
        lat: Number(s.stations.latitude),
        lng: Number(s.stations.longitude),
        arrival: s.arrival_time,
        departure: s.departure_time,
        arriveAt: s.arrival_time ? s.day_offset * 1440 + clock(s.arrival_time) - zero : null,
        departAt: s.departure_time ? s.day_offset * 1440 + clock(s.departure_time) - zero : null,
        km: s.distance_km,
      }));
    if (stops.length < 2) continue;

    const from = stops[0]!;
    const to = stops[stops.length - 1]!;
    runs.push({
      scheduleId: row.id,
      trainNumber: row.trains.train_number,
      trainName: row.trains.train_name,
      fare: Number(row.fare),
      seats: row.available_seats,
      departure: row.departure_time,
      arrival: row.arrival_time,
      stops,
      from,
      to,
      duration: to.arriveAt ?? 0,
    });
  }
  return runs;
}

export async function fetchGeoStations(): Promise<GeoStation[]> {
  const { data, error } = await supabase
    .from("stations")
    .select("id, station_code, station_name, city, latitude, longitude")
    .order("station_name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as GeoStation[]).filter((s) => s.latitude != null);
}

export type RunPosition = {
  lat: number;
  lng: number;
  progress: number;
  elapsed: number;
  lastStop: StopPoint;
  nextStop: StopPoint;
  atStation: boolean;
};

/** Where a train is right now, interpolated along its real timetable legs. */
export function runPosition(run: LiveRun, now = new Date()): RunPosition | null {
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const start = clock(run.departure);
  let elapsed = nowMin - start;
  if (elapsed < 0) elapsed += 1440;
  if (elapsed <= 0 || elapsed >= run.duration) return null;

  for (let i = 0; i < run.stops.length - 1; i++) {
    const a = run.stops[i]!;
    const b = run.stops[i + 1]!;
    const leaveA = a.departAt ?? a.arriveAt ?? 0;
    const reachB = b.arriveAt ?? b.departAt ?? 0;
    const holdA = a.arriveAt ?? leaveA;

    if (elapsed >= holdA && elapsed < leaveA) {
      return { lat: a.lat, lng: a.lng, progress: elapsed / run.duration, elapsed, lastStop: a, nextStop: b, atStation: true };
    }
    if (elapsed >= leaveA && elapsed < reachB) {
      const f = reachB === leaveA ? 0 : (elapsed - leaveA) / (reachB - leaveA);
      return {
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
        progress: elapsed / run.duration,
        elapsed,
        lastStop: a,
        nextStop: b,
        atStation: false,
      };
    }
  }
  return null;
}

export function minutesToHm(mins: number) {
  const m = Math.max(0, Math.round(mins));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

