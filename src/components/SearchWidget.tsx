import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Search } from "lucide-react";
import { toast } from "sonner";
import { CLASSES, fetchStations, todayISO } from "@/lib/rail";
import { Button } from "@/components/ui/button";

type Props = {
  initial?: { from?: string; to?: string; date?: string; cls?: string };
  compact?: boolean;
};

export function SearchWidget({ initial, compact }: Props) {
  const navigate = useNavigate();
  const { data: stations = [] } = useQuery({
    queryKey: ["stations"],
    queryFn: fetchStations,
  });

  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [cls, setCls] = useState(initial?.cls ?? "SL");

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) {
      toast.error("Choose both a departure and arrival station.");
      return;
    }
    if (from === to) {
      toast.error("Departure and arrival stations must differ.");
      return;
    }
    if (date < todayISO()) {
      toast.error("Pick a journey date in the future.");
      return;
    }
    navigate({ to: "/search", search: { from, to, date, cls } });
  }

  const field =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30";

  return (
    <form
      onSubmit={submit}
      className={`grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-luxe sm:p-5 ${
        compact ? "" : "md:grid-cols-[1fr_auto_1fr_1fr_0.8fr_auto] md:items-end"
      }`}
    >
      <label className="block">
        <span className="eyebrow mb-1.5 block">From</span>
        <select className={field} value={from} onChange={(e) => setFrom(e.target.value)}>
          <option value="">Select station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.station_name} ({s.station_code})
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={swap}
        aria-label="Swap stations"
        className="mx-auto grid size-11 place-items-center rounded-xl border border-border bg-secondary text-foreground transition-colors hover:border-gold hover:text-gold"
      >
        <ArrowLeftRight className="size-4" />
      </button>

      <label className="block">
        <span className="eyebrow mb-1.5 block">To</span>
        <select className={field} value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Select station</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.station_name} ({s.station_code})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="eyebrow mb-1.5 block">Journey date</span>
        <input
          type="date"
          className={field}
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="eyebrow mb-1.5 block">Class</span>
        <select className={field} value={cls} onChange={(e) => setCls(e.target.value)}>
          {CLASSES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="submit"
        size="lg"
        className="h-12 rounded-xl bg-gold px-6 text-accent-foreground hover:bg-gold/90"
      >
        <Search className="size-4" /> Search
      </Button>
    </form>
  );
}
