// Diagnostic: find products whose `name` field is missing, a dash, or not in English (contains Korean Hangul)
// Run: node --env-file=.env scripts/check-korean-product-names.mjs

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;

const data = [];
const PAGE_SIZE = 1000;
for (let from = 0; ; from += PAGE_SIZE) {
  const { data: page, error } = await admin
    .from("products")
    .select("id, name, name_local, moderation_status, is_active")
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

const blank = data.filter((p) => !p.name || p.name.trim() === "" || p.name.trim() === "-");
const koreanInName = data.filter((p) => p.name && HANGUL.test(p.name));
const koreanOnlyNoLocal = koreanInName.filter((p) => !p.name_local || p.name_local.trim() === "");

console.log(`\nBlank / dash "name": ${blank.length}`);
for (const p of blank.slice(0, 20)) {
  console.log(`  id=${p.id} name="${p.name}" name_local="${p.name_local}" status=${p.moderation_status} active=${p.is_active}`);
}

console.log(`\nKorean text found IN "name" column: ${koreanInName.length}`);
for (const p of koreanInName.slice(0, 30)) {
  console.log(`  id=${p.id} name="${p.name}" name_local="${p.name_local}"`);
}

console.log(`\nOf those, missing name_local entirely (no Korean backup either): ${koreanOnlyNoLocal.length}`);
for (const p of koreanOnlyNoLocal.slice(0, 30)) {
  console.log(`  id=${p.id} name="${p.name}"`);
}
