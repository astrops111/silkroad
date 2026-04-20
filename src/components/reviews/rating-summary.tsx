import { Star } from "lucide-react";

interface RatingSummaryProps {
  average: number;
  total: number;
  distribution: Record<number, number>;
}

export function RatingSummary({ average, total, distribution }: RatingSummaryProps) {
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <div className="flex gap-6 items-start">
      {/* Average */}
      <div className="text-center">
        <div className="text-4xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
          {average.toFixed(1)}
        </div>
        <div className="flex gap-0.5 justify-center mt-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i <= Math.round(average) ? "fill-[var(--amber)] text-[var(--amber)]" : "text-[var(--border-strong)]"}`}
            />
          ))}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{total} reviews</p>
      </div>

      {/* Distribution */}
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-tertiary)] w-3">{star}</span>
              <Star className="w-3 h-3 fill-[var(--amber)] text-[var(--amber)]" />
              <div className="flex-1 h-2 rounded-full bg-[var(--surface-tertiary)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--amber)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
