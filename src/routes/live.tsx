import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Gauge, MapPin, Search, TrainFront, X } from "lucide-react";
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

/* Equirectangular projection calibrated to the Survey of India national boundary */
const LNG_MIN = 67.5;
const LNG_MAX = 98.0;
const LAT_MIN = 7.0;
const LAT_MAX = 37.6;
const px = (lng: number) => 50 + ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 900;
const py = (lat: number) => 30 + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 940;

const OUTLINE_PATH =
  INDIA_BOUNDARY.map(([lng, lat], i) => `${i === 0 ? "M" : "L"}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`)
    .join(" ") + " Z";

type Positioned = { run: LiveRun; pos: RunPosition };

function LivePage() {
  const [now, setNow] = useState(() => new Date());
  const [boost, setBoost] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [stationId, setStationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

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

  const filteredActive = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (a) =>
        a.run.trainNumber.toLowerCase().includes(q) ||
        a.run.trainName.toLowerCase().includes(q) ||
        a.run.from.code.toLowerCase().includes(q) ||
        a.run.from.city.toLowerCase().includes(q) ||
        a.run.from.name.toLowerCase().includes(q) ||
        a.run.to.code.toLowerCase().includes(q) ||
        a.run.to.city.toLowerCase().includes(q) ||
        a.run.to.name.toLowerCase().includes(q),
    );
  }, [active, searchQuery]);

  const filteredAll = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const all = runs.data ?? [];
    if (!q) return all;
    return all.filter(
      (r) =>
        r.trainNumber.toLowerCase().includes(q) ||
        r.trainName.toLowerCase().includes(q) ||
        r.from.code.toLowerCase().includes(q) ||
        r.from.city.toLowerCase().includes(q) ||
        r.from.name.toLowerCase().includes(q) ||
        r.to.code.toLowerCase().includes(q) ||
        r.to.city.toLowerCase().includes(q) ||
        r.to.name.toLowerCase().includes(q),
    );
  }, [runs.data, searchQuery]);

  const board = useMemo(() => {
    if (!stationId) return null;
    const station = (stations.data ?? []).find((s) => s.id === stationId);
    if (!station) return null;
    const calls = (runs.data ?? [])
      .map((run) => {
        const stop = run.stops.find((s) => s.stationId === stationId || s.code === station.station_code);
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                  {active.length} trains en route ·{" "}
                  {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {stationId && (
                  <button
                    onClick={() => setStationId(null)}
                    className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-gold hover:bg-muted"
                  >
                    <span>Clear filter</span>
                    <X className="size-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={stationId ?? ""}
                  onChange={(e) => setStationId(e.target.value || null)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground outline-none transition-colors hover:border-gold focus:border-gold"
                >
                  <option value="">Inspect station board...</option>
                  {(stations.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.station_code} — {s.station_name} ({s.city})
                    </option>
                  ))}
                </select>

                <Button size="sm" variant={boost ? "default" : "outline"} onClick={() => setBoost((b) => !b)}>
                  <Gauge className="size-4" /> {boost ? "Fast-forward on" : "Fast-forward"}
                </Button>
              </div>
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
              {(runs.data ?? []).map((r) => {
                const isSelected = selected === r.scheduleId;
                const isStationMatch =
                  stationId &&
                  (r.from.stationId === stationId ||
                    r.to.stationId === stationId ||
                    r.stops.some((s) => s.stationId === stationId));

                return (
                  <polyline
                    key={`rt-${r.scheduleId}`}
                    points={r.stops.map((s) => `${px(s.lng).toFixed(1)},${py(s.lat).toFixed(1)}`).join(" ")}
                    fill="none"
                    className={
                      isSelected
                        ? "stroke-gold"
                        : isStationMatch
                          ? "stroke-gold/70"
                          : "stroke-primary/20"
                    }
                    strokeWidth={isSelected ? 3.5 : isStationMatch ? 2 : 1.2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}

              {(stations.data ?? []).map((s) => {
                const on = stationId === s.id;
                const isMajor = [
                  "NDLS", "CSMT", "BCT", "HWH", "MAS", "SBC", "HYB", "SC", "PUNE", "ADI",
                  "JP", "LKO", "CNB", "BSB", "PNBE", "GHY", "ERS", "TVC", "BPL", "NGP",
                  "JAT", "CDG", "RNC", "BBS", "VSKP", "SUR", "UBL", "MAO", "DBRG", "AGTL"
                ].includes(s.station_code);
                const showLabel = on || isMajor;

                return (
                  <g
                    key={s.id}
                    onClick={() => setStationId(on ? null : s.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <title>{`${s.station_name} (${s.station_code}) — ${s.city}`}</title>
                    <circle
                      cx={px(Number(s.longitude))}
                      cy={py(Number(s.latitude))}
                      r={on ? 12 : showLabel ? 6 : 3.5}
                      className={on ? "fill-gold/35 animate-ping" : "fill-transparent"}
                    />
                    <circle
                      cx={px(Number(s.longitude))}
                      cy={py(Number(s.latitude))}
                      r={on ? 6 : showLabel ? 4 : 2.5}
                      className={on ? "fill-gold" : showLabel ? "fill-gold/90" : "fill-primary/60"}
                    />
                    {showLabel && (
                      <text
                        x={px(Number(s.longitude)) + 7}
                        y={py(Number(s.latitude)) + 3.5}
                        className={on ? "fill-foreground font-bold" : "fill-muted-foreground font-medium"}
                        style={{ fontSize: on ? 13 : 10 }}
                      >
                        {s.station_code}
                      </text>
                    )}
                  </g>
                );
              })}

              {active.map(({ run, pos }) => {
                const x = px(pos.lng);
                const y = py(pos.lat);
                const on = selected === run.scheduleId;
                return (
                  <g
                    key={run.scheduleId}
                    onMouseEnter={() => setSelected(run.scheduleId)}
                    onMouseLeave={() => setSelected(null)}
                    onClick={() => setSelected(run.scheduleId)}
                    style={{ cursor: "pointer" }}
                  >
                    <title>{`${run.trainNumber} ${run.trainName} (${run.from.code} → ${run.to.code})`}</title>
                    <circle cx={x} cy={y} r={on ? 15 : 9} className="fill-gold/25" />
                    <circle cx={x} cy={y} r={on ? 7 : 5} className="fill-gold stroke-primary" strokeWidth={1.5} />
                    {on && (
                      <text x={x + 10} y={y - 8} className="fill-foreground font-semibold" style={{ fontSize: 13 }}>
                        {run.trainNumber} · {run.trainName}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {highlighted && (
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  #{highlighted.run.trainNumber} {highlighted.run.trainName}
                </span>{" "}
                —{" "}
                {highlighted.pos.atStation
                  ? `standing at ${highlighted.pos.lastStop.name}`
                  : `${highlighted.pos.lastStop.code} → ${highlighted.pos.nextStop.code}, due ${formatTime(
                      highlighted.pos.nextStop.arrival ?? highlighted.pos.nextStop.departure ?? "",
                    )}`}
              </p>
            )}
          </div>

          <div className="surface-card flex max-h-[660px] flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Network services</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {active.length} active / {runs.data?.length ?? 0} total
              </span>
            </div>

            {/* Search input */}
            <div className="relative mb-3 mt-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search train, station, or number..."
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-8 text-sm text-foreground outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Tab filter toggle */}
            <div className="mb-3 flex shrink-0 gap-1.5 rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "active"
                    ? "bg-card text-gold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Running Now ({filteredActive.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === "all"
                    ? "bg-card text-gold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Services ({filteredAll.length})
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {runs.isLoading ? (
                <p className="mt-4 text-sm text-muted-foreground">Loading the network…</p>
              ) : activeTab === "active" ? (
                filteredActive.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery
                      ? `No active trains match "${searchQuery}".`
                      : "No services are between stations at this minute. Try fast-forward."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredActive.map(({ run, pos }) => (
                      <LiveRow
                        key={run.scheduleId}
                        run={run}
                        pos={pos}
                        active={selected === run.scheduleId}
                        onHover={setSelected}
                      />
                    ))}
                  </ul>
                )
              ) : filteredAll.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {`No trains match "${searchQuery}".`}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredAll.map((run) => (
                    <AllTrainRow
                      key={run.scheduleId}
                      run={run}
                      active={selected === run.scheduleId}
                      onHover={setSelected}
                    />
                  ))}
                </ul>
              )}
            </div>
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

function AllTrainRow({
  run,
  active,
  onHover,
}: {
  run: LiveRun;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <li
      onMouseEnter={() => onHover(run.scheduleId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(run.scheduleId)}
      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
        active ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <TrainFront className="size-4 text-gold" /> {run.trainName}
        </span>
        <span className="font-mono text-xs font-semibold text-gold">#{run.trainNumber}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {run.from.code} ({formatTime(run.departure)}) → {run.to.code} ({formatTime(run.arrival)})
        </span>
        <span>{minutesToHm(run.duration)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-xs">
        <span className="text-muted-foreground">
          {inr(run.fare)} · {run.seats} seats
        </span>
        <Link
          to="/search"
          search={{
            from: run.from.stationId,
            to: run.to.stationId,
            date: todayISO(),
            cls: "SL",
          }}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-gold hover:underline"
        >
          Book route →
        </Link>
      </div>
    </li>
  );
}
