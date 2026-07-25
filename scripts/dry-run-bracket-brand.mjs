// Dry-run (read-only): compute the proposed new `name` for every product
// with a non-empty `brand`, applying the confirmed rules:
//   1. If name already starts with "[X]" and X normalizes to the same
//      value as brand -> already correct, skip.
//   2. If name already starts with "[X]" but X is NOT the brand (e.g.
//      "[Sachet]", "[NEW]", "[US]") -> prepend "[Brand] " in front of the
//      existing bracket.
//   3. Else if name starts with the brand as plain text (exact
//      case-insensitive, or normalized match tolerating punctuation/
//      spacing differences like "SU:M37" vs "SUM37") -> wrap that leading
//      text: replace it with "[Brand] " + rest of name.
//   4. Else (no leading bracket, no plain-text brand prefix, including
//      names with a bracket only in the middle/end, e.g. "...[Refill]")
//      -> prepend "[Brand] " in front of the whole name.
// Products with no brand value are skipped entirely.
//
// Run: node --env-file=.env scripts/dry-run-bracket-brand.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const data = [];
const PAGE_SIZE = 1000;
for (let from = 0; ; from += PAGE_SIZE) {
  const { data: page, error } = await admin
    .from("products")
    .select("id, name, brand")
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  data.push(...page);
  if (page.length < PAGE_SIZE) break;
}

const norm = (s) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, "") : "");

// Find the index in `name` where a normalized-prefix of length
// normBrand.length ends, walking char by char so punctuation/spacing
// differences (e.g. "SU:M37" vs "SUM37") don't break alignment.
function findNormalizedBoundary(name, normBrand) {
  let consumed = "";
  for (let i = 0; i < name.length; i++) {
    const ch = name[i].toLowerCase();
    if (/[a-z0-9]/.test(ch)) consumed += ch;
    if (consumed === normBrand) return i + 1;
    if (consumed.length > normBrand.length) return -1;
  }
  return -1;
}

const results = { alreadyCorrect: [], mismatchBracket: [], wrapPlainText: [], prependNoMatch: [], noBrand: 0 };

for (const p of data) {
  if (!p.name) continue;
  const brand = p.brand?.trim();
  if (!brand) {
    results.noBrand++;
    continue;
  }
  const normBrand = norm(brand);
  const leadingBracket = p.name.match(/^\s*\[([^\]]*)\]/);

  if (leadingBracket) {
    if (norm(leadingBracket[1]) === normBrand) {
      results.alreadyCorrect.push({ id: p.id, name: p.name });
    } else {
      results.mismatchBracket.push({ id: p.id, brand, oldName: p.name, newName: `[${brand}] ${p.name}` });
    }
    continue;
  }

  const trimmedName = p.name.trim();
  if (trimmedName.toLowerCase().startsWith(brand.toLowerCase())) {
    const rest = trimmedName.slice(brand.length).trim();
    results.wrapPlainText.push({ id: p.id, brand, oldName: p.name, newName: rest ? `[${brand}] ${rest}` : `[${brand}]` });
    continue;
  }

  const boundary = findNormalizedBoundary(trimmedName, normBrand);
  if (boundary > 0) {
    const rest = trimmedName.slice(boundary).trim();
    results.wrapPlainText.push({ id: p.id, brand, oldName: p.name, newName: rest ? `[${brand}] ${rest}` : `[${brand}]` });
    continue;
  }

  results.prependNoMatch.push({ id: p.id, brand, oldName: p.name, newName: `[${brand}] ${p.name}` });
}

console.log(`Total products scanned: ${data.length}`);
console.log(`No brand value (skipped): ${results.noBrand}`);
console.log(`Already correct [Brand] prefix (skipped): ${results.alreadyCorrect.length}`);
console.log(`Leading bracket present but NOT the brand -> prepend: ${results.mismatchBracket.length}`);
console.log(`Plain-text brand prefix -> wrapped in brackets: ${results.wrapPlainText.length}`);
console.log(`No bracket, no plain-text brand prefix -> prepend: ${results.prependNoMatch.length}`);
console.log(`Total to update: ${results.mismatchBracket.length + results.wrapPlainText.length + results.prependNoMatch.length}`);

console.log("\n--- Sample: mismatch bracket -> prepend (first 15) ---");
for (const c of results.mismatchBracket.slice(0, 15)) {
  console.log(`  "${c.oldName}"  ->  "${c.newName}"`);
}

console.log("\n--- Sample: plain-text wrap (first 20) ---");
for (const c of results.wrapPlainText.slice(0, 20)) {
  console.log(`  "${c.oldName}"  ->  "${c.newName}"`);
}

console.log("\n--- Sample: no match, straight prepend (first 20) ---");
for (const c of results.prependNoMatch.slice(0, 20)) {
  console.log(`  "${c.oldName}"  ->  "${c.newName}"`);
}
