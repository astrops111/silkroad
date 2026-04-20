# REVIEW: Exchange Rate & Pricing Calculations

**Status:** NEEDS REVIEW BEFORE PRODUCTION
**Priority:** Critical — incorrect rates = financial loss
**Last Updated:** 2026-04-17

---

## What Needs Review

### 1. Exchange Rate Source & Freshness

**Current state:** Rates are manually seeded in `exchange_rates` table (migration 00013). No auto-update.

**Issues to resolve:**
- [ ] Choose a reliable FX rate API provider (Open Exchange Rates, CurrencyLayer, XE, or central bank feeds)
- [ ] Implement hourly cron job to update rates (`/api/cron/exchange-rates`)
- [ ] Decide: use mid-market rate, buy rate, or sell rate?
- [ ] How stale is acceptable? 1 hour? 6 hours? Real-time?
- [ ] African currency rates (GHS, NGN, KES, UGX, TZS, XOF) can be volatile — consider more frequent updates for these

### 2. FX Spread / Platform Margin

**Current state:** No spread applied. Converting at raw exchange rate = platform absorbs FX risk.

**Decisions needed:**
- [ ] Should the platform add an FX markup? (Typical B2B: 1-3%)
- [ ] Should markup be configurable per currency pair?
- [ ] Should markup be visible to buyer? ("Rate: 15.5 GHS/USD incl. 2% platform fee")
- [ ] Who absorbs rate fluctuations between order creation and payment confirmation?

**Example with 2% spread:**
```
Mid-market: 1 USD = 15.50 GHS
With 2% spread: 1 USD = 15.81 GHS (buyer pays more)
$500 order → GH₵ 7,905 instead of GH₵ 7,750
Platform keeps GH₵ 155 as FX revenue
```

### 3. Amount Representation (Minor Units)

**Current state:** All amounts stored as BIGINT in "minor units" (cents for USD, pesewas for GHS).

**Issues to verify:**
- [ ] Some African currencies have NO minor units (UGX, TZS, RWF, GNF, XOF, XAF, CDF, MWK) — 1 UGX = 1 UGX, no cents
- [ ] Current code divides by 100 for display — WRONG for these currencies
- [ ] MTN MoMo API expects whole units for UGX/TZS but cents for GHS
- [ ] Alipay uses yuan (not fen) in API calls — already handled with `/100` conversion
- [ ] Need a per-currency "decimal places" config: `{ USD: 2, GHS: 2, UGX: 0, TZS: 0, XOF: 0, CNY: 2 }`

**Fix needed in:**
- `src/lib/payments/currency.ts` — conversion logic
- `src/app/api/payments/mtn-momo/route.ts` — amount formatting
- `src/app/api/payments/airtel/route.ts` — amount formatting
- `src/app/checkout/page.tsx` — display formatting
- `src/lib/invoice/providers/africa/generic-pdf.ts` — invoice display

### 4. Payment Flow Timing & Rate Lock

**Current flow:**
```
1. Buyer sees price in USD on product page
2. At checkout, tax calculated in USD
3. On "Place Order", order created with USD amounts
4. Payment initiated — rate looked up NOW and converted
5. USSD push sent with local amount
6. Buyer confirms within ~2 minutes
7. Payment succeeds
```

**Risk:** Rate can change between step 1 (browsing) and step 4 (payment). For large B2B orders ($10K+), even a 0.5% rate move = $50 difference.

**Options to consider:**
- [ ] Lock rate at checkout (show buyer the exact local amount before they click "Pay")
- [ ] Add rate validity window (e.g., "this rate valid for 15 minutes")
- [ ] Re-quote if rate moves more than X% between order creation and payment
- [ ] Store the locked rate in the order record for audit

### 5. Settlement Currency Mismatch

**Current flow:**
```
Buyer pays GH₵ 7,750 (local currency)
Platform receives GH₵ 7,750 in MTN MoMo
Supplier is in China, expects USD or CNY payout
→ Need GHS → USD → CNY conversion for settlement
```

**Issues:**
- [ ] What currency does the platform hold funds in? (USD? Multi-currency wallets?)
- [ ] Who pays the double conversion cost? (GHS→USD→CNY = two FX fees)
- [ ] Settlement to suppliers: convert at time of payout or at time of order?
- [ ] MTN MoMo disbursement API only sends local currency — can't pay Chinese supplier via MoMo
- [ ] Need Stripe Connect or bank wire for cross-currency supplier payouts

### 6. Multi-Currency Display

**Current state:** Product prices stored with `currency` field but checkout assumes USD.

**Decisions needed:**
- [ ] Should product prices be shown in buyer's local currency on marketplace? (better UX but complex)
- [ ] Or show in seller's currency with "≈ GH₵ X,XXX" estimate? (simpler)
- [ ] Cart with items from multiple suppliers in different currencies?
- [ ] Invoice: show in order currency or local currency or both?

### 7. Rounding Rules

**Per-currency rounding:**
- USD/EUR/GBP/CNY: round to 2 decimal places
- GHS/KES/ZAR/EGP: round to 2 decimal places
- UGX/TZS/RWF/XOF/XAF: round to 0 decimal places (whole units)
- NGN: round to 2 decimal places (kobo)

**Tax rounding:** Round per-line-item or round on total? (Affects invoice accuracy)

### 8. Regulatory Considerations

- [ ] Nigeria: CBN restrictions on foreign currency transactions — may need to price in NGN only
- [ ] Ghana: Bank of Ghana FX controls — verify platform can hold/convert GHS
- [ ] Kenya: CBK reporting requirements for FX transactions above KES 1M
- [ ] China: SAFE (State Administration of Foreign Exchange) limits on cross-border payments
- [ ] CFA Franc zone (XOF/XAF): pegged to EUR at fixed rate — simpler but verify with BCEAO/BEAC

---

## Recommended Actions

1. **Immediate:** Add `currency_config` table or constant with `{ code, decimals, symbol, name }` per currency
2. **Before launch:** Integrate live FX rate API with hourly updates
3. **Before launch:** Decide FX spread policy and implement
4. **Before launch:** Fix minor-unit handling for zero-decimal currencies
5. **Before launch:** Add rate-lock at checkout with timeout
6. **Post-launch:** Monitor FX losses/gains in settlement reports

---

## Files to Update

| File | What to fix |
|---|---|
| `src/lib/payments/currency.ts` | Add decimal config, FX spread, rate lock |
| `src/app/api/payments/mtn-momo/route.ts` | Zero-decimal currency handling |
| `src/app/api/payments/airtel/route.ts` | Zero-decimal currency handling |
| `src/app/api/payments/wechat/route.ts` | Verify fen conversion |
| `src/app/api/payments/alipay/route.ts` | Verify yuan conversion |
| `src/app/checkout/page.tsx` | Show local currency estimate before payment |
| `src/lib/invoice/providers/africa/generic-pdf.ts` | Per-currency formatting |
| `src/lib/settlement/calculator.ts` | Cross-currency settlement logic |
| `supabase/migrations/00013_seed_data.sql` | Verify seeded rates are reasonable |
