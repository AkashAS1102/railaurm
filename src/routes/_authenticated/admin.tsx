import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { inr, prettyDate, CLASSES } from "@/lib/rail";
import {
  addAdminByEmail,
  deleteBooking,
  deleteSchedule,
  deleteStation,
  deleteTrain,
  listBookings,
  listSchedules,
  listStations,
  listTrains,
  listUsers,
  saveSchedule,
  saveStation,
  saveTrain,
  seedNetworkData,
  setAdmin,
  setBookingStatus,
  type ScheduleRow,
  type StationRow,
  type TrainRow,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

const field =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30";

function AdminPage() {
  const { isAdmin, checking } = useIsAdmin();
  const qc = useQueryClient();

  const seed = useMutation({
    mutationFn: () =>
      seedNetworkData((msg) => {
        toast.info(msg);
      }),
    onSuccess: (res) => {
      toast.success(
        `Successfully seeded ${res.stationsCount} stations & ${res.trainsCount} trains!`,
      );
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["admin-trains"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
      qc.invalidateQueries({ queryKey: ["geo-stations"] });
      qc.invalidateQueries({ queryKey: ["live-runs"] });
    },
    onError: (e: Error) => toast.error(`Seeding failed: ${e.message}`),
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel">
        <SiteHeader variant="onDark" />
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-5 pb-12">
          <div>
            <p className="eyebrow text-gold">Control room</p>
            <h1 className="mt-2 font-display text-4xl text-primary-foreground">Admin panel</h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
              Manage stations, trains, schedules and bookings, and grant admin roles to team members.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              disabled={seed.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Seed 100 Indian stations and 50 trains with timetable and schedules into the database?",
                  )
                ) {
                  seed.mutate();
                }
              }}
              className="border-gold/50 text-gold hover:bg-gold hover:text-accent-foreground"
            >
              <Sparkles className="mr-1.5 size-4" />
              {seed.isPending ? "Seeding..." : "Seed 100 Stations & 50 Trains"}
            </Button>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {checking ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : !isAdmin ? (
          <div className="surface-card p-8 text-sm text-muted-foreground">
            This area is for administrators only. Sign in with an admin account to manage the network.
          </div>
        ) : (
          <Tabs defaultValue="stations">
            <TabsList className="flex-wrap">
              <TabsTrigger value="stations">Stations</TabsTrigger>
              <TabsTrigger value="trains">Trains</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="users">People & Admins</TabsTrigger>
            </TabsList>
            <TabsContent value="stations" className="mt-6">
              <StationsTab onSeed={() => seed.mutate()} isSeeding={seed.isPending} />
            </TabsContent>
            <TabsContent value="trains" className="mt-6">
              <TrainsTab onSeed={() => seed.mutate()} isSeeding={seed.isPending} />
            </TabsContent>
            <TabsContent value="schedules" className="mt-6">
              <SchedulesTab />
            </TabsContent>
            <TabsContent value="bookings" className="mt-6">
              <BookingsTab />
            </TabsContent>
            <TabsContent value="users" className="mt-6">
              <UsersTab />
            </TabsContent>
          </Tabs>
        )}
      </section>
    </main>
  );
}

/* ---------------- stations ---------------- */

const BLANK_STATION: Partial<StationRow> = {
  station_code: "",
  station_name: "",
  city: "",
  latitude: null,
  longitude: null,
};

function StationsTab({ onSeed, isSeeding }: { onSeed: () => void; isSeeding: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-stations"], queryFn: listStations });
  const [draft, setDraft] = useState<Partial<StationRow> | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) =>
        s.station_code.toLowerCase().includes(q) ||
        s.station_name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedStations = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const save = useMutation({
    mutationFn: saveStation,
    onSuccess: () => {
      toast.success("Station saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
      qc.invalidateQueries({ queryKey: ["geo-stations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteStation,
    onSuccess: () => {
      toast.success("Station removed");
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
      qc.invalidateQueries({ queryKey: ["geo-stations"] });
    },
    onError: () => toast.error("This station is still used by a train, so it can't be removed."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">{data.length} stations</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length !== data.length
              ? `Showing ${filtered.length} of ${data.length} stations`
              : "Complete railway station directory"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setDraft({ ...BLANK_STATION })}>
            <Plus className="mr-1.5 size-4" /> New station
          </Button>
        </div>
      </div>

      {data.length === 0 && !isLoading && (
        <div className="surface-card space-y-3 border-2 border-dashed border-gold/40 p-8 text-center">
          <Database className="mx-auto size-10 text-gold" />
          <h3 className="font-display text-xl">0 stations in database</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Your database currently has no station records. Click below to automatically seed 100
            verified Indian railway stations with latitude/longitude coordinates and 50 flagship trains.
          </p>
          <Button onClick={onSeed} disabled={isSeeding} className="bg-gold text-accent-foreground">
            <Sparkles className="mr-1.5 size-4" />
            {isSeeding ? "Seeding network..." : "Seed 100 Stations & 50 Trains Now"}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${field} pl-9`}
            placeholder="Search stations by code (e.g. NDLS), name, or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {search && (
          <Button size="sm" variant="ghost" onClick={() => setSearch("")}>
            Clear
          </Button>
        )}
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-5">
          <input
            className={field}
            placeholder="Code (e.g. NDLS)"
            value={draft.station_code ?? ""}
            onChange={(e) => setDraft({ ...draft, station_code: e.target.value.toUpperCase() })}
          />
          <input
            className={field}
            placeholder="Station name"
            value={draft.station_name ?? ""}
            onChange={(e) => setDraft({ ...draft, station_name: e.target.value })}
          />
          <input
            className={field}
            placeholder="City"
            value={draft.city ?? ""}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          />
          <input
            className={field}
            placeholder="Latitude (e.g. 28.6425)"
            value={draft.latitude ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                latitude: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <div className="flex gap-2">
            <input
              className={field}
              placeholder="Longitude (e.g. 77.2192)"
              value={draft.longitude ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  longitude: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {pagedStations.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <span className="font-semibold text-gold">{s.station_code}</span> ·{" "}
                <span className="font-medium text-foreground">{s.station_name}</span>
                <span className="text-muted-foreground"> — {s.city}</span>
                {s.latitude && s.longitude && (
                  <span className="ml-2 text-xs text-muted-foreground/70">
                    ({s.latitude.toFixed(2)}°N, {s.longitude.toFixed(2)}°E)
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${s.station_code}`}
                  onClick={() => setDraft(s)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${s.station_code}`}
                  onClick={() => {
                    if (window.confirm(`Delete station ${s.station_code} (${s.station_name})?`)) {
                      remove.mutate(s.id);
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {pagedStations.length === 0 && data.length > 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No stations match &ldquo;{search}&rdquo;.
            </p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- trains ---------------- */

function TrainsTab({ onSeed, isSeeding }: { onSeed: () => void; isSeeding: boolean }) {
  const qc = useQueryClient();
  const stations = useQuery({ queryKey: ["admin-stations"], queryFn: listStations });
  const trains = useQuery({ queryKey: ["admin-trains"], queryFn: listTrains });
  const [draft, setDraft] = useState<Partial<TrainRow> | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const byId = useMemo(
    () => new Map((stations.data ?? []).map((s) => [s.id, s])),
    [stations.data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const data = trains.data ?? [];
    if (!q) return data;
    return data.filter((t) => {
      const src = byId.get(t.source_station_id)?.station_code?.toLowerCase() ?? "";
      const dst = byId.get(t.destination_station_id)?.station_code?.toLowerCase() ?? "";
      return (
        t.train_number.toLowerCase().includes(q) ||
        t.train_name.toLowerCase().includes(q) ||
        src.includes(q) ||
        dst.includes(q)
      );
    });
  }, [trains.data, search, byId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTrains = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const save = useMutation({
    mutationFn: saveTrain,
    onSuccess: () => {
      toast.success("Train saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-trains"] });
      qc.invalidateQueries({ queryKey: ["live-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteTrain,
    onSuccess: () => {
      toast.success("Train removed");
      qc.invalidateQueries({ queryKey: ["admin-trains"] });
      qc.invalidateQueries({ queryKey: ["live-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">{trains.data?.length ?? 0} trains</h2>
          <p className="text-xs text-muted-foreground">
            {filtered.length !== (trains.data?.length ?? 0)
              ? `Showing ${filtered.length} of ${trains.data?.length ?? 0} trains`
              : "Fleet overview across Indian network"}
          </p>
        </div>
        <Button size="sm" onClick={() => setDraft({ total_seats: 900 })}>
          <Plus className="mr-1.5 size-4" /> New train
        </Button>
      </div>

      {(trains.data?.length ?? 0) === 0 && !trains.isLoading && (
        <div className="surface-card space-y-3 border-2 border-dashed border-gold/40 p-8 text-center">
          <Database className="mx-auto size-10 text-gold" />
          <h3 className="font-display text-xl">0 trains in database</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Populate 50 iconic trains (Vande Bharat, Rajdhani, Shatabdi, Duronto, Karnataka Express)
            with complete timetables and departure schedules in one click.
          </p>
          <Button onClick={onSeed} disabled={isSeeding} className="bg-gold text-accent-foreground">
            <Sparkles className="mr-1.5 size-4" />
            {isSeeding ? "Seeding network..." : "Seed 100 Stations & 50 Trains"}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${field} pl-9`}
            placeholder="Search trains by number (e.g. 22436), name (e.g. Vande Bharat), or station..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {search && (
          <Button size="sm" variant="ghost" onClick={() => setSearch("")}>
            Clear
          </Button>
        )}
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-6">
          <input
            className={field}
            placeholder="Number (e.g. 22436)"
            value={draft.train_number ?? ""}
            onChange={(e) => setDraft({ ...draft, train_number: e.target.value })}
          />
          <input
            className={`${field} sm:col-span-2`}
            placeholder="Train name"
            value={draft.train_name ?? ""}
            onChange={(e) => setDraft({ ...draft, train_name: e.target.value })}
          />
          <select
            className={field}
            value={draft.source_station_id ?? ""}
            onChange={(e) => setDraft({ ...draft, source_station_id: e.target.value })}
          >
            <option value="">From…</option>
            {(stations.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.station_code} — {s.station_name}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={draft.destination_station_id ?? ""}
            onChange={(e) => setDraft({ ...draft, destination_station_id: e.target.value })}
          >
            <option value="">To…</option>
            {(stations.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.station_code} — {s.station_name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className={field}
              type="number"
              placeholder="Seats"
              value={draft.total_seats ?? 0}
              onChange={(e) => setDraft({ ...draft, total_seats: Number(e.target.value) })}
            />
            <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="surface-card divide-y divide-border overflow-hidden">
        {pagedTrains.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div>
              <span className="font-semibold text-gold">#{t.train_number}</span> ·{" "}
              <span className="font-medium text-foreground">{t.train_name}</span>
              <span className="text-muted-foreground">
                {" "}
                — {byId.get(t.source_station_id)?.station_code ?? "?"} →{" "}
                {byId.get(t.destination_station_id)?.station_code ?? "?"} · {t.total_seats} seats
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Edit ${t.train_number}`}
                onClick={() => setDraft(t)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${t.train_number}`}
                onClick={() => {
                  if (window.confirm(`Delete train #${t.train_number} (${t.train_name})?`)) {
                    remove.mutate(t.id);
                  }
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {pagedTrains.length === 0 && (trains.data?.length ?? 0) > 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No trains match &ldquo;{search}&rdquo;.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- schedules ---------------- */

function SchedulesTab() {
  const qc = useQueryClient();
  const trains = useQuery({ queryKey: ["admin-trains"], queryFn: listTrains });
  const [trainId, setTrainId] = useState("");
  const [draft, setDraft] = useState<Partial<ScheduleRow> | null>(null);

  const schedules = useQuery({
    queryKey: ["admin-schedules", trainId],
    queryFn: () => listSchedules(trainId),
    enabled: Boolean(trainId),
  });

  const save = useMutation({
    mutationFn: saveSchedule,
    onSuccess: () => {
      toast.success("Schedule saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-schedules", trainId] });
      qc.invalidateQueries({ queryKey: ["live-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      toast.success("Schedule removed");
      qc.invalidateQueries({ queryKey: ["admin-schedules", trainId] });
      qc.invalidateQueries({ queryKey: ["live-runs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={`${field} max-w-sm`}
          value={trainId}
          onChange={(e) => setTrainId(e.target.value)}
        >
          <option value="">Choose a train…</option>
          {(trains.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.train_number} — {t.train_name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          disabled={!trainId}
          onClick={() =>
            setDraft({
              train_id: trainId,
              travel_class: "SL",
              journey_date: new Date().toISOString().slice(0, 10),
              departure_time: "08:00",
              arrival_time: "20:00",
              fare: 800,
              available_seats: 400,
            })
          }
        >
          <Plus className="mr-1.5 size-4" /> New departure
        </Button>
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-7">
          <input
            className={field}
            type="date"
            value={draft.journey_date ?? ""}
            onChange={(e) => setDraft({ ...draft, journey_date: e.target.value })}
          />
          <input
            className={field}
            type="time"
            value={(draft.departure_time ?? "").slice(0, 5)}
            onChange={(e) => setDraft({ ...draft, departure_time: e.target.value })}
          />
          <input
            className={field}
            type="time"
            value={(draft.arrival_time ?? "").slice(0, 5)}
            onChange={(e) => setDraft({ ...draft, arrival_time: e.target.value })}
          />
          <select
            className={field}
            value={draft.travel_class ?? "SL"}
            onChange={(e) => setDraft({ ...draft, travel_class: e.target.value })}
          >
            {CLASSES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </select>
          <input
            className={field}
            type="number"
            placeholder="Fare (₹)"
            value={draft.fare ?? 0}
            onChange={(e) => setDraft({ ...draft, fare: Number(e.target.value) })}
          />
          <input
            className={field}
            type="number"
            placeholder="Seats"
            value={draft.available_seats ?? 0}
            onChange={(e) => setDraft({ ...draft, available_seats: Number(e.target.value) })}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => save.mutate({ ...draft, train_id: trainId })}
              disabled={save.isPending}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {trainId ? (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {(schedules.data ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <span className="font-semibold text-gold">{prettyDate(s.journey_date)}</span> ·{" "}
                {s.departure_time.slice(0, 5)} → {s.arrival_time.slice(0, 5)}
                <span className="text-muted-foreground">
                  {" "}
                  · <span className="font-medium text-foreground">{s.travel_class}</span> ·{" "}
                  {inr(Number(s.fare))} · {s.available_seats} seats free
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit departure"
                  onClick={() => setDraft(s)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete departure"
                  onClick={() => remove.mutate(s.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {schedules.data?.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No departures for this train yet.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick a train to see and edit its departures.</p>
      )}
    </div>
  );
}

/* ---------------- bookings ---------------- */

function BookingsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-bookings"], queryFn: listBookings });
  const [search, setSearch] = useState("");

  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: string }) => setBookingStatus(id, next),
    onSuccess: () => {
      toast.success("Booking updated");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      toast.success("Booking deleted");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (b) =>
        b.pnr_number.toLowerCase().includes(q) ||
        b.schedules?.trains.train_name.toLowerCase().includes(q) ||
        b.schedules?.trains.train_number.toLowerCase().includes(q) ||
        b.passengers.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [data, search]);

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{data.length} bookings</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${field} pl-9`}
          placeholder="Search bookings by PNR, passenger name, or train..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          {data.length === 0 ? "No bookings have been made yet." : "No bookings match your search."}
        </p>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div>
                <span className="font-semibold text-gold">PNR {b.pnr_number}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {b.schedules?.trains.train_number} {b.schedules?.trains.train_name} ·{" "}
                  {b.schedules ? prettyDate(b.schedules.journey_date) : ""} · {b.passengers.length}{" "}
                  passenger(s) · {inr(Number(b.total_amount))}
                </span>
                <span
                  className={`ml-2 inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    b.status === "CANCELLED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-gold/10 text-gold"
                  }`}
                >
                  {b.status}
                </span>
                {b.passengers.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Passengers: {b.passengers.map((p) => `${p.name} (${p.seat_number})`).join(", ")}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    status.mutate({
                      id: b.id,
                      next: b.status === "CANCELLED" ? "CONFIRMED" : "CANCELLED",
                    })
                  }
                >
                  {b.status === "CANCELLED" ? "Restore" : "Cancel"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete booking ${b.pnr_number}`}
                  onClick={() => {
                    if (window.confirm(`Permanently delete booking PNR ${b.pnr_number}?`)) {
                      remove.mutate(b.id);
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- people & admins ---------------- */

function UsersTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: listUsers });
  const [emailInput, setEmailInput] = useState("");
  const [search, setSearch] = useState("");

  const addAdmin = useMutation({
    mutationFn: (email: string) => addAdminByEmail(email),
    onSuccess: (res) => {
      toast.success(res.message);
      setEmailInput("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRole = useMutation({
    mutationFn: ({ id, grant }: { id: string; grant: boolean }) => setAdmin(id, grant),
    onSuccess: () => {
      toast.success("User role updated successfully");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)),
    );
  }, [data, search]);

  const adminCount = data.filter((u) => u.isAdmin).length;

  return (
    <div className="space-y-6">
      {/* Add Administrator Panel */}
      <div className="surface-card space-y-3 p-5">
        <div className="flex items-center gap-2 font-display text-lg">
          <ShieldPlus className="size-5 text-gold" /> Add person as administrator
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the registered email of any user to grant them full administrator control over stations,
          trains, schedules, bookings, and other team members.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailInput.trim()) {
              addAdmin.mutate(emailInput.trim());
            }
          }}
          className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
        >
          <input
            type="email"
            placeholder="colleague@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className={field}
            required
          />
          <Button
            type="submit"
            disabled={addAdmin.isPending || !emailInput.trim()}
            className="shrink-0 bg-gold text-accent-foreground hover:bg-gold/90"
          >
            <ShieldPlus className="mr-1.5 size-4" />
            {addAdmin.isPending ? "Granting..." : "Grant Admin Access"}
          </Button>
        </form>
      </div>

      {/* Directory & Management */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">People directory ({data.length})</h2>
            <p className="text-xs text-muted-foreground">
              {adminCount} administrator{adminCount === 1 ? "" : "s"} ·{" "}
              {data.length - adminCount} customer account{data.length - adminCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${field} pl-9`}
            placeholder="Filter people by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : filtered.length === 0 ? (
          <p className="surface-card p-6 text-center text-sm text-muted-foreground">
            {data.length === 0
              ? "No registered users in the database yet."
              : `No users match "${search}".`}
          </p>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{u.name || "Traveller"}</span>
                    {u.isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                        <ShieldCheck className="size-3.5" /> admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        customer
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {u.email} {u.phone ? `· ${u.phone}` : ""}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={u.isAdmin ? "outline" : "default"}
                  disabled={toggleRole.isPending}
                  className={!u.isAdmin ? "bg-gold text-accent-foreground hover:bg-gold/90" : ""}
                  onClick={() => {
                    const action = u.isAdmin ? "revoke admin access from" : "grant admin access to";
                    if (window.confirm(`Are you sure you want to ${action} ${u.email}?`)) {
                      toggleRole.mutate({ id: u.id, grant: !u.isAdmin });
                    }
                  }}
                >
                  {u.isAdmin ? "Remove admin" : "Make admin"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
