/* Region of origin: country code → flag + readable name. */
export const REGION_META: Record<string, { label: string; flag: string }> = {
  CN: { label: "Mainland China", flag: "🇨🇳" },
  HK: { label: "Hong Kong", flag: "🇭🇰" },
  TW: { label: "Taiwan", flag: "🇹🇼" },
  JP: { label: "Japan", flag: "🇯🇵" },
  KR: { label: "South Korea", flag: "🇰🇷" },
  SG: { label: "Singapore", flag: "🇸🇬" },
  TH: { label: "Thailand", flag: "🇹🇭" },
  VN: { label: "Vietnam", flag: "🇻🇳" },
  MY: { label: "Malaysia", flag: "🇲🇾" },
  ID: { label: "Indonesia", flag: "🇮🇩" },
  IN: { label: "India", flag: "🇮🇳" },
  PH: { label: "Philippines", flag: "🇵🇭" },
};

export function regionMeta(code: string | null): { label: string; flag: string } {
  if (!code) return { label: "Origin pending", flag: "🏭" };
  return REGION_META[code.toUpperCase()] ?? { label: code.toUpperCase(), flag: "🌏" };
}

/* Shipping label (Incoterm): responsibility spectrum.
   Green → seller handles most. Amber → split. Red → buyer handles most. */
export interface TradeMeta {
  short: string;
  full: string;
  tooltip: string;
  bg: string;
  fg: string;
  border: string;
}

export const TRADE_META: Record<string, TradeMeta> = {
  ddp: {
    short: "DDP",
    full: "Delivered Duty Paid",
    tooltip:
      "Supplier covers freight, insurance and import duties — the easiest option for buyers.",
    bg: "bg-[var(--success)]/12",
    fg: "text-[var(--success)]",
    border: "border-[var(--success)]/25",
  },
  dap: {
    short: "DAP",
    full: "Delivered at Place",
    tooltip:
      "Supplier delivers to your named destination; you clear customs and pay import duty.",
    bg: "bg-[var(--success)]/10",
    fg: "text-[var(--success)]",
    border: "border-[var(--success)]/20",
  },
  cif: {
    short: "CIF",
    full: "Cost, Insurance & Freight",
    tooltip:
      "Supplier covers shipping plus insurance to the destination port; you handle import.",
    bg: "bg-[var(--indigo)]/12",
    fg: "text-[var(--indigo)]",
    border: "border-[var(--indigo)]/25",
  },
  cpt: {
    short: "CPT",
    full: "Carriage Paid To",
    tooltip:
      "Supplier pays freight to the named place; you arrange insurance and import clearance.",
    bg: "bg-[var(--indigo)]/12",
    fg: "text-[var(--indigo)]",
    border: "border-[var(--indigo)]/25",
  },
  fob: {
    short: "FOB",
    full: "Free on Board",
    tooltip:
      "Supplier loads the goods onto the vessel; you cover ocean freight, insurance and import.",
    bg: "bg-[var(--amber)]/15",
    fg: "text-[var(--amber-dark)]",
    border: "border-[var(--amber)]/25",
  },
  fca: {
    short: "FCA",
    full: "Free Carrier",
    tooltip:
      "Supplier hands goods to the carrier you nominate; you handle shipping from there on.",
    bg: "bg-[var(--amber)]/15",
    fg: "text-[var(--amber-dark)]",
    border: "border-[var(--amber)]/25",
  },
  exw: {
    short: "EXW",
    full: "Ex Works",
    tooltip:
      "Supplier makes goods available at the factory; you arrange pickup, export and import — most effort for buyers.",
    bg: "bg-[var(--terracotta)]/12",
    fg: "text-[var(--terracotta)]",
    border: "border-[var(--terracotta)]/25",
  },
};

export function tradeMeta(term: string | null): TradeMeta | null {
  if (!term) return null;
  return TRADE_META[term.toLowerCase()] ?? null;
}
