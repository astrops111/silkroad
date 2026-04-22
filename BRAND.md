# Brand Guide — Kitenge

A brand system for the Buy marketplace, inspired by **kitenge** (also known as chitenge / ankara / kanga) — the wax-printed cotton cloth worn and traded across East, Central and West Africa. The visual language borrows from the fabric's signature traits: saturated dyes, ceremonial symbolism, high-contrast geometric repeats, and an uncut selvedge of warm cream cotton.

The brand is African-confident, not folkloric. We use kitenge as a color and rhythm reference — not as decoration.

---

## 1. Brand principles

1. **Bold over muted** — kitenge never whispers. Headline states, CTAs, and category markers carry full-saturation colour. Neutral surfaces exist to let them breathe, not to dull them.
2. **Pattern as punctuation** — motifs appear at moments of arrival (hero, section breaks, empty states, order confirmation), never as wallpaper.
3. **Warm, not hot** — backgrounds default to unbleached cotton cream, not clinical white. Black is a warm onyx, not pure #000.
4. **Earned contrast** — bright dyes sit against deep indigo or onyx; on light surfaces, saturation is held back so type remains legible.
5. **Continental, not national** — the palette pulls from Dutch wax, Tanzanian kanga, Congolese pagne, and Nigerian ankara traditions. We do not style a single country.

---

## 2. Colour system

### 2.1 Primary dyes

The five load-bearing colours. Every screen should read at least two of these.

| Token | Hex | Role |
|---|---|---|
| `--kitenge-crimson` | `#B83C30` | Primary action. CTA fills, active selection, price highlights. |
| `--kitenge-ochre` | `#D89F2E` | Brand accent. Badges, ratings, verified-supplier marks, trade-corridor highlights. |
| `--kitenge-indigo` | `#1F3A8A` | Authority. Navigation chrome on dark surfaces, section headers, buyer portal signifiers. |
| `--kitenge-emerald` | `#1F7A5A` | Trust & success. Confirmed orders, in-stock, settlement paid, mobile-money received. |
| `--kitenge-onyx` | `#14110F` | Ink. Body text, hero backgrounds, 1px rules, logo on light. |

### 2.2 Secondary dyes

Used sparingly — for category-coding, illustration, and large decorative surfaces (hero panels, empty states, pattern strips).

| Token | Hex | Role |
|---|---|---|
| `--kitenge-terracotta` | `#A0502E` | Earth / agriculture category. Soil tones. |
| `--kitenge-aubergine` | `#6B2D5C` | Premium / wholesale tier. Long-haul corridors. |
| `--kitenge-turquoise` | `#0FA6A6` | Logistics / in-transit. Live state. |
| `--kitenge-saffron` | `#E8B84C` | Secondary accent on onyx surfaces only (fails AA on cream). |

### 2.3 Neutrals (the unprinted selvedge)

| Token | Hex | Role |
|---|---|---|
| `--cotton` | `#F6EFDC` | Default page background. Warm, unbleached. |
| `--cotton-warm` | `#ECE2C7` | Elevated cards on cotton. Table row banding. |
| `--chalk` | `#FBF7ED` | Modal / popover surface. |
| `--ash` | `#4C463D` | Secondary text. |
| `--smoke` | `#8A8378` | Tertiary text, placeholders, disabled. |
| `--onyx-soft` | `#2A2520` | Elevated surface on onyx hero. |

### 2.4 Functional overrides

Functional tokens inherit from the dye palette rather than introducing new greens/reds — the dye colours are already semantically tuned.

| Token | Maps to |
|---|---|
| `--success` | `--kitenge-emerald` |
| `--danger` | `--kitenge-crimson` |
| `--warning` | `--kitenge-ochre` |
| `--info` | `--kitenge-turquoise` |

### 2.5 Contrast rules

- **Body text** uses `--kitenge-onyx` on `--cotton` or `--chalk` (≥ 13:1). Never set body text in a dye.
- **Crimson and emerald** pass AA for large text (18 px+) on cotton. For body-sized UI copy on cotton, darken to `#9A2F25` (crimson) or `#186144` (emerald).
- **Ochre and saffron** do NOT pass AA on cotton. Use only on onyx/indigo surfaces, or as fills behind onyx text.
- **Indigo** passes AA for body text on cotton — it is the one dye safe for long-form emphasis.

### 2.6 Corridor coding (optional)

For cross-border trade UI, corridors can adopt a dye. Keep assignments stable across the product.

- Intra-East Africa → emerald
- West → Central → ochre
- Southern → Gulf → indigo
- Diaspora → aubergine

---

## 3. Typography

Kitenge patterns are geometric and confident. Type should match — generous in weight, tight in tracking at display sizes, warm in the body.

- **Display** — Cabinet Grotesk 700/800. Used for H1–H2, pricing on product cards, and hero corridor names. Tracking: `-0.02em` at ≥ 40 px.
- **Body** — Satoshi 400/500/700. 16 px base, 1.6 line-height. Tracking: `-0.005em`.
- **Numeric** — Satoshi tabular figures for price tables, settlement ledgers, stock counts. Never use Cabinet for numerals in tables.
- **Swahili / French / Arabic** — the body stack must degrade cleanly to `system-ui`. For Arabic portals, pair with **IBM Plex Sans Arabic** 400/700; do not stretch Satoshi glyphs.

### Hierarchy

| Use | Family | Weight | Size / Line | Tracking |
|---|---|---|---|---|
| Hero display | Cabinet Grotesk | 800 | 72/76 | -0.025em |
| H1 | Cabinet Grotesk | 700 | 48/56 | -0.02em |
| H2 | Cabinet Grotesk | 700 | 32/40 | -0.015em |
| H3 / card title | Satoshi | 700 | 20/28 | -0.01em |
| Body | Satoshi | 400 | 16/26 | -0.005em |
| Small / caption | Satoshi | 500 | 13/20 | 0 |
| Eyebrow / label | Satoshi | 700 uppercase | 11/16 | 0.12em |

---

## 4. Pattern & motif

Three motif families — derived from common kitenge layouts. Ship as inline SVGs, single-colour, so they inherit from any dye token.

1. **Repeat diamond** (Tanzanian kanga border) — for section breaks, email headers, order-confirmation banners.
2. **Half-drop stripe** (wax pagne running border) — for the top 4 px of the site header and for divider rules.
3. **Sun-burst medallion** (ankara centre motif) — for empty states, success screens, and the app icon.

**Rules.**
- Never render a motif smaller than 24 px; detail collapses.
- Never layer two motif families on one screen.
- Opacity on cotton: 100%. Opacity on onyx: 70–80%.
- Motifs always align to the 8 px grid.

---

## 5. Layout, surface & shape

- **Grid** — 8 px base. Content max-width 1280 px. Gutters 24 px mobile / 32 px tablet / 48 px desktop.
- **Radius** — 10 px default (`--radius-md`), 16 px for cards, 24 px for hero panels, `9999px` for pills and CTAs. Avoid 4 px or smaller — too tight for the rounded wax-print feel.
- **Elevation** — shadows are warm, tinted with onyx at low alpha (`rgba(20, 17, 15, 0.08)`). Never use a pure-grey shadow.
- **Borders** — 1 px `rgba(20, 17, 15, 0.10)` on cotton surfaces; on onyx, use `rgba(246, 239, 220, 0.12)`.

---

## 6. Component direction

- **Primary CTA** — filled crimson, onyx text, 9999px radius, 28 px horizontal padding. On hover: lift 1 px + ochre inner glow.
- **Secondary CTA** — onyx outline on cotton; cotton outline on onyx. No colour fill.
- **Badges** — ochre fill with onyx text for "Verified supplier", emerald fill with cotton text for "In stock", aubergine for "Wholesale tier".
- **Price** — crimson for active price, smoke for strikethrough, ochre pill for "+ duty included".
- **Navigation (dark)** — onyx background, cotton text, indigo underline on active route, 4 px kitenge stripe at the top edge.
- **Empty state** — centred sun-burst medallion in ochre at 30% opacity, ash-tone copy, one crimson CTA.
- **Order states** — pending (ochre), confirmed (indigo), shipped (turquoise), delivered (emerald), disputed (crimson), cancelled (smoke).

---

## 7. Imagery & illustration

- **Photography** — prioritise warm natural light, visible textures (sisal, wax-print, raw cotton, wood, brass). Avoid cold studio white backgrounds — composite product shots onto cotton (`#F6EFDC`) or onyx.
- **People** — African buyers, sellers and logistics crews, shot documentary-style. No stock-photo handshakes.
- **Illustration** — flat, two-dye maximum per illustration, drawn on an 8 px grid. Always on cotton or onyx, never on white.
- **Maps** — continental maps use onyx landmass, cotton water, and dye-coloured corridor lines (per §2.6). Borders at 0.5 px in smoke.

---

## 8. Voice

Clear, direct, continentally aware. Swahili, Hausa, French, Arabic and Portuguese terms appear naturally where they're the right word ("duka", "jumia", "boda", "sokoni") — never as exoticism.

- ✅ "Pay with M-Pesa, MTN MoMo or Airtel Money."
- ✅ "Verified by KRA. Receipts issued on delivery."
- ❌ "Experience the vibrant spirit of Africa."
- ❌ "Authentic tribal commerce."

Numbers and currencies are always code-prefixed (`KES 1,240`, `NGN 45,000`) — never symbol-only — so conversion behaviour stays honest.

---

## 9. Don'ts

- Don't use pure `#000` or pure `#FFF`. Use onyx and cotton.
- Don't stack three or more dyes on a single card.
- Don't render motifs at decorative scale behind body text.
- Don't substitute neon or pastel shades to "modernise" the palette — kitenge is already modern.
- Don't crop motifs asymmetrically; they're woven, not torn.
- Don't reduce the brand to "African = orange + brown." The indigo and emerald are non-negotiable.

---

## 10. Implementation notes

The current token layer lives in [src/app/globals.css](src/app/globals.css) under the `SilkRoad` namespace (obsidian / ivory / amber / terracotta / indigo). To adopt this guide, map the existing variables as follows — no component code needs to change:

| Existing | New value |
|---|---|
| `--obsidian` | `#14110F` |
| `--ivory` | `#F6EFDC` |
| `--amber` | `#D89F2E` |
| `--terracotta` | `#B83C30` *(promoted to primary)* |
| `--indigo` | `#1F3A8A` |
| `--success` | `#1F7A5A` |
| `--danger` | `#B83C30` |

New tokens (`--kitenge-aubergine`, `--kitenge-turquoise`, `--kitenge-saffron`) should be added alongside, not as replacements.
