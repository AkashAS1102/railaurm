import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Clock, QrCode } from "lucide-react";
import heroTrain from "@/assets/hero-train.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchWidget } from "@/components/SearchWidget";

export const Route = createFileRoute("/")({
  component: Index,
});

const FEATURES = [
  {
    icon: Clock,
    title: "Live availability",
    body: "Seat counts update the moment a booking is confirmed, so you never chase a full train.",
  },
  {
    icon: ShieldCheck,
    title: "Safe reservations",
    body: "Every booking is reserved in a single protected step — no double-booked berths.",
  },
  {
    icon: QrCode,
    title: "Instant e-ticket",
    body: "A printable ticket with your PNR and scan code is ready the second you confirm.",
  },
];

function Index() {
  return (
    <main>
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={heroTrain}
          alt="Express train crossing a stone viaduct at golden dusk"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.17_0.05_262/0.86),oklch(0.17_0.05_262/0.62)_45%,oklch(0.17_0.05_262/0.94))]" />

        <div className="relative flex min-h-[92vh] flex-col">
          <SiteHeader variant="onDark" />

          <div className="mx-auto w-full max-w-6xl flex-1 px-5 pb-14">
            <div className="max-w-2xl pt-10 md:pt-20">
              <p className="eyebrow text-gold">Reserve with confidence</p>
              <h1 className="mt-4 text-5xl leading-[1.05] text-primary-foreground md:text-7xl">
                The railways,
                <br />
                <span className="italic text-gold">beautifully booked.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-primary-foreground/75 md:text-lg">
                Find every train between two cities, compare fares across classes and
                confirm your berth in under a minute.
              </p>
            </div>

            <div className="mt-10 md:mt-14">
              <SearchWidget />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface-card surface-card-hover p-7">
              <span className="grid size-11 place-items-center rounded-xl bg-gold-soft text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h2 className="mt-5 text-2xl">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>

        <div className="gold-rule my-16" />

        <div className="ink-panel flex flex-col items-start gap-6 rounded-3xl p-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Sparkles className="size-6 text-gold" />
            <h2 className="mt-4 text-3xl text-primary-foreground">
              Your trips, always in one place
            </h2>
            <p className="mt-2 max-w-lg text-sm text-primary-foreground/70">
              Create an account to keep every PNR, passenger list and e-ticket saved and
              ready to print.
            </p>
          </div>
          <Link
            to="/auth"
            className="rounded-xl bg-gold px-7 py-3.5 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5"
          >
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        RailAurum — a demonstration railway reservation experience.
      </footer>
    </main>
  );
}
