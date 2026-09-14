import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, TrainFront, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchWidget } from "@/components/SearchWidget";
import { Button } from "@/components/ui/button";
import {
  CLASSES,
  durationBetween,
  formatTime,
  inr,
  prettyDate,
  searchSchedules,
  todayISO,
} from "@/lib/rail";

type SearchParams = { from: string; to: string; date: string; cls: string };

export const Route = createFileRoute("/search")({
  validateSearch: (raw: Record<string, unknown>): SearchParams => ({
    from: String(raw['from'] ?? ""),
    to: String(raw['to'] ?? ""),
    date: String(raw['date'] ?? todayISO()),
    cls: String(raw['cls'] ?? "SL"),
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const enabled = Boolean(search.from && search.to && search.date);

  const { data, isLoading, error } = useQuery({
    queryKey: ["schedules", search],
    queryFn: () => searchSchedules(search),
    enabled,
  });

  const className =
    CLASSES.find((c) => c.code === search.cls)?.label ?? search.cls;

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel">
        <SiteHeader variant="onDark" />
        <div className="mx-auto max-w-6xl px-5 pb-10">
          <p className="eyebrow text-gold">Available trains</p>
          <h1 className="mt-2 text-4xl text-primary-foreground">
            {prettyDate(search.date)} · {className}
          </h1>
          <div className="mt-6">
            <SearchWidget initial={search} />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {!enabled && (
          <EmptyState text="Choose a departure and arrival station to see trains." />
        )}
        {enabled && isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {error && (
          <EmptyState text="We couldn't load trains just now. Please try again." />
        )}
        {enabled && !isLoading && data?.length === 0 && (
          <EmptyState text="No trains run on this route for the selected date and class. Try another date or class." />
        )}

        <div className="space-y-4">
          {data?.map((s) => {
            const soldOut = s.available_seats === 0;
            return (
              <article
                key={s.id}
                className="surface-card surface-card-hover grid gap-6 p-6 md:grid-cols-[1.4fr_auto] md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrainFront className="size-4 text-gold" />
                    <span className="font-medium text-foreground">
                      {s.trains.train_name}
                    </span>
                    <span>#{s.trains.train_number}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-5">
                    <div>
                      <p className="font-display text-3xl">{formatTime(s.departure_time)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.trains.source.station_code} · {s.trains.source.city}
                      </p>
                    </div>
                    <div className="flex min-w-28 flex-col items-center">
                      <span className="text-xs text-muted-foreground">
                        {durationBetween(s.departure_time, s.arrival_time)}
                      </span>
                      <span className="my-1 h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
                      <ArrowRight className="size-3.5 text-gold" />
                    </div>
                    <div>
                      <p className="font-display text-3xl">{formatTime(s.arrival_time)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.trains.destination.station_code} · {s.trains.destination.city}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-between gap-4 border-t border-border pt-5 md:flex-col md:items-end md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <div className="text-right">
                    <p className="font-display text-3xl">{inr(s.fare)}</p>
                    <p
                      className={`text-xs ${soldOut ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {soldOut
                        ? "Waitlist only — no seats"
                        : `${s.available_seats} seats available`}
                    </p>
                  </div>
                  {soldOut ? (
                    <Button disabled variant="outline">
                      Sold out
                    </Button>
                  ) : (
                    <Link to="/book" search={{ schedule: s.id }}>
                      <Button className="bg-gold text-accent-foreground transition-transform hover:-translate-y-0.5 hover:bg-gold/90">
                        Book now
                      </Button>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="surface-card flex items-center gap-3 p-8 text-sm text-muted-foreground">
      <AlertCircle className="size-5 text-gold" />
      {text}
    </div>
  );
}
