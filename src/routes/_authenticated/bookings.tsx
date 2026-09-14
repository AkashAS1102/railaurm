import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, TrainFront } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  cancelBooking,
  fetchMyBookings,
  formatTime,
  inr,
  prettyDate,
} from "@/lib/rail";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
});

function BookingsPage() {
  const queryClient = useQueryClient();
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
  });

  const cancel = useMutation({
    mutationFn: cancelBooking,
    onSuccess: (ok) => {
      if (ok) {
        toast.success("Booking cancelled and seats released.");
        queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      } else {
        toast.error("This booking could not be cancelled.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel">
        <SiteHeader variant="onDark" />
        <div className="mx-auto max-w-5xl px-5 pb-10">
          <p className="eyebrow text-gold">Your account</p>
          <h1 className="mt-2 text-4xl text-primary-foreground">My trips</h1>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-5 py-10">
        {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted" />}

        {!isLoading && bookings?.length === 0 && (
          <div className="surface-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You haven't booked a journey yet.
            </p>
            <Link to="/">
              <Button className="mt-5 rounded-xl bg-gold text-accent-foreground hover:bg-gold/90">
                Search trains
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {bookings?.map((b) => (
            <article key={b.id} className="surface-card surface-card-hover p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrainFront className="size-4 text-gold" />
                    <span className="font-medium">{b.schedules.trains.train_name}</span>
                    <span className="text-muted-foreground">
                      #{b.schedules.trains.train_number}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="font-display text-2xl">
                      {formatTime(b.schedules.departure_time)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.schedules.trains.source.station_code}
                    </span>
                    <ArrowRight className="size-4 text-gold" />
                    <span className="font-display text-2xl">
                      {formatTime(b.schedules.arrival_time)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.schedules.trains.destination.station_code}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {prettyDate(b.schedules.journey_date)} · PNR {b.pnr_number} ·{" "}
                    {b.passengers.length} passenger(s)
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      b.status === "CONFIRMED"
                        ? "bg-gold-soft text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.status}
                  </span>
                  <p className="font-display text-2xl">{inr(b.total_amount)}</p>
                  <div className="flex gap-2">
                    <Link to="/ticket/$pnr" params={{ pnr: b.pnr_number }}>
                      <Button size="sm" variant="outline">
                        View e-ticket
                      </Button>
                    </Link>
                    {b.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(b.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
