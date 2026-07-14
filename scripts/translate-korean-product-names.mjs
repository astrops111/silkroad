// Find products whose `name` is Korean-only (or a literal "-" with the Korean
// name parked in `name_local`), batch-translate them to English in one request
// per chunk via NVIDIA/DeepSeek, then write the English name back to `products.name`
// (preserving the original Korean in `name_local`).
//
// Run: node --env-file=.env scripts/translate-korean-product-names.mjs

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is not set");
const ai = new OpenAI({ apiKey: NVIDIA_API_KEY, baseURL: "https://integrate.api.nvidia.com/v1", maxRetries: 2, timeout: 120_000 });
const FALLBACK_MODELS = ["deepseek-ai/deepseek-v4-pro", "z-ai/glm-5.2", "deepseek-ai/deepseek-v4-flash"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYSTEM_PROMPT = `You translate Korean cosmetics/skincare product names to English for a B2B marketplace catalog.
You will receive a JSON array of {"id": string, "korean": string}.
Return ONLY a JSON array of {"id": string, "english": string} — same ids, same order, no other text.
Rules for "english":
- Keep brand names, model numbers, volumes (ml/g), and codes exactly as given (transliterate Korean brand names, e.g. 메디큐브 -> Medicube).
- Keep it concise, matching how the product would be named on an English product listing.
- Do not add marketing language that was not implied by the Korean name.`;

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  return JSON.parse(raw.slice(start, end + 1));
}

async function translateChunkOnce(chunk) {
  const userPayload = JSON.stringify(chunk.map((t) => ({ id: t.id, korean: t.korean })));
  for (const model of FALLBACK_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const completion = await ai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPayload },
          ],
          temperature: 0.2,
          max_tokens: 8000,
          stream: false,
          chat_template_kwargs: { thinking: false },
        });
        const text = completion.choices[0]?.message?.content ?? "";
        return extractJson(text);
      } catch (err) {
        const status = err?.status;
        if (status === 429 || status === 503) {
          await sleep(3000 * (attempt + 1));
          continue;
        }
        throw err;
      }
    }
  }
  throw new Error("all models rate-limited after retries");
}

// Splits the chunk in half and retries if the model output was truncated/malformed JSON.
async function translateChunk(chunk) {
  try {
    return await translateChunkOnce(chunk);
  } catch (err) {
    if (chunk.length <= 5) throw err;
    console.warn(`  chunk of ${chunk.length} failed (${err.message}) — splitting in half and retrying`);
    const mid = Math.ceil(chunk.length / 2);
    const [a, b] = await Promise.all([translateChunk(chunk.slice(0, mid)), translateChunk(chunk.slice(mid))]);
    return [...a, ...b];
  }
}

const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;

const data = [];
const PAGE_SIZE = 1000;
for (let from = 0; ; from += PAGE_SIZE) {
  const { data: page, error } = await admin
    .from("products")
    .select("id, name, name_local")
    .order("id", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  data.push(...page);
  if (page.length < PAGE_SIZE) break;
}

const dashWithKoreanLocal = data.filter(
  (p) => p.name && p.name.trim() === "-" && p.name_local && HANGUL.test(p.name_local)
);
const koreanInName = data.filter((p) => p.name && HANGUL.test(p.name));

const targets = [
  ...dashWithKoreanLocal.map((p) => ({ id: p.id, korean: p.name_local, source: "name_local" })),
  ...koreanInName.map((p) => ({ id: p.id, korean: p.name, source: "name" })),
];

console.log(`Products to translate: ${targets.length}`);

const CHUNK_SIZE = 40;
const chunks = [];
for (let i = 0; i < targets.length; i += CHUNK_SIZE) chunks.push(targets.slice(i, i + CHUNK_SIZE));

const englishById = new Map();
for (const [i, chunk] of chunks.entries()) {
  console.log(`Translating chunk ${i + 1}/${chunks.length} (${chunk.length} items)...`);
  const translated = await translateChunk(chunk);
  for (const row of translated) englishById.set(row.id, row.english);
  await sleep(500);
}

console.log(`\nTranslated ${englishById.size}/${targets.length} items. Applying updates to database...`);

let updated = 0;
let failed = 0;
for (const t of targets) {
  const english = englishById.get(t.id);
  if (!english || !english.trim()) {
    console.error(`  MISSING translation for id=${t.id} (korean="${t.korean}")`);
    failed++;
    continue;
  }
  const update = { name: english.trim() };
  if (t.source === "name") update.name_local = t.korean;

  const { error } = await admin.from("products").update(update).eq("id", t.id);
  if (error) {
    console.error(`  UPDATE FAILED id=${t.id}: ${error.message}`);
    failed++;
    continue;
  }
  console.log(`  ${t.korean}  ->  ${english.trim()}`);
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Failed: ${failed}, Total targets: ${targets.length}`);
