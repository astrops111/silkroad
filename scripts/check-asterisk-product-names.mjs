// Diagnostic: find products whose `name` field starts with "(*)" or similar asterisk markers
// Run: node --env-file=.env scripts/check-asterisk-product-names.mjs

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
    .select("id, name, description, moderation_status, is_active, supplier_id")
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  data.push(...page);
  if (page.length < PAGE_SIZE) break;
}

console.log(`Total products scanned: ${data.length}`);

const startsWithAsteriskParen = data.filter((p) => p.name && /^\s*\(\*\)/.test(p.name));
console.log(`\nNames starting with "(*)": ${startsWithAsteriskParen.length}`);
for (const p of startsWithAsteriskParen) {
  console.log(`  id=${p.id} name="${p.name}"`);
}

// Broader check in case the marker varies slightly (e.g. full-width parens)
const broaderAsterisk = data.filter((p) => p.name && /^\s*[（(]\s*\*\s*[）)]/.test(p.name));
const onlyInBroader = broaderAsterisk.filter((p) => !startsWithAsteriskParen.includes(p));
if (onlyInBroader.length) {
  console.log(`\nAdditional matches with broader paren pattern: ${onlyInBroader.length}`);
  for (const p of onlyInBroader) {
    console.log(`  id=${p.id} name="${p.name}"`);
  }
}

const leadingStar = data.filter((p) => p.name && /^\s*\*/.test(p.name) && !startsWithAsteriskParen.includes(p));
if (leadingStar.length) {
  console.log(`\nNames starting with bare "*" (no parens): ${leadingStar.length}`);
  for (const p of leadingStar.slice(0, 30)) {
    console.log(`  id=${p.id} name="${p.name}"`);
  }
}
