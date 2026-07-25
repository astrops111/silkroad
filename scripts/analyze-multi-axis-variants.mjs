// Read-only analysis: looks for evidence of 3-or-4-axis variant families that the
// current 2-axis (option_size, option_shade) schema/consolidation can't represent.
//
// Two signals checked:
//   1. COLLISIONS: within an already-consolidated parent, two+ product_variants
//      rows share the identical (option_size, option_shade) pair. If size+shade
//      were the only real axes, that pair would be unique — a collision means a
//      3rd axis (color/pack-count/formulation/etc.) was needed to disambiguate
//      but got silently dropped or folded into one of the two labels.
//   2. RESIDUAL TEXT: within a consolidated parent, variant names/labels still
//      differ by more than the size+shade tokens already extracted (e.g. a
//      leftover color word or pack-count both variants' source names carried).
//
// Does NOT modify any data — reporting only.
// Run: node --env-file=.env scripts/analyze-multi-axis-variants.mjs

import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ── 1. Fetch all parent products that have consolidated variants (paginated) ──
const variants = [];
{
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await admin
      .from("product_variants")
      .select("id, product_id, name, option_size, option_shade, sku, jan_code, is_default")
      .order("product_id")
      .range(from, from + PAGE - 1);
    if (error) { console.error(error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    variants.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
}

console.log(`Total product_variants rows: ${variants.length}`);

const byParent = new Map();
for (const v of variants) {
  if (!byParent.has(v.product_id)) byParent.set(v.product_id, []);
  byParent.get(v.product_id).push(v);
}

const twoAxisParents = [...byParent.entries()].filter(([, vs]) =>
  vs.some((v) => v.option_size) && vs.some((v) => v.option_shade)
);
console.log(`Parents with BOTH option_size and option_shade populated on at least one variant: ${twoAxisParents.length}`);

// ── 2. Collision check: duplicate (option_size, option_shade) pairs within a parent.
//      Only counts as a real collision when the pair has at least one non-null axis —
//      two variants that are BOTH null on both axes are legacy free-text (name-only)
//      variants that predate the 00113 migration, not a size×shade collision.
const collisions = [];
for (const [productId, vs] of byParent) {
  const pairMap = new Map();
  for (const v of vs) {
    if (!v.option_size && !v.option_shade) continue; // legacy free-text row, handled separately below
    const key = `${v.option_size ?? "∅"}::${v.option_shade ?? "∅"}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key).push(v);
  }
  for (const [pair, members] of pairMap) {
    if (members.length > 1) {
      collisions.push({ productId, pair, members });
    }
  }
}

console.log(`\n=== Collisions (2+ variants sharing identical size×shade pair — needs a 3rd axis) ===`);
console.log(`Parents with at least one collision: ${collisions.length}\n`);

if (collisions.length) {
  const { data: names } = await admin
    .from("products")
    .select("id, name, brand")
    .in("id", [...new Set(collisions.map((c) => c.productId))]);
  const nameMap = new Map((names ?? []).map((p) => [p.id, p]));

  for (const c of collisions.slice(0, 60)) {
    const p = nameMap.get(c.productId);
    console.log(`[${p?.brand ?? "?"}] "${p?.name ?? c.productId}" (${c.productId})`);
    console.log(`  pair=${c.pair}`);
    for (const m of c.members) {
      console.log(`    - variant ${m.id} name="${m.name}" sku=${m.sku} jan=${m.jan_code} default=${m.is_default}`);
    }
  }
  if (collisions.length > 60) console.log(`  ... and ${collisions.length - 60} more`);
}

// ── 3. Residual-token check: variant `name` still carries extra distinguishing
//      text beyond what size+shade already captured, hinting at an unmodeled axis.
function residual(v) {
  let n = (v.name || "").toLowerCase();
  if (v.option_size) n = n.split(v.option_size.toLowerCase()).join(" ");
  if (v.option_shade) n = n.split(v.option_shade.toLowerCase()).join(" ");
  return n.replace(/[()\-–—,]/g, " ").replace(/\s{2,}/g, " ").trim();
}

const residualFindings = [];
for (const [productId, vs] of byParent) {
  if (!(vs.some((v) => v.option_size) && vs.some((v) => v.option_shade))) continue;
  const residuals = vs.map((v) => ({ v, r: residual(v) })).filter(({ r }) => r.length > 2);
  const distinctResiduals = new Set(residuals.map(({ r }) => r));
  if (distinctResiduals.size > 1) {
    residualFindings.push({ productId, residuals });
  }
}

console.log(`\n=== Residual-text findings (variant names differ beyond size+shade — possible 3rd/4th axis) ===`);
console.log(`Parents flagged: ${residualFindings.length}\n`);

if (residualFindings.length) {
  const { data: names2 } = await admin
    .from("products")
    .select("id, name, brand")
    .in("id", [...new Set(residualFindings.map((c) => c.productId))]);
  const nameMap2 = new Map((names2 ?? []).map((p) => [p.id, p]));

  for (const c of residualFindings.slice(0, 60)) {
    const p = nameMap2.get(c.productId);
    console.log(`[${p?.brand ?? "?"}] "${p?.name ?? c.productId}" (${c.productId})`);
    for (const { v, r } of c.residuals) {
      console.log(`    - variant ${v.id} name="${v.name}" size=${v.option_size} shade=${v.option_shade} residual="${r}"`);
    }
  }
  if (residualFindings.length > 60) console.log(`  ... and ${residualFindings.length - 60} more`);
}

// ── 4. Legacy free-text multi-attribute check: parents whose variants use only
//      the plain `name` field (both option_size/option_shade null) but whose name
//      itself is comma-separated (e.g. "Graphite, Brown Switch" = color × switch-type)
//      — evidence of a 2nd/3rd attribute crammed into one untyped field because the
//      schema only has dedicated columns for size and shade, nothing else.
const commaFindings = [];
for (const [productId, vs] of byParent) {
  const legacy = vs.filter((v) => !v.option_size && !v.option_shade);
  if (legacy.length < 2) continue;
  const withCommas = legacy.filter((v) => (v.name || "").includes(","));
  if (withCommas.length >= 2) {
    // How many comma-separated segments does the busiest variant name have?
    const maxSegments = Math.max(...legacy.map((v) => (v.name || "").split(",").length));
    commaFindings.push({ productId, legacy, maxSegments });
  }
}
commaFindings.sort((a, b) => b.maxSegments - a.maxSegments);

console.log(`\n=== Legacy free-text variants with comma-separated multi-attribute names (hidden 2nd/3rd axis, no dedicated columns) ===`);
console.log(`Parents flagged: ${commaFindings.length}\n`);

if (commaFindings.length) {
  const { data: names3 } = await admin
    .from("products")
    .select("id, name, brand")
    .in("id", [...new Set(commaFindings.map((c) => c.productId))]);
  const nameMap3 = new Map((names3 ?? []).map((p) => [p.id, p]));

  for (const c of commaFindings.slice(0, 60)) {
    const p = nameMap3.get(c.productId);
    console.log(`[${p?.brand ?? "?"}] "${p?.name ?? c.productId}" (${c.productId}) — up to ${c.maxSegments} attribute segments`);
    for (const v of c.legacy) {
      console.log(`    - variant ${v.id} name="${v.name}" sku=${v.sku}`);
    }
  }
  if (commaFindings.length > 60) console.log(`  ... and ${commaFindings.length - 60} more`);
}

console.log(`\nDone.`);
