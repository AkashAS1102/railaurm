import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowRight, TrainFront } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  CLASSES,
  durationBetween,
  fetchBookingByPnr,
  formatTime,
  inr,
  prettyDate,
} from "@/lib/rail";

export const Route = createFileRoute("/_authenticated/ticket/$pnr")({
  component: TicketPage,
});

function TicketPage() {
  const { pnr } = Route.useParams();
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", pnr],
    queryFn: () => fetchBookingByPnr(pnr),
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel print:hidden">
        <SiteHeader variant="onDark" />
      </div>

      <section className="mx-auto max-w-3xl px-5 py-10">
        {isLoading && <div className="h-80 animate-pulse rounded-xl bg-muted" />}
        {!isLoading && !booking && (
          <div className="surface-card p-8 text-sm text-muted-foreground">
            We couldn't find a ticket with PNR {pnr}.{" "}
            <Link to="/bookings" className="underline decoration-gold underline-offset-4">
              View your trips
            </Link>
            .
          </div>
        )}

        {booking && (
          <>
            <div className="mb-6 flex items-center justify-between print:hidden">
              <div>
                <p className="eyebrow">Step 3 of 3</p>
                <h1 className="mt-1 text-4xl">Booking confirmed</h1>
              </div>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" /> Print
              </Button>
            </div>

            <article className="overflow-hidden rounded-3xl border border-border shadow-luxe">
              <div className="ink-panel flex items-start justify-between p-7">
                <div>
                  <div className="flex items-center gap-2 text-primary-foreground">
                    <TrainFront className="size-5 text-gold" />
                    <span className="font-display text-2xl">
                      Rail<span className="text-gold">Aurum</span>
                    </span>
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.22em] text-primary-foreground/60">
                    PNR
                  </p>
                  <p className="font-display text-4xl tracking-wider text-gold">
                    {booking.pnr_number}
                  </p>
                </div>
                <PseudoQr seed={booking.pnr_number} />
              </div>

              <div className="bg-card p-7">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p className="font-display text-4xl">
                      {formatTime(booking.schedules.departure_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.schedules.trains.source.station_name} (
                      {booking.schedules.trains.source.station_code})
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-xs text-muted-foreground">
                    {durationBetween(
                      booking.schedules.departure_time,
                      booking.schedules.arrival_time,
                    )}
                    <span className="my-1 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
                    <ArrowRight className="size-3.5 text-gold" />
                  </div>
                  <div className="text-right">
                    <p className="font-display text-4xl">
                      {formatTime(booking.schedules.arrival_time)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.schedules.trains.destination.station_name} (
                      {booking.schedules.trains.destination.station_code})
                    </p>
                  </div>
                </div>

                <div className="gold-rule my-6" />

                <div className="grid gap-5 sm:grid-cols-4">
                  <Fact label="Train" value={`${booking.schedules.trains.train_name}`} />
                  <Fact label="Number" value={`#${booking.schedules.trains.train_number}`} />
                  <Fact
                    label="Date"
                    value={prettyDate(booking.schedules.journey_date)}
                  />
                  <Fact
                    label="Class"
                    value={
                      CLASSES.find((c) => c.code === booking.schedules.travel_class)
                        ?.label ?? booking.schedules.travel_class
                    }
                  />
                </div>

                <div className="gold-rule my-6" />

                <p className="eyebrow mb-3">Passengers</p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Age</th>
                        <th className="px-4 py-2.5 font-medium">Gender</th>
                        <th className="px-4 py-2.5 font-medium">Seat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {booking.passengers.map((p) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3">{p.age}</td>
                          <td className="px-4 py-3">{p.gender}</td>
                          <td className="px-4 py-3 font-medium text-gold">
                            {p.seat_number}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="eyebrow">
                    {booking.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
                  </span>
                  <p className="font-display text-3xl">{inr(booking.total_amount)}</p>
                </div>
              </div>
            </article>

            <div className="mt-6 text-center print:hidden">
              <Link
                to="/bookings"
                className="text-sm text-muted-foreground underline decoration-gold underline-offset-4"
              >
                View all my trips
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function PseudoQr({ seed }: { seed: string }) {
  const cells = Array.from({ length: 100 }, (_, i) => {
    const c = seed.charCodeAt(i % seed.length);
    return (c * (i + 7)) % 3 !== 0;
  });
  return (
    <div
      aria-label="Scan code placeholder"
      className="grid size-24 grid-cols-10 gap-px rounded-lg bg-primary-foreground p-1.5"
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-ink" : "bg-transparent"} />
      ))}
    </div>
  );
}
