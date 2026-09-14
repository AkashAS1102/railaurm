import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, MapPin, X } from "lucide-react";
import type { Station } from "@/lib/rail";

type Props = {
  value: string;
  onChange: (id: string) => void;
  stations: Station[];
  label: string;
  placeholder?: string;
};

export function StationPicker({
  value,
  onChange,
  stations,
  label,
  placeholder = "Search station...",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === value),
    [stations, value],
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations.slice(0, 35);
    return stations.filter(
      (s) =>
        s.station_code.toLowerCase().includes(q) ||
        s.station_name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q),
    );
  }, [stations, query]);

  function handleSelect(s: Station) {
    onChange(s.id);
    setIsOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative block">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className="flex min-h-[50px] cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground transition-all hover:border-gold/60 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/30"
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <MapPin className="size-4 shrink-0 text-gold" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              placeholder={
                selectedStation
                  ? `${selectedStation.station_name} (${selectedStation.station_code})`
                  : placeholder
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsOpen(false);
                  setQuery("");
                }
                if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  handleSelect(filtered[0]!);
                }
              }}
            />
          ) : (
            <span
              className={`truncate text-sm ${
                selectedStation ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {selectedStation
                ? `${selectedStation.station_name} (${selectedStation.station_code})`
                : placeholder}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {selectedStation && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="size-3.5" />
            </button>
          )}
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in-50 zoom-in-95">
          <div className="border-b border-border/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            {query.trim()
              ? `Found ${filtered.length} station${filtered.length === 1 ? "" : "s"}`
              : "Search by station name, city, or code (e.g. NDLS, Mumbai, JP)"}
          </div>
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No stations match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((s) => {
              const isSelected = s.id === value;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-gold/15 font-medium text-gold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs font-semibold text-gold">
                      {s.station_code}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{s.station_name}</div>
                      <div className="text-xs text-muted-foreground">{s.city}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="size-4 text-gold" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
