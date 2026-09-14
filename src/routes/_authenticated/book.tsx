import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, ArrowRight, TrainFront, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  bookTicket,
  confirmPayment,
  durationBetween,
  fetchSchedule,
  formatTime,
  inr,
  prettyDate,
  startPayment,
  CLASSES,
  type PassengerInput,
  type PaymentIntent,
} from "@/lib/rail";

export const Route = createFileRoute("/_authenticated/book")({
  validateSearch: (raw: Record<string, unknown>) => ({
    schedule: String(raw['schedule'] ?? ""),
  }),
  component: BookPage,
});

const BLANK: PassengerInput = { name: "", age: 30, gender: "Male" };

const field =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30";

function BookPage() {
  const { schedule: scheduleId } = Route.useSearch();
  const navigate = useNavigate();
  const [passengers, setPassengers] = useState<PassengerInput[]>([{ ...BLANK }]);
  const [busy, setBusy] = useState(false);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["schedule", scheduleId],
    queryFn: () => fetchSchedule(scheduleId),
    enabled: Boolean(scheduleId),
  });

  function update(i: number, patch: Partial<PassengerInput>) {
    setPassengers((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function goToPayment() {
    if (!schedule) return;
    if (passengers.some((p) => p.name.trim().length < 2)) {
      toast.error("Enter a full name for every passenger.");
      return;
    }
    if (passengers.some((p) => !p.age || p.age < 1 || p.age > 119)) {
      toast.error("Enter a valid age for every passenger.");
      return;
    }
    if (passengers.length > schedule.available_seats) {
      toast.error(`Only ${schedule.available_seats} seat(s) left on this train.`);
      return;
    }

    setBusy(true);
    try {
      const created = await startPayment(schedule.id, passengers.length);
      setIntent(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
    } finally {
      setBusy(false);
    }
  }

  async function payAndBook(cardLast4: string, method: string) {
    if (!schedule || !intent) return;
    setBusy(true);
    try {
      await confirmPayment(intent.payment_id, cardLast4, method);
      const pnr = await bookTicket(
        schedule.id,
        passengers.map((p) => ({ ...p, name: p.name.trim(), age: Number(p.age) })),
        intent.payment_id,
      );
      toast.success(`Payment received — PNR ${pnr}`);
      navigate({ to: "/ticket/$pnr", params: { pnr } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Booking failed. Please retry.");
      setIntent(null);
    } finally {
      setBusy(false);
    }
  }

  const fare = schedule?.fare ?? 0;
  const base = fare * passengers.length;
  const convenience = Math.round(base * 0.02);
  const total = intent?.amount ?? base + convenience;

  return (
    <main className="min-h-screen bg-background">
      <div className="ink-panel">
        <SiteHeader variant="onDark" />
      </div>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted" />}
        {!isLoading && !schedule && (
          <div className="surface-card p-8 text-sm text-muted-foreground">
            This train is no longer available.{" "}
            <Link to="/" className="underline decoration-gold underline-offset-4">
              Start a new search
            </Link>
            .
          </div>
        )}

        {schedule && (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
            <div>
              <p className="eyebrow">{intent ? "Step 3 of 3" : "Step 2 of 3"}</p>
              <h1 className="mt-2 text-4xl">{intent ? "Payment" : "Passenger details"}</h1>

              {intent ? (
                <PaymentForm
                  amount={intent.amount}
                  reference={intent.reference}
                  busy={busy}
                  onBack={() => setIntent(null)}
                  onPay={payAndBook}
                />
              ) : (
                <>
                  <div className="mt-6 space-y-4">
                    {passengers.map((p, i) => (
                      <div key={i} className="surface-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="eyebrow">Passenger {i + 1}</span>
                          {passengers.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Remove passenger ${i + 1}`}
                              onClick={() =>
                                setPassengers((rows) => rows.filter((_, idx) => idx !== i))
                              }
                              className="text-muted-foreground transition-colors hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[2fr_0.8fr_1fr]">
                          <label className="block">
                            <span className="eyebrow mb-1.5 block">Full name</span>
                            <input
                              className={field}
                              value={p.name}
                              placeholder="As per photo ID"
                              onChange={(e) => update(i, { name: e.target.value })}
                            />
                          </label>
                          <label className="block">
                            <span className="eyebrow mb-1.5 block">Age</span>
                            <input
                              type="number"
                              min={1}
                              max={119}
                              className={field}
                              value={p.age}
                              onChange={(e) => update(i, { age: Number(e.target.value) })}
                            />
                          </label>
                          <label className="block">
                            <span className="eyebrow mb-1.5 block">Gender</span>
                            <select
                              className={field}
                              value={p.gender}
                              onChange={(e) => update(i, { gender: e.target.value })}
                            >
                              <option>Male</option>
                              <option>Female</option>
                              <option>Other</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    className="mt-4 rounded-xl"
                    disabled={passengers.length >= 6}
                    onClick={() => setPassengers((rows) => [...rows, { ...BLANK }])}
                  >
                    <Plus className="size-4" /> Add passenger
                  </Button>
                  {passengers.length >= 6 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Up to 6 passengers per booking.
                    </p>
                  )}
                </>
              )}
            </div>

            <aside className="surface-card sticky top-6 p-6">
              <div className="flex items-center gap-2 text-sm">
                <TrainFront className="size-4 text-gold" />
                <span className="font-medium">{schedule.trains.train_name}</span>
                <span className="text-muted-foreground">
                  #{schedule.trains.train_number}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="font-display text-2xl">
                    {formatTime(schedule.departure_time)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.trains.source.station_code}
                  </p>
                </div>
                <div className="flex flex-col items-center text-xs text-muted-foreground">
                  {durationBetween(schedule.departure_time, schedule.arrival_time)}
                  <ArrowRight className="mt-1 size-3.5 text-gold" />
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl">
                    {formatTime(schedule.arrival_time)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {schedule.trains.destination.station_code}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {prettyDate(schedule.journey_date)} ·{" "}
                {CLASSES.find((c) => c.code === schedule.travel_class)?.label}
              </p>

              <div className="gold-rule my-6" />

              <dl className="space-y-2.5 text-sm">
                <Row label={`Base fare × ${passengers.length}`} value={inr(base)} />
                <Row label="Convenience fee" value={inr(convenience)} />
                <div className="gold-rule my-3" />
                <div className="flex items-center justify-between">
                  <dt className="text-sm">Total payable</dt>
                  <dd className="font-display text-3xl">{inr(total)}</dd>
                </div>
              </dl>

              {!intent && (
                <Button
                  onClick={goToPayment}
                  disabled={busy}
                  className="mt-6 h-12 w-full rounded-xl bg-gold text-accent-foreground hover:bg-gold/90"
                >
                  {busy ? "Preparing payment…" : "Continue to payment"}
                </Button>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {schedule.available_seats} seats left · seats are held only once payment succeeds
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function PaymentForm({
  amount,
  reference,
  busy,
  onBack,
  onPay,
}: {
  amount: number;
  reference: string;
  busy: boolean;
  onBack: () => void;
  onPay: (cardLast4: string, method: string) => void;
}) {
  const [method, setMethod] = useState("CARD");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [upi, setUpi] = useState("");

  const digits = number.replace(/\D/g, "");

  function submit() {
    if (method === "CARD") {
      if (digits.length < 12) return toast.error("Enter a valid card number.");
      if (name.trim().length < 2) return toast.error("Enter the name on the card.");
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return toast.error("Expiry must look like MM/YY.");
      if (cvv.length < 3) return toast.error("Enter the 3-digit security code.");
      return onPay(digits.slice(-4), "CARD");
    }
    if (!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi)) return toast.error("Enter a valid UPI ID.");
    return onPay(upi.slice(-4), "UPI");
  }

  return (
    <div className="surface-card mt-6 p-6">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Lock className="size-4 text-gold" /> Secure payment
        </span>
        <span className="text-xs text-muted-foreground">Ref {reference}</span>
      </div>

      <div className="mt-5 flex gap-2">
        {["CARD", "UPI"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
              method === m ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {m === "CARD" ? "Card" : "UPI"}
          </button>
        ))}
      </div>

      {method === "CARD" ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="eyebrow mb-1.5 block">Card number</span>
            <input className={field} inputMode="numeric" placeholder="4242 4242 4242 4242"
              value={number} onChange={(e) => setNumber(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="eyebrow mb-1.5 block">Name on card</span>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Expiry</span>
            <input className={field} placeholder="09/29" value={expiry}
              onChange={(e) => setExpiry(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">CVV</span>
            <input className={field} inputMode="numeric" maxLength={4} value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
      ) : (
        <label className="mt-5 block">
          <span className="eyebrow mb-1.5 block">UPI ID</span>
          <input className={field} placeholder="yourname@bank" value={upi}
            onChange={(e) => setUpi(e.target.value)} />
        </label>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={submit}
          disabled={busy}
          className="h-12 flex-1 rounded-xl bg-gold text-accent-foreground hover:bg-gold/90"
        >
          <CreditCard className="size-4" />
          {busy ? "Processing payment…" : `Pay ${inr(amount)} & reserve seats`}
        </Button>
        <Button variant="outline" className="h-12 rounded-xl" onClick={onBack} disabled={busy}>
          Back
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This checkout runs in demo mode — no money moves and card details are never stored, only
        the last four digits for your receipt.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
