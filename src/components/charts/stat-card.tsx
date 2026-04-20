import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent: string;
}

export function StatCard({ label, value, subtitle, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="p-5 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
      <div
        className="text-2xl font-bold text-[var(--obsidian)] tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      <div className="text-xs text-[var(--text-tertiary)] mt-1">{label}</div>
      {subtitle && (
        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 opacity-60">{subtitle}</div>
      )}
    </div>
  );
}
