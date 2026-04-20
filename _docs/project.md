# SilkRoad Africa — Bidirectional B2B China-Africa Trade Platform

## Confirmed Decisions
| Decision | Answer |
|---|---|
| African countries | All major countries (pan-Africa launch, phased by feature not geography) |
| Commission model | Adjustable per country/category (admin-configurable, not hardcoded) |
| Languages | English · 中文 · Français · Kiswahili · Português · العربية |
| Chinese UI | Yes — full 简体中文 for supplier + buyer portals |
| Company structure | Rwanda operating entity (confirmed) · Holdings TBD (Seychelles IBC tentative) |

---

## Overview

A **bidirectional** multi-tenant B2B marketplace operating two trade flows:

| Direction | Flow | Buyers | Sellers |
|---|---|---|---|
| 🇨🇳 → 🌍 **China to Africa** | Chinese manufactured goods → African markets | African businesses | Chinese factories |
| 🌍 → 🇨🇳 **Africa to China** | African natural resources & regional goods → China | Chinese importers | African producers/cooperatives |

Think: **Alibaba + Tmall Global, but purpose-built for Africa ↔ China**, with mobile money checkout, Alipay/WeChat Pay, managed customs, and direct CNY ↔ local currency settlement.

> [!IMPORTANT]
> **Major Tailwind — Zero Tariff Policy (May 2026):** China now grants **100% duty-free access** to ALL agricultural and goods exports from all 53 African countries. This eliminates 5–25% tariffs on coffee, tea, cocoa, minerals — making this the perfect time to build this platform.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      SILKROAD AFRICA PLATFORM                         │
├────────────────────────┬─────────────────────────────────────────────┤
│   🇨🇳 → 🌍 CHINA GOODS  │      🌍 → 🇨🇳 AFRICA EXPORTS                │
│   (Manufactured goods) │      (Coffee, Tea, Cocoa, Minerals...)      │
├────────────┬───────────┴──────┬──────────────┬───────────────────────┤
│AFRICAN     │ CHINESE SUPPLIER │AFRICAN       │   ADMIN PANEL          │
│BUYER PORTAL│ PORTAL (factory) │SELLER PORTAL │   (Your team)          │
├────────────┴──────────────────┴──────────────┴───────────────────────┤
│                     NEXT.JS APP (Multi-Tenant)                        │
│         Subdomain routing: buyer / supplier / seller / admin          │
├──────────────────────────────────────────────────────────────────────┤
│                       SUPABASE (PostgreSQL + RLS)                     │
├─────────────┬──────────────┬────────────────┬────────────────────────┤
│ PAYMENTS    │  LOGISTICS   │   SETTLEMENT   │   NOTIFICATIONS        │
│ Africa side │ Partner API  │  BK+WorldFirst │ Email · SMS · WhatsApp │
│ Flutterwave │ Customs docs │  → Alipay CNY  │ Africa's Talking       │
│ MTN/Airtel  │ Tracking     │                │                        │
│ Tigo/Card   │              │  China side    │                        │
│             │              │  Silkpay/Alpha │                        │
│ China side  │              │  → MTN/Airtel  │                        │
│ Alipay      │              │    payout      │                        │
│ WeChat Pay  │              │                │                        │
└─────────────┴──────────────┴────────────────┴────────────────────────┘
```

---

## Component 1: Core Infrastructure

### Tech Stack
```
Frontend:     Next.js 16 (App Router, Proxy) — multi-tenant routing
i18n:         next-intl — EN · 中文 · FR · Kiswahili · PT · AR (RTL)
Database:     Supabase (PostgreSQL) — RLS for tenant isolation
Auth:         Supabase Auth — roles: buyer, supplier, af-seller, cn-buyer, admin
Hosting:      Vercel (frontend) + Supabase (database)
Storage:      Supabase Storage — product images, lab reports, customs docs
Emails:       Resend.com — multilingual transactional emails
SMS:          Africa's Talking — pan-Africa SMS (40+ countries)
Search:       Algolia — multilingual product + commodity search
Payments AF:  Flutterwave — MTN + Airtel + Tigo + Card
Payments CN:  Silkpay / AlphaPay — Alipay + WeChat Pay
Settlement:   Bank of Kigali + WorldFirst + Alipay (Africa→China)
              Flutterwave Payout API (China→Africa)
Commission:   Custom admin engine — per-country, per-category adjustable
```

### Multi-Tenant Routing Strategy
```
yourplatform.com                  → Marketing landing page (multilingual)
buyer.yourplatform.com            → African buyer portal
supplier.yourplatform.com         → Chinese factory portal (中文)
seller.yourplatform.com           → African commodity seller portal
cnbuyer.yourplatform.com          → Chinese buyer portal (中文)
admin.yourplatform.com            → Admin dashboard
[factory-slug].yourplatform.com   → Individual factory storefront
```

---

## Component 2: Database Schema (Supabase)

```sql
-- TENANTS (Chinese factories + African producer cooperatives)
tenants (id, slug, name_en, name_zh, country, type,  -- 'supplier_cn' | 'seller_af'
         verified, plan, created_at)

-- PRODUCTS / CATALOG (Chinese manufactured goods → Africa)
products (id, tenant_id, name_en, name_zh, category, price_usd,
          moq, lead_time_days, images[], description, status,
          trade_direction)  -- 'cn_to_af'

-- COMMODITIES (African natural resources + regional goods → China)
commodities (id, tenant_id, name_en, category,  -- coffee, tea, cocoa, minerals...
             origin_country, grade, certification[],  -- organic, fair trade, rainforest
             price_usd_per_kg, min_order_kg, harvest_season,
             moisture_pct, images[], lab_reports[], status,
             trade_direction)  -- 'af_to_cn'

-- AFRICAN BUYERS (buying Chinese goods)
buyers (id, company_name, country, phone, email, preferred_lang,
        verified_kyc, credit_limit_usd, created_at)

-- CHINESE BUYERS (importing African goods)
chinese_buyers (id, company_name_zh, company_name_en,
                alipay_account, wechat_business_id,
                import_license, verified_kyc, created_at)

-- ORDERS (unified, direction-aware)
orders (id, buyer_id, buyer_type,  -- 'african_buyer' | 'chinese_buyer'
        seller_id, items[], total_usd, total_local, currency,
        trade_direction,  -- 'cn_to_af' | 'af_to_cn'
        payment_status, logistics_status, customs_status,
        tracking_number, created_at)

-- PAYMENTS
payments (id, order_id, provider,  -- flutterwave | silkpay | alphapay | wechat
          provider_ref, amount, currency, status, settled_at)

-- LOGISTICS
shipments (id, order_id, partner_id, origin_country, dest_country,
           phytosanitary_cert,  -- for agricultural exports
           customs_docs[], tracking_url, status, eta)

-- SETTLEMENTS
settlements (id, period, direction,  -- 'to_china' | 'to_africa'
             total_usd, total_cny,
             worldfirst_ref, alipay_ref,  -- for to_china
             flutterwave_ref,             -- for to_africa
             status, settled_at)

-- COMMISSION CONFIG (admin-adjustable)
commission_rules (id, country, category, trade_direction,
                  rate_percent, flat_fee_usd, active, updated_at)

-- LANGUAGES / i18n
-- Stored as JSONB columns: name_translations: {"en": "...", "zh": "...", "fr": "..."}
```

---

## Component 3: User Portals

### 🌍 African Buyer Portal (Buying Chinese Goods)
| Feature | Description |
|---|---|
| Browse catalog | Search/filter by category, country, MOQ, price |
| Supplier profiles | Verified factory details, ratings, certifications |
| Product pages | Images, specs, MOQ, lead time, sample availability |
| Cart & checkout | Multi-supplier cart, MTN/Airtel/Tigo mobile money |
| Order tracking | Real-time logistics + customs status |
| Invoice downloads | PDF invoices in buyer's language |
| Dashboard | Order history, spending analytics |
| Communication | Message Chinese supplier (translated) |
| Language | EN · FR · Kiswahili · PT · AR |

### 🏭 Chinese Supplier Portal (Selling to Africa)
| Feature | Description |
|---|---|
| Product catalog | Add/edit in 简体中文, platform auto-translates |
| Order management | View & confirm orders from African buyers |
| Sales dashboard | Revenue, order volume per African country |
| Sample management | Handle sample orders separately |
| Document upload | Factory certifications, export licenses |
| Settlement reports | CNY received via WorldFirst/Alipay |
| Communication | Message African buyers |
| Language | 简体中文 primary |

### 🌿 African Seller Portal (Selling to China)
| Feature | Description |
|---|---|
| Commodity listings | Coffee, tea, cocoa, minerals — grade, specs, photos |
| Certifications | Upload Organic, Fair Trade, Rainforest Alliance, lab reports |
| Harvest calendar | Seasonal availability to Chinese buyers |
| Sample management | Send samples before bulk orders |
| Pricing | Per-kg pricing, market-linked updates |
| Order fulfillment | Confirm orders, upload phytosanitary certificates |
| Payout dashboard | USD/local currency received via MTN or bank |
| Language | EN · FR · Kiswahili · PT · AR |

### 🇨🇳 Chinese Buyer Portal (Buying African Goods)
| Feature | Description |
|---|---|
| Browse commodities | Coffee, tea, cocoa, sesame, minerals, timber |
| Origin filter | Ethiopia, Rwanda, Kenya, Ghana, Uganda + more |
| Certifications filter | Organic, Fair Trade, Rainforest Alliance |
| Quality specs | Moisture %, bean size, cupping score (coffee) |
| Sample requests | Order samples before bulk purchase |
| Checkout | Alipay or WeChat Pay (CNY) — QR code scan |
| Shipping tracker | Sea freight container tracking |
| Import docs | Commercial invoice, phytosanitary cert, CoO |
| Language | 简体中文 primary |

### 🛠 Admin Panel (Your Team)
| Feature | Description |
|---|---|
| Tenant management | Approve/verify suppliers & sellers |
| KYC management | Verify all buyer/seller types |
| Order oversight | Full lifecycle across both trade directions |
| Logistics | Assign partners, update customs status |
| Payment reconciliation | Match payments to orders |
| Settlement triggers | Trigger BK → WorldFirst → Alipay / Flutterwave payouts |
| Commission config | Adjust rates per country/category without code deploy |
| Dispute resolution | Mediate buyer/seller disputes |
| Analytics | GMV, revenue, country breakdown, both directions |

---

## Component 4: Payment Integration

### Africa-Side — Flutterwave (MTN + Airtel + Tigo)
*Used when: African buyers pay for Chinese goods*

```javascript
// Single API — covers all networks
POST https://api.flutterwave.com/v3/charges?type=mobile_money_ghana   // AirtelTigo/MTN Ghana
POST https://api.flutterwave.com/v3/charges?type=mobile_money_rwanda   // MTN Rwanda
POST https://api.flutterwave.com/v3/charges?type=mobile_money_uganda   // MTN/Airtel Uganda
// Webhook → update order status
```

#### Coverage by Country
| Country | MTN | Airtel | Tigo | Card |
|---|---|---|---|---|
| 🇷🇼 Rwanda | ✅ | ✅ | ❌ | ✅ |
| 🇬🇭 Ghana | ✅ | ✅ (AirtelTigo) | ✅ (AirtelTigo) | ✅ |
| 🇺🇬 Uganda | ✅ | ✅ | ❌ | ✅ |
| 🇳🇬 Nigeria | ✅ | ✅ | ❌ | ✅ |
| 🇹🇿 Tanzania | ✅ | ✅ | ✅ | ✅ |
| 🇰🇪 Kenya | ✅ | ✅ | ❌ | ✅ |
| 🇿🇲 Zambia | ✅ | ✅ | ❌ | ✅ |
| 🇲🇼 Malawi | ✅ | ✅ | ❌ | ✅ |

#### Africa Payment Flow
```
1. African buyer selects Chinese products → checkout
2. Enters MTN/Airtel/Tigo phone number
3. Flutterwave sends USSD push to phone
4. Buyer approves on their phone
5. Webhook confirms → Order: "Payment Confirmed"
6. Chinese supplier notified → prepares shipment
7. Funds held in escrow until delivery confirmed
```

---

### China-Side — Alipay + WeChat Pay (via Silkpay/AlphaPay)
*Used when: Chinese buyers pay for African commodities*
*No Chinese entity required — Silkpay/AlphaPay handle compliance*

```javascript
// Silkpay API — Accept Alipay + WeChat Pay
POST https://api.silkpay.eu/v1/payment/create
{
  "method": "alipay",         // or "wechat_pay"
  "amount": 50000,            // CNY fen (500.00 CNY)
  "currency": "CNY",
  "order_id": "AFEX-2025-001",
  "description": "Rwanda AA Coffee 500kg",
  "notify_url": "https://yourplatform.com/webhook/silkpay"
}
// Returns: QR code for buyer to scan
```

#### Chinese Payment Methods
| Method | Provider | Settlement |
|---|---|---|
| **Alipay (支付宝)** | Silkpay / AlphaPay | USD |
| **WeChat Pay (微信支付)** | Silkpay / AlphaPay | USD |
| **UnionPay** | Silkpay | USD |
| **Bank T/T** | Direct SWIFT | USD |
| **Letter of Credit** | Bank partner | USD |

#### China Payment Flow
```
1. Chinese buyer browses African commodities → adds to cart
2. Checkout shows Alipay/WeChat QR code
3. Buyer scans and pays in CNY
4. Silkpay converts CNY → USD, webhook fires
5. Order: "Payment Confirmed"
6. African seller notified → prepares shipment
7. Funds in escrow until sea freight delivery confirmed
```

---

### Escrow Rules (Both Directions)
```
China→Africa goods:    Release on 48hr post-delivery (no dispute)
Africa→China bulk:     50% release on shipment departure
                       50% release on arrival confirmed
Dispute window:        48hr (goods) / 7 days (commodities)
```

---

## Component 5: Settlement

### Direction 1: Africa Collections → Chinese Suppliers
```
Flutterwave balance (USD)
        ↓ Wire transfer
Bank of Kigali Business Account (USD)
        ↓ WorldFirst ($25–$40 flat fee per transfer)
Chinese Alipay Business Account (CNY)
        ↓ Distribute to each supplier
Supplier Alipay / Chinese Bank Account
```

**Example — $1,000 China goods order:**
```
Order total:          $1,000 (paid via MTN)
Platform fee (5%):    -$50
Logistics:            -$80
Net to CN supplier:   $870 USD → CNY (~¥6,300)
Settlement fee:       $25 flat
```

---

### Direction 2: China Collections → African Sellers
```
Silkpay/AlphaPay receives CNY
        ↓ Converts CNY → USD
Platform USD account (Airwallex)
        ↓ Choose payout method:
        ├── Bank of Kigali wire (large amounts)
        ├── Flutterwave payout API → MTN/Airtel (smaller)
        └── SWIFT to seller's bank
African seller receives USD or local currency
```

**Example — 500kg Rwanda Coffee, $3,000 order:**
```
Order total:          $3,000 (paid via Alipay/WeChat CNY)
Platform fee (4%):    -$120
Sea freight:          -$250
Phyto/customs:        -$50
Net to AF seller:     $2,580 USD → RWF or USD
Payout fee:           ~$15
```

---

## Component 6: Logistics

### Flow A: China → Africa (Manufactured Goods)
```
Order Placed → MTN/Airtel Payment Confirmed → CN Supplier Notified
       ↓
Factory Prepares Goods → Optional Quality Check
       ↓
Shipped to China Consolidation Hub (your partner)
       ↓
Export Customs + Commercial Docs
       ↓
Sea / Air Freight to Africa Partner Hub
       ↓
African Import Customs Clearance
       ↓
Last Mile Delivery to African Buyer
       ↓
Delivery Confirmed → Release CNY to Chinese Supplier
```

### Flow B: Africa → China (Commodities)
```
Order Placed → Alipay/WeChat Payment → AF Seller Notified
       ↓
Seller: grading, sorting, packaging
       ↓
Lab Test / Quality Inspection
       ↓
Phytosanitary Certificate (govt authority)
       ↓
Shipped to Africa Export Hub
       ↓
African Export Customs
       ↓
Sea Freight → China Port (Guangzhou / Shanghai / Tianjin)
       ↓
Chinese Import Customs + Quarantine
       ↓
Delivery to Chinese Buyer Warehouse
       ↓
Arrival Confirmed → Release USD to African Seller
```

### Documents Generated

**China → Africa:**
- Commercial Invoice (PDF, buyer's language)
- Packing List
- Bill of Lading
- Certificate of Origin

**Africa → China:**
- Commercial Invoice
- Packing List
- Bill of Lading / Airway Bill
- **Phytosanitary Certificate** *(platform generates template, govt stamps)*
- **Certificate of Origin** *(required for zero-tariff)*
- Quality/Lab Report (moisture %, grade, cupping score)
- Health Certificate (food products)
- HS Code classification for Chinese customs

---

## Component 7: Trust & Safety

### Chinese Supplier Verification
- Business license (营业执照)
- Factory photos & video
- Export license + product certifications (CE, ISO, RoHS)
- Optional third-party factory audit (premium tier)
- Verified badge on storefront

### African Buyer Verification
- Business registration certificate
- Owner ID document
- Phone verification
- Address verification
- Tiered credit/order limits by verification level

### African Commodity Seller Verification
- Business / cooperative registration
- Country export license
- Certifications: Organic / Fair Trade / Rainforest Alliance
- Per-batch lab test reports
- Farm or processing facility photos
- Bank account verification (for payouts)

### Chinese Buyer Verification
- Chinese business license (营业执照)
- Import license for agricultural goods
- Alipay / WeChat business account verified
- WeChat ID contact verification

### Dispute Resolution
| Scenario | Window | Resolution |
|---|---|---|
| Chinese manufactured goods | 48hrs post-delivery | Photo evidence, admin mediation |
| Agricultural commodities | 7 days post-arrival | Lab re-test, partial refund |
| Logistics damage | Anytime | Insurance claim support |
| Quality mismatch | 7 days | Sample vs. batch comparison |

---

## Component 8: Phased Rollout

### Phase 1 — MVP (3–4 months)
```
✅ China → Africa marketplace (catalog, search, product pages)
✅ Chinese supplier onboarding (简体中文 UI)
✅ African buyer registration + KYC (multilingual)
✅ Flutterwave mobile money payments (pan-Africa)
✅ Basic order management
✅ Admin panel
✅ Email notifications (6 languages)
✅ Bank of Kigali → WorldFirst → Alipay settlement
✅ Adjustable commission config in admin
```
**Target:** Pan-Africa launch, 10 Chinese suppliers, 50 African buyers

### Phase 2 — Africa Exports Module (2–3 months)
```
✅ Africa → China commodity marketplace
✅ African seller onboarding (coffee, tea, cocoa, minerals)
✅ Alipay + WeChat Pay checkout (Silkpay)
✅ Chinese buyer portal (简体中文)
✅ Export/phytosanitary document templates
✅ Africa → China logistics workflow
✅ CNY → USD → African payout via Flutterwave API
✅ Commodity quality/grade filter & search (Algolia)
```
**Target:** Rwanda coffee + Kenyan tea pilot, 5 sellers, 20 Chinese buyers

### Phase 3 — Expand & Integrate (2–3 months)
```
✅ More commodities: cocoa (Ghana), sesame (Ethiopia), minerals
✅ Logistics partner API integration + container tracking
✅ WhatsApp notifications (Africa's Talking)
✅ Supplier/Seller payout dashboards
✅ Sample order system (both directions)
✅ SMS in local languages
```

### Phase 4 — Scale (ongoing)
```
✅ AI product matching (sellers ↔ buyers, both directions)
✅ Mobile app (React Native — EN / 中文 / FR)
✅ Credit / trade finance for verified buyers
✅ Live commodity price feed (coffee/tea CME market rates)
✅ Analytics & market intelligence reports (paid)
✅ Supplier audit marketplace (third-party certs)
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16 (App Router, Proxy) | Multi-tenant, SSR, i18n, React 19 |
| **i18n** | next-intl | EN · 中文 · FR · Kiswahili · PT · AR + RTL |
| **Database** | Supabase (PostgreSQL) | RLS tenant isolation, realtime |
| **Auth** | Supabase Auth | 5 roles: buyer/supplier/af-seller/cn-buyer/admin |
| **Africa Payments** | Flutterwave | MTN + Airtel + Tigo + Card, pan-Africa |
| **China Payments** | Silkpay / AlphaPay | Alipay + WeChat Pay, no CN entity needed |
| **Settlement →China** | BK + WorldFirst + Alipay | Confirmed, $25–40 flat fee |
| **Settlement →Africa** | Flutterwave Payout API | CNY → USD → MTN/Airtel |
| **Commission Engine** | Supabase + Admin UI | Per-country/category, no code deploy |
| **Storage** | Supabase Storage | Images, lab reports, customs docs |
| **Email** | Resend.com | Multilingual transactional emails |
| **SMS** | Africa's Talking | 40+ African countries |
| **WeChat Notify** | WeChat Work API | Chinese buyer notifications |
| **Search** | Algolia | Multilingual (Chinese character support) |
| **Hosting** | Vercel + Supabase | Global CDN |
| **Monitoring** | Sentry + Vercel Analytics | Error tracking |

---

## Business Model

| Revenue Stream | Direction | Detail |
|---|---|---|
| **Transaction Commission** | Both | Adjustable % per country/category |
| **Supplier/Seller Subscription** | Both | $50–200/month premium listing |
| **Logistics Margin** | Both | 10–15% markup on partner rates |
| **Featured Listings** | Both | Paid search placement |
| **Escrow Float** | Both | Interest on held funds |
| **FX Spread** | Both | Small margin on conversions |
| **Quality Inspection Fee** | Africa→China | $50–150 per commodity batch |
| **Certification Assistance** | Africa→China | Help get Organic/Fair Trade certs |
| **Market Intelligence** | Both | Paid commodity price/demand reports |

### GMV Projections
| Period | China→Africa | Africa→China | Total GMV | Revenue |
|---|---|---|---|---|
| Month 6 | $80K | $20K | $100K | ~$5K |
| Month 12 | $300K | $200K | $500K | ~$25K |
| Year 2 | $2M | $3M | $5M | ~$250K |

> Africa→China commodity orders average **$5K–$100K per order** (bulk coffee/tea shipments) vs. $200–$2K for manufactured goods. Fewer transactions but dramatically higher GMV per deal.

---

## Open Items

> [!IMPORTANT]
> **Logistics partners** — Need to confirm: (1) China consolidation/inspection hub, (2) customs clearance agents per African country, (3) sea/air freight forwarder. Platform plugs in any partner via API or manual workflow — can start manually and automate later.

> [!IMPORTANT]
> **Holdings company structure** — Rwanda operating entity confirmed. Seychelles IBC (1.5% tax rate) as holding is tentative — finalize with a tax lawyer before revenue flows.

> [!WARNING]
> **Agricultural export compliance** — Phytosanitary certificates must be issued by the official government agriculture authority in each African country. Platform generates supporting templates; licensed customs agents provide the official stamps.

> [!NOTE]
> **Language coverage** — 6 languages: Arabic needs RTL layout in Next.js. Swahili + French cover most of Sub-Saharan Africa. Chinese (Simplified) required on all China-facing pages.

---

## Verification Plan

### Automated Tests
- Africa payments: Flutterwave sandbox with MTN Rwanda test numbers
- China payments: Silkpay sandbox with Alipay test account
- Settlement →China: Bank of Kigali → WorldFirst test transfer ($100)
- Settlement →Africa: Flutterwave payout API to MTN test number
- Multi-tenancy: Verify RLS blocks cross-tenant data access
- Auth: All 5 roles (buyer / cn-buyer / supplier / af-seller / admin) isolated

### Manual E2E Tests
- **China→Africa:** Create supplier → list product → African buyer pays MTN → order processed → CNY to supplier Alipay
- **Africa→China:** Create African seller → list Rwanda coffee → Chinese buyer pays Alipay → order processed → USD payout to seller MTN/bank
- **Compliance:** Verify Flutterwave merchant agreement covers all target countries
- **Regulatory:** Confirm KYC requirements with National Bank of Rwanda
- **Commodity docs:** Test phytosanitary document upload + customs generation workflow
