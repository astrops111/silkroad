"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  color?: string;
  formatValue?: (v: number) => string;
  height?: number;
}

export function BarChart({
  data,
  maxValue,
  color = "var(--amber)",
  formatValue = (v) => v.toLocaleString(),
  height = 200,
}: BarChartProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, i) => {
        const pct = (item.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
              {formatValue(item.value)}
            </span>
            <div
              className="w-full rounded-t-md transition-all hover:opacity-80"
              style={{
                height: `${Math.max(pct, 2)}%`,
                background: color,
                opacity: 0.8 + (pct / 500),
              }}
            />
            <span className="text-[10px] text-[var(--text-tertiary)] truncate max-w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
