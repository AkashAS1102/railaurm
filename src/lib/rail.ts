import { supabase } from "@/integrations/supabase/client";
import { SEED_STATIONS } from "./seedData";

export type Station = {
  id: string;
  station_code: string;
  station_name: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
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
  { code: "1A", label: "AC First Class" },
  { code: "CC", label: "AC Chair Car" },
  { code: "EC", label: "Executive Chair Car" },
] as const;

const TRAIN_SELECT = `id, journey_date, departure_time, arrival_time, travel_class, fare, available_seats,
  trains!inner (
    id, train_number, train_name, total_seats, source_station_id, destination_station_id,
    source:stations!trains_source_station_id_fkey ( id, station_code, station_name, city, latitude, longitude ),
    destination:stations!trains_destination_station_id_fkey ( id, station_code, station_name, city, latitude, longitude )
  )`;

export const DEFAULT_STATIONS: Station[] = SEED_STATIONS.map((s, i) => ({
  id: `fallback-st-${i}`,
  station_code: s.station_code,
  station_name: s.station_name,
  city: s.city,
  latitude: s.latitude,
  longitude: s.longitude,
}));

export async function fetchStations(): Promise<Station[]> {
  try {
    const { data, error } = await supabase
      .from("stations")
      .select("id, station_code, station_name, city, latitude, longitude")
      .order("station_name");
    if (!error && data && data.length > 0) {
      return data as Station[];
    }
  } catch (err) {
    console.warn("Could not fetch stations from database, using fallback list:", err);
  }
  return DEFAULT_STATIONS;
}

// In-memory cache for generated routes
const syntheticScheduleCache = new Map<string, ScheduleResult>();

function calculateStationDist(
  s1?: { latitude?: number | null; longitude?: number | null } | null,
  s2?: { latitude?: number | null; longitude?: number | null } | null,
): number {
  if (!s1?.latitude || !s1?.longitude || !s2?.latitude || !s2?.longitude) return 650;
  const dLat = ((s2.latitude - s1.latitude) * Math.PI) / 180;
  const dLon = ((s2.longitude - s1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((s1.latitude * Math.PI) / 180) *
      Math.cos((s2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = Math.round(6371 * c);
  return Math.max(40, dist);
}

function calculateDynamicFare(cls: string, distanceKm: number): number {
  switch (cls) {
    case "SL":
      return Math.round(140 + distanceKm * 0.48);
    case "3A":
      return Math.round(420 + distanceKm * 1.18);
    case "2A":
      return Math.round(620 + distanceKm * 1.68);
    case "1A":
      return Math.round(1050 + distanceKm * 2.85);
    case "CC":
      return Math.round(360 + distanceKm * 0.98);
    case "EC":
      return Math.round(720 + distanceKm * 1.95);
    default:
      return Math.round(250 + distanceKm * 0.6);
  }
}

function generateDeterministicTimings(codeA: string, codeB: string, distanceKm: number) {
  const durMins = Math.max(60, Math.round((distanceKm / 70) * 60 + 30));
  let hash = 0;
  const key = `${codeA}-${codeB}`;
  for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i);
  const depHour = 5 + (Math.abs(hash) % 17); // 05:00 - 21:00
  const depMin = (Math.abs(hash) % 4) * 15;

  const depTime = `${String(depHour).padStart(2, "0")}:${String(depMin).padStart(2, "0")}:00`;
  const arrTotal = depHour * 60 + depMin + durMins;
  const arrHour = Math.floor(arrTotal / 60) % 24;
  const arrMin = arrTotal % 60;
  const arrTime = `${String(arrHour).padStart(2, "0")}:${String(arrMin).padStart(2, "0")}:00`;

  return { depTime, arrTime, durMins, trainNum: String(30000 + (Math.abs(hash) % 65000)) };
}

export async function searchSchedules(params: {
  from: string;
  to: string;
  date: string;
  cls: string;
}): Promise<ScheduleResult[]> {
  // Step 1: Direct database lookup
  try {
    const { data, error } = await supabase
      .from("schedules")
      .select(TRAIN_SELECT)
      .eq("journey_date", params.date)
      .eq("travel_class", params.cls)
      .eq("trains.source_station_id", params.from)
      .eq("trains.destination_station_id", params.to)
      .order("departure_time");

    if (!error && data && data.length > 0) {
      return data as unknown as ScheduleResult[];
    }
  } catch (err) {
    console.warn("Direct schedule search failed, checking provisioner:", err);
  }

  // Step 2: On-demand RPC provisioner (runs inside PostgreSQL with SECURITY DEFINER)
  try {
    const { error: rpcErr } = await (supabase.rpc as any)("ensure_train_schedule", {
      p_source_id: params.from,
      p_dest_id: params.to,
      p_date: params.date,
      p_cls: params.cls,
    });

    if (!rpcErr) {
      const { data: refreshed, error: refErr } = await supabase
        .from("schedules")
        .select(TRAIN_SELECT)
        .eq("journey_date", params.date)
        .eq("travel_class", params.cls)
        .eq("trains.source_station_id", params.from)
        .eq("trains.destination_station_id", params.to)
        .order("departure_time");

      if (!refErr && refreshed && refreshed.length > 0) {
        return refreshed as unknown as ScheduleResult[];
      }
    } else {
      console.warn("ensure_train_schedule notice:", rpcErr.message);
    }
  } catch (err) {
    console.warn("ensure_train_schedule exception:", err);
  }

  // Step 3: Resilient client synthesis so the user ALWAYS has a train for every combination
  const allStations = await fetchStations();
  const src =
    allStations.find((s) => s.id === params.from || s.station_code === params.from) ??
    SEED_STATIONS.find((s) => s.station_code === params.from);
  const dst =
    allStations.find((s) => s.id === params.to || s.station_code === params.to) ??
    SEED_STATIONS.find((s) => s.station_code === params.to);

  if (src && dst) {
    const dist = calculateStationDist(src, dst);
    const timings = generateDeterministicTimings(src.station_code, dst.station_code, dist);
    const fare = calculateDynamicFare(params.cls, dist);

    const synthId = `synthetic-${src.station_code}-${dst.station_code}-${params.date}-${params.cls}`;
    const trainName =
      src.city === dst.city
        ? `${src.station_name} - ${dst.station_name} Local SF`
        : `${src.city} - ${dst.city} Superfast Express`;

    const syntheticResult: ScheduleResult = {
      id: synthId,
      journey_date: params.date,
      departure_time: timings.depTime,
      arrival_time: timings.arrTime,
      travel_class: params.cls,
      fare,
      available_seats: 120,
      trains: {
        id: `train-${timings.trainNum}`,
        train_number: timings.trainNum,
        train_name: trainName,
        total_seats: 650,
        source: {
          id: (src as any).id ?? `st-${src.station_code}`,
          station_code: src.station_code,
          station_name: src.station_name,
          city: src.city,
          latitude: src.latitude,
          longitude: src.longitude,
        },
        destination: {
          id: (dst as any).id ?? `st-${dst.station_code}`,
          station_code: dst.station_code,
          station_name: dst.station_name,
          city: dst.city,
          latitude: dst.latitude,
          longitude: dst.longitude,
        },
      },
    };

    syntheticScheduleCache.set(synthId, syntheticResult);
    return [syntheticResult];
  }

  return [];
}

export async function fetchSchedule(id: string): Promise<ScheduleResult | null> {
  // Check in-memory synthetic cache first for instant resolution
  if (syntheticScheduleCache.has(id)) {
    return syntheticScheduleCache.get(id)!;
  }

  try {
    const { data, error } = await supabase
      .from("schedules")
      .select(TRAIN_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as unknown as ScheduleResult;
    }
  } catch (err) {
    console.warn("fetchSchedule error:", err);
  }

  return syntheticScheduleCache.get(id) ?? null;
}

export type PassengerInput = { name: string; age: number; gender: string };

export type PaymentIntent = { payment_id: string; amount: number; reference: string };

/** Creates a pending payment for the journey and returns the amount to collect. */
export async function startPayment(scheduleId: string, seats: number): Promise<PaymentIntent> {
  let targetScheduleId = scheduleId;

  if (targetScheduleId.startsWith("synthetic-")) {
    const parts = targetScheduleId.split("-");
    // Format: synthetic - SRC - DST - YYYY - MM - DD - CLS
    if (parts.length >= 7) {
      const srcCode = parts[1];
      const dstCode = parts[2];
      const date = `${parts[3]}-${parts[4]}-${parts[5]}`;
      const cls = parts[6];

      try {
        const { data: stData } = await supabase
          .from("stations")
          .select("id, station_code")
          .in("station_code", [srcCode, dstCode]);

        const srcSt = stData?.find((s) => s.station_code === srcCode);
        const dstSt = stData?.find((s) => s.station_code === dstCode);

        if (srcSt && dstSt) {
          await (supabase.rpc as any)("ensure_train_schedule", {
            p_source_id: srcSt.id,
            p_dest_id: dstSt.id,
            p_date: date,
            p_cls: cls,
          });

          const { data: realSched } = await supabase
            .from("schedules")
            .select("id")
            .eq("journey_date", date)
            .eq("travel_class", cls)
            .eq("trains.source_station_id", srcSt.id)
            .eq("trains.destination_station_id", dstSt.id)
            .maybeSingle();

          if (realSched?.id) {
            targetScheduleId = realSched.id;
          }
        }
      } catch (e) {
        console.warn("Could not auto-promote synthetic schedule:", e);
      }
    }
  }

  const { data, error } = await supabase.rpc("start_payment", {
    p_schedule_id: targetScheduleId,
    p_seats: seats,
  });

  if (error) {
    if (targetScheduleId.startsWith("synthetic-")) {
      throw new Error(
        "To reserve on auto-generated trains, please execute the latest migration in your Supabase SQL editor (supabase/migrations/20260914090000_train_for_every_combination.sql), or select one of the pre-seeded flagship trains."
      );
    }
    throw new Error(friendlyError(error.message));
  }

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
  try {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        `id, departure_time, arrival_time, fare, available_seats, travel_class,
         trains!inner (
           id, train_number, train_name,
           source:stations!trains_source_station_id_fkey ( id, station_code, station_name, city, latitude, longitude ),
           destination:stations!trains_destination_station_id_fkey ( id, station_code, station_name, city, latitude, longitude ),
           train_stops ( stop_order, arrival_time, departure_time, day_offset, distance_km,
             stations ( id, station_code, station_name, city, latitude, longitude ) )
         )`,
      )
      .eq("journey_date", todayISO())
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
      } | null;
    };
    type StationRef = {
      id: string;
      station_code: string;
      station_name: string;
      city: string;
      latitude: number | null;
      longitude: number | null;
    };
    type Row = {
      id: string;
      departure_time: string;
      arrival_time: string;
      travel_class: string;
      fare: number;
      available_seats: number;
      trains: {
        id: string;
        train_number: string;
        train_name: string;
        source: StationRef | null;
        destination: StationRef | null;
        train_stops: RawStop[] | null;
      };
    };

    const seenTrains = new Set<string>();
    const runs: LiveRun[] = [];

    for (const row of (data ?? []) as unknown as Row[]) {
      if (seenTrains.has(row.trains.train_number)) continue;
      seenTrains.add(row.trains.train_number);

      const rawStops = [...(row.trains.train_stops ?? [])].sort(
        (a, b) => a.stop_order - b.stop_order,
      );

      let stops: StopPoint[] = [];

      if (rawStops.length >= 2) {
        const originDep = rawStops[0]?.departure_time ?? row.departure_time;
        const zero = clock(originDep);

        stops = rawStops
          .filter((s) => s.stations?.latitude != null && s.stations?.longitude != null)
          .map((s) => ({
            stationId: s.stations!.id,
            code: s.stations!.station_code,
            name: s.stations!.station_name,
            city: s.stations!.city,
            lat: Number(s.stations!.latitude),
            lng: Number(s.stations!.longitude),
            arrival: s.arrival_time,
            departure: s.departure_time,
            arriveAt: s.arrival_time ? s.day_offset * 1440 + clock(s.arrival_time) - zero : null,
            departAt: s.departure_time ? s.day_offset * 1440 + clock(s.departure_time) - zero : null,
            km: s.distance_km,
          }));
      }

      // Fallback: If train_stops has < 2 points, use train source & destination stations
      if (
        stops.length < 2 &&
        row.trains.source?.latitude != null &&
        row.trains.destination?.latitude != null
      ) {
        const depClock = clock(row.departure_time);
        let arrClock = clock(row.arrival_time);
        if (arrClock <= depClock) arrClock += 1440;
        const runMins = arrClock - depClock;

        stops = [
          {
            stationId: row.trains.source.id,
            code: row.trains.source.station_code,
            name: row.trains.source.station_name,
            city: row.trains.source.city,
            lat: Number(row.trains.source.latitude),
            lng: Number(row.trains.source.longitude),
            arrival: null,
            departure: row.departure_time,
            arriveAt: 0,
            departAt: 0,
            km: 0,
          },
          {
            stationId: row.trains.destination.id,
            code: row.trains.destination.station_code,
            name: row.trains.destination.station_name,
            city: row.trains.destination.city,
            lat: Number(row.trains.destination.latitude),
            lng: Number(row.trains.destination.longitude),
            arrival: row.arrival_time,
            departure: null,
            arriveAt: runMins,
            departAt: runMins,
            km: 800,
          },
        ];
      }

      if (stops.length < 2) continue;

      const from = stops[0]!;
      const to = stops[stops.length - 1]!;
      const duration = to.arriveAt ?? 0;

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
        duration: duration > 0 ? duration : 480,
      });
    }

    return runs;
  } catch (err) {
    console.warn("Could not fetch live runs:", err);
    return [];
  }
}

export async function fetchGeoStations(): Promise<GeoStation[]> {
  try {
    const { data, error } = await supabase
      .from("stations")
      .select("id, station_code, station_name, city, latitude, longitude")
      .order("station_name");
    if (!error && data && data.length > 0) {
      const valid = ((data ?? []) as unknown as GeoStation[]).filter((s) => s.latitude != null);
      if (valid.length > 0) return valid;
    }
  } catch (err) {
    console.warn("Could not fetch geo stations from DB, using defaults:", err);
  }

  return SEED_STATIONS.map((s, idx) => ({
    id: `geo-s-${idx}`,
    station_code: s.station_code,
    station_name: s.station_name,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude,
  }));
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

