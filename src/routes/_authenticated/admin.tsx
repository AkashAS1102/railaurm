import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { inr, prettyDate, CLASSES } from "@/lib/rail";
import {
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

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel">
        <SiteHeader variant="onDark" />
        <div className="mx-auto w-full max-w-6xl px-5 pb-12">
          <p className="eyebrow text-gold">Control room</p>
          <h1 className="mt-2 font-display text-4xl text-primary-foreground">Admin panel</h1>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
            Add, edit and remove stations, trains, schedules and bookings, and decide who else
            gets admin access.
          </p>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {checking ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : !isAdmin ? (
          <div className="surface-card p-8 text-sm text-muted-foreground">
            This area is for administrators only. Sign in with the demo admin account to manage
            the network.
          </div>
        ) : (
          <Tabs defaultValue="stations">
            <TabsList className="flex-wrap">
              <TabsTrigger value="stations">Stations</TabsTrigger>
              <TabsTrigger value="trains">Trains</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="users">People</TabsTrigger>
            </TabsList>
            <TabsContent value="stations" className="mt-6"><StationsTab /></TabsContent>
            <TabsContent value="trains" className="mt-6"><TrainsTab /></TabsContent>
            <TabsContent value="schedules" className="mt-6"><SchedulesTab /></TabsContent>
            <TabsContent value="bookings" className="mt-6"><BookingsTab /></TabsContent>
            <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
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

function StationsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-stations"], queryFn: listStations });
  const [draft, setDraft] = useState<Partial<StationRow> | null>(null);

  const save = useMutation({
    mutationFn: saveStation,
    onSuccess: () => {
      toast.success("Station saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["stations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: deleteStation,
    onSuccess: () => {
      toast.success("Station removed");
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
    },
    onError: () => toast.error("This station is still used by a train, so it can't be removed."),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{data.length} stations</h2>
        <Button size="sm" onClick={() => setDraft({ ...BLANK_STATION })}>
          <Plus className="size-4" /> New station
        </Button>
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-5">
          <input className={field} placeholder="Code" value={draft.station_code ?? ""}
            onChange={(e) => setDraft({ ...draft, station_code: e.target.value })} />
          <input className={field} placeholder="Station name" value={draft.station_name ?? ""}
            onChange={(e) => setDraft({ ...draft, station_name: e.target.value })} />
          <input className={field} placeholder="City" value={draft.city ?? ""}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
          <input className={field} placeholder="Latitude" value={draft.latitude ?? ""}
            onChange={(e) => setDraft({ ...draft, latitude: e.target.value === "" ? null : Number(e.target.value) })} />
          <div className="flex gap-2">
            <input className={field} placeholder="Longitude" value={draft.longitude ?? ""}
              onChange={(e) => setDraft({ ...draft, longitude: e.target.value === "" ? null : Number(e.target.value) })} />
            <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {data.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <span className="font-medium">{s.station_code}</span> · {s.station_name}
                <span className="text-muted-foreground"> — {s.city}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={`Edit ${s.station_code}`} onClick={() => setDraft(s)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${s.station_code}`} onClick={() => remove.mutate(s.id)}>
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

/* ---------------- trains ---------------- */

function TrainsTab() {
  const qc = useQueryClient();
  const stations = useQuery({ queryKey: ["admin-stations"], queryFn: listStations });
  const trains = useQuery({ queryKey: ["admin-trains"], queryFn: listTrains });
  const [draft, setDraft] = useState<Partial<TrainRow> | null>(null);

  const byId = new Map((stations.data ?? []).map((s) => [s.id, s]));

  const save = useMutation({
    mutationFn: saveTrain,
    onSuccess: () => {
      toast.success("Train saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-trains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: deleteTrain,
    onSuccess: () => {
      toast.success("Train removed");
      qc.invalidateQueries({ queryKey: ["admin-trains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">{trains.data?.length ?? 0} trains</h2>
        <Button size="sm" onClick={() => setDraft({ total_seats: 900 })}>
          <Plus className="size-4" /> New train
        </Button>
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-6">
          <input className={field} placeholder="Number" value={draft.train_number ?? ""}
            onChange={(e) => setDraft({ ...draft, train_number: e.target.value })} />
          <input className={`${field} sm:col-span-2`} placeholder="Train name" value={draft.train_name ?? ""}
            onChange={(e) => setDraft({ ...draft, train_name: e.target.value })} />
          <select className={field} value={draft.source_station_id ?? ""}
            onChange={(e) => setDraft({ ...draft, source_station_id: e.target.value })}>
            <option value="">From…</option>
            {(stations.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.station_code} — {s.station_name}</option>
            ))}
          </select>
          <select className={field} value={draft.destination_station_id ?? ""}
            onChange={(e) => setDraft({ ...draft, destination_station_id: e.target.value })}>
            <option value="">To…</option>
            {(stations.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.station_code} — {s.station_name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input className={field} type="number" placeholder="Seats" value={draft.total_seats ?? 0}
              onChange={(e) => setDraft({ ...draft, total_seats: Number(e.target.value) })} />
            <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      <div className="surface-card divide-y divide-border overflow-hidden">
        {(trains.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div>
              <span className="font-medium">{t.train_number}</span> · {t.train_name}
              <span className="text-muted-foreground">
                {" "}— {byId.get(t.source_station_id)?.station_code ?? "?"} →{" "}
                {byId.get(t.destination_station_id)?.station_code ?? "?"} · {t.total_seats} seats
              </span>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" aria-label={`Edit ${t.train_number}`} onClick={() => setDraft(t)}>
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${t.train_number}`} onClick={() => remove.mutate(t.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
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
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      toast.success("Schedule removed");
      qc.invalidateQueries({ queryKey: ["admin-schedules", trainId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${field} max-w-sm`} value={trainId} onChange={(e) => setTrainId(e.target.value)}>
          <option value="">Choose a train…</option>
          {(trains.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.train_number} — {t.train_name}</option>
          ))}
        </select>
        <Button size="sm" disabled={!trainId}
          onClick={() => setDraft({ train_id: trainId, travel_class: "SL", journey_date: new Date().toISOString().slice(0, 10), departure_time: "08:00", arrival_time: "20:00", fare: 800, available_seats: 400 })}>
          <Plus className="size-4" /> New departure
        </Button>
      </div>

      {draft && (
        <div className="surface-card grid gap-3 p-4 sm:grid-cols-7">
          <input className={field} type="date" value={draft.journey_date ?? ""}
            onChange={(e) => setDraft({ ...draft, journey_date: e.target.value })} />
          <input className={field} type="time" value={(draft.departure_time ?? "").slice(0, 5)}
            onChange={(e) => setDraft({ ...draft, departure_time: e.target.value })} />
          <input className={field} type="time" value={(draft.arrival_time ?? "").slice(0, 5)}
            onChange={(e) => setDraft({ ...draft, arrival_time: e.target.value })} />
          <select className={field} value={draft.travel_class ?? "SL"}
            onChange={(e) => setDraft({ ...draft, travel_class: e.target.value })}>
            {CLASSES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input className={field} type="number" placeholder="Fare" value={draft.fare ?? 0}
            onChange={(e) => setDraft({ ...draft, fare: Number(e.target.value) })} />
          <input className={field} type="number" placeholder="Seats" value={draft.available_seats ?? 0}
            onChange={(e) => setDraft({ ...draft, available_seats: Number(e.target.value) })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => save.mutate({ ...draft, train_id: trainId })} disabled={save.isPending}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}><X className="size-4" /></Button>
          </div>
        </div>
      )}

      {trainId ? (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {(schedules.data ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                {prettyDate(s.journey_date)} · {s.departure_time.slice(0, 5)} →{" "}
                {s.arrival_time.slice(0, 5)}
                <span className="text-muted-foreground">
                  {" "}· {s.travel_class} · {inr(Number(s.fare))} · {s.available_seats} seats free
                </span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label="Edit departure" onClick={() => setDraft(s)}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" aria-label="Delete departure" onClick={() => remove.mutate(s.id)}>
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

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">No bookings have been made yet.</p>;

  return (
    <div className="surface-card divide-y divide-border overflow-hidden">
      {data.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
          <div>
            <span className="font-medium">PNR {b.pnr_number}</span>
            <span className="text-muted-foreground">
              {" "}· {b.schedules?.trains.train_number} {b.schedules?.trains.train_name} ·{" "}
              {b.schedules ? prettyDate(b.schedules.journey_date) : ""} · {b.passengers.length}{" "}
              passenger(s) · {inr(Number(b.total_amount))}
            </span>
            <span className={b.status === "CANCELLED" ? "ml-2 text-destructive" : "ml-2 text-gold"}>
              {b.status}
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              onClick={() => status.mutate({ id: b.id, next: b.status === "CANCELLED" ? "CONFIRMED" : "CANCELLED" })}>
              {b.status === "CANCELLED" ? "Restore" : "Cancel"}
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Delete booking ${b.pnr_number}`} onClick={() => remove.mutate(b.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- users ---------------- */

function UsersTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: listUsers });

  const role = useMutation({
    mutationFn: ({ id, grant }: { id: string; grant: boolean }) => setAdmin(id, grant),
    onSuccess: () => {
      toast.success("Access updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="surface-card divide-y divide-border overflow-hidden">
      {data.map((u) => (
        <div key={u.id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <div>
            <span className="font-medium">{u.name || "Traveller"}</span>
            <span className="text-muted-foreground"> · {u.email}</span>
            {u.isAdmin && (
              <span className="ml-2 inline-flex items-center gap-1 text-gold">
                <ShieldCheck className="size-4" /> admin
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => role.mutate({ id: u.id, grant: !u.isAdmin })}>
            {u.isAdmin ? "Remove admin" : "Make admin"}
          </Button>
        </div>
      ))}
    </div>
  );
}
