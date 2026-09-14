import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Gauge, MapPin, TrainFront, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  fetchGeoStations,
  fetchLiveRuns,
  formatTime,
  inr,
  minutesToHm,
  runPosition,
  todayISO,
  type LiveRun,
  type RunPosition,
} from "@/lib/rail";

export const Route = createFileRoute("/live")({
  component: LivePage,
});

import { INDIA_BOUNDARY } from "@/lib/indiaOutline";

/* Equirectangular projection tuned accurately to the Indian subcontinent. */
const LNG_MIN = 68.0;
const LNG_MAX = 97.5;
const LAT_MIN = 7.5;
const LAT_MAX = 36.5;
const W = 1000;
const H = 1000;
const px = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
const py = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;

const OUTLINE_PATH =
  INDIA_BOUNDARY.map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`)
    .join(" ") + " Z";

type Positioned = { run: LiveRun; pos: RunPosition };

function LivePage() {
  const [now, setNow] = useState(() => new Date());
  const [boost, setBoost] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(
      () => setNow((prev) => new Date(prev.getTime() + (boost ? 4 * 60_000 : 1000))),
      1000,
    );
    return () => window.clearInterval(id);
  }, [boost]);

  const stations = useQuery({ queryKey: ["geo-stations"], queryFn: fetchGeoStations });
  const runs = useQuery({ queryKey: ["live-runs"], queryFn: fetchLiveRuns });

  const active = useMemo<Positioned[]>(() => {
    const out: Positioned[] = [];
    for (const run of runs.data ?? []) {
      const pos = runPosition(run, now);
      if (pos) out.push({ run, pos });
    }
    return out.sort((a, b) => b.pos.progress - a.pos.progress);
  }, [runs.data, now]);

  const board = useMemo(() => {
    if (!stationId) return null;
    const station = (stations.data ?? []).find((s) => s.id === stationId);
    if (!station) return null;
    const calls = (runs.data ?? [])
      .map((run) => {
        const stop = run.stops.find((s) => s.stationId === stationId);
        return stop ? { run, stop } : null;
      })
      .filter((x): x is { run: LiveRun; stop: LiveRun["stops"][number] } => x !== null)
      .sort((a, b) =>
        (a.stop.departure ?? a.stop.arrival ?? "").localeCompare(
          b.stop.departure ?? b.stop.arrival ?? "",
        ),
      );
    return { station, calls };
  }, [stationId, stations.data, runs.data]);

  const highlighted = active.find((a) => a.run.scheduleId === selected);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary pb-16">
        <SiteHeader variant="onDark" />
        <div className="mx-auto w-full max-w-6xl px-5">
          <p className="eyebrow text-gold">Network control</p>
          <h1 className="mt-2 font-display text-4xl text-primary-foreground sm:text-5xl">
            Live train map
          </h1>
          <p className="mt-3 max-w-xl text-sm text-primary-foreground/70">
            Every service running right now, placed along its published stop-by-stop timetable —
            the same timings you book against.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-10 w-full max-w-6xl px-5 pb-20">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="surface-card overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {active.length} trains en route ·{" "}
                {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Button size="sm" variant={boost ? "default" : "outline"} onClick={() => setBoost((b) => !b)}>
                <Gauge className="size-4" /> {boost ? "Fast-forward on" : "Fast-forward"}
              </Button>
            </div>

            <svg
              viewBox="0 0 1000 1000"
              className="w-full rounded-xl bg-[oklch(0.98_0.01_250)]"
              role="img"
              aria-label="Map of India showing live train positions along their routes"
            >
              <defs>
                <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.95 0.02 250)" />
                  <stop offset="100%" stopColor="oklch(0.92 0.03 250)" />
                </linearGradient>
              </defs>

              <path d={OUTLINE_PATH} fill="url(#land)" className="stroke-primary/25" strokeWidth={2.5}
                strokeLinejoin="round" />

              {/* every route drawn stop-to-stop */}
              {(runs.data ?? []).map((r) => (
                <polyline
                  key={`rt-${r.scheduleId}`}
                  points={r.stops.map((s) => `${px(s.lng).toFixed(1)},${py(s.lat).toFixed(1)}`).join(" ")}
                  fill="none"
                  className={
                    selected === r.scheduleId ? "stroke-gold" : "stroke-primary/10"
                  }
                  strokeWidth={selected === r.scheduleId ? 3.5 : 1.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {(stations.data ?? []).map((s) => {
                const on = stationId === s.id;
                return (
                  <g key={s.id} onClick={() => setStationId(on ? null : s.id)} style={{ cursor: "pointer" }}>
                    <circle cx={px(Number(s.longitude))} cy={py(Number(s.latitude))} r={on ? 13 : 8}
                      className={on ? "fill-gold/35" : "fill-transparent"} />
                    <circle cx={px(Number(s.longitude))} cy={py(Number(s.latitude))} r={on ? 7 : 4}
                      className={on ? "fill-gold" : "fill-primary/70"} />
                    <text x={px(Number(s.longitude)) + 9} y={py(Number(s.latitude)) + 4}
                      className={on ? "fill-foreground font-semibold" : "fill-muted-foreground"}
                      style={{ fontSize: 14 }}>
                      {s.station_code}
                    </text>
                  </g>
                );
              })}

              {active.map(({ run, pos }) => {
                const x = px(pos.lng);
                const y = py(pos.lat);
                const on = selected === run.scheduleId;
                return (
                  <g key={run.scheduleId}
                    onMouseEnter={() => setSelected(run.scheduleId)}
                    onMouseLeave={() => setSelected(null)}
                    style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={on ? 15 : 9} className="fill-gold/25" />
                    <circle cx={x} cy={y} r={on ? 7 : 5} className="fill-gold stroke-primary" strokeWidth={1.5} />
                    {on && (
                      <text x={x + 14} y={y - 9} className="fill-foreground" style={{ fontSize: 18 }}>
                        {run.trainNumber}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {highlighted && (
              <p className="mt-3 text-xs text-muted-foreground">
                {highlighted.run.trainNumber} {highlighted.run.trainName} —{" "}
                {highlighted.pos.atStation
                  ? `standing at ${highlighted.pos.lastStop.name}`
                  : `${highlighted.pos.lastStop.code} → ${highlighted.pos.nextStop.code}, due ${formatTime(
                      highlighted.pos.nextStop.arrival ?? highlighted.pos.nextStop.departure ?? "",
                    )}`}
              </p>
            )}
          </div>

          <div className="surface-card max-h-[640px] overflow-y-auto p-4">
            <h2 className="font-display text-2xl">Running now</h2>
            {runs.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading the network…</p>
            ) : active.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No services are between stations at this minute. Try fast-forward.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {active.map(({ run, pos }) => (
                  <LiveRow key={run.scheduleId} run={run} pos={pos}
                    active={selected === run.scheduleId} onHover={setSelected} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {board ? (
          <div className="surface-card mt-5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-gold">Station board</p>
                <h2 className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl">
                  <MapPin className="size-5 text-gold" />
                  {board.station.station_name}
                  <span className="text-base text-muted-foreground">
                    {board.station.station_code} · {board.station.city}
                  </span>
                </h2>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStationId(null)}>
                <X className="size-4" /> Close
              </Button>
            </div>

            {board.calls.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No trains call at this station today.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2">Train</th>
                      <th className="py-2">Arrives</th>
                      <th className="py-2">Departs</th>
                      <th className="py-2">Runs</th>
                      <th className="py-2">Fare · seats</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {board.calls.map(({ run, stop }) => (
                      <tr key={`${run.scheduleId}-${stop.stationId}`}>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <TrainFront className="size-4 text-gold" />
                            <span className="font-medium">{run.trainName}</span>
                            <span className="text-xs text-muted-foreground">#{run.trainNumber}</span>
                          </span>
                        </td>
                        <td className="py-2">{stop.arrival ? formatTime(stop.arrival) : "—"}</td>
                        <td className="py-2">{stop.departure ? formatTime(stop.departure) : "—"}</td>
                        <td className="py-2 text-muted-foreground">
                          {run.from.code} → {run.to.code}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {inr(run.fare)} · {run.seats}
                        </td>
                        <td className="py-2 text-right">
                          {stop.stationId !== run.to.stationId && (
                            <Link
                              to="/search"
                              search={{
                                from: run.from.stationId,
                                to: run.to.stationId,
                                date: todayISO(),
                                cls: "SL",
                              }}
                              className="text-xs font-medium text-gold hover:underline"
                            >
                              Book this route →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Tip: click any station dot on the map to see every train calling there today.
          </p>
        )}
      </div>
    </div>
  );
}

function LiveRow({
  run,
  pos,
  active,
  onHover,
}: {
  run: LiveRun;
  pos: RunPosition;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <li
      onMouseEnter={() => onHover(run.scheduleId)}
      onMouseLeave={() => onHover(null)}
      className={`rounded-xl border p-3 transition-colors ${
        active ? "border-gold bg-gold/10" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <TrainFront className="size-4 text-gold" /> {run.trainName}
        </span>
        <span className="text-xs text-muted-foreground">#{run.trainNumber}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {run.from.code} {formatTime(run.departure)} → {run.to.code} {formatTime(run.arrival)} ·{" "}
        {inr(run.fare)} · {run.seats} seats
      </div>
      <div className="mt-1 text-xs">
        {pos.atStation ? (
          <span className="text-gold">Standing at {pos.lastStop.name}</span>
        ) : (
          <span className="text-muted-foreground">
            Next stop {pos.nextStop.name} ·{" "}
            {minutesToHm((pos.nextStop.arriveAt ?? pos.nextStop.departAt ?? 0) - pos.elapsed)} away
          </span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(pos.progress * 100)}%` }} />
      </div>
    </li>
  );
}
