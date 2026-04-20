# Product Requirements Document (PRD)
# B2B Multi-Vendor Marketplace Platform — "BUY"

**Version:** 1.0
**Date:** 2026-04-17
**Status:** Draft — Gap Analysis Against Alibaba.com B2B Platform
**Codename:** BUY

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Alibaba B2B Platform Benchmark](#2-alibaba-b2b-platform-benchmark)
3. [Platform Architecture Overview](#3-platform-architecture-overview)
4. [User Roles & Personas](#4-user-roles--personas)
5. [Module Breakdown & Gap Analysis](#5-module-breakdown--gap-analysis)
   - 5.1 Supplier Management
   - 5.2 Buyer Experience
   - 5.3 Product Catalog & Discovery
   - 5.4 Pricing & Quotation Engine
   - 5.5 Order Management
   - 5.6 Payment & Financial Services
   - 5.7 Logistics & Shipping
   - 5.8 Communication & Messaging
   - 5.9 Trust & Safety
   - 5.10 Analytics & Reporting
   - 5.11 Admin / Platform Operations
   - 5.12 Marketing & Growth
   - 5.13 API & Integrations
   - 5.14 Mobile Experience
6. [Database Schema (High-Level)](#6-database-schema-high-level)
7. [Reusable Components from Existing Ecom Project](#7-reusable-components-from-existing-ecom-project)
8. [Gap Summary Matrix](#8-gap-summary-matrix)
9. [Phased Roadmap](#9-phased-roadmap)
10. [Open Questions & Decisions Required](#10-open-questions--decisions-required)
11. [Extended Gap Analysis — Top-Tier B2B Platforms](#11-extended-gap-analysis--top-tier-b2b-platforms)

---

## 1. Executive Summary

**Vision:** Build a multi-vendor, multi-buyer B2B sales platform that provides the core trade infrastructure comparable to Alibaba.com — enabling suppliers to list products, buyers to discover and purchase in bulk, and the platform to facilitate trust, payment, logistics, and communication between parties.

**Core Value Proposition:**
- Suppliers get a digital storefront, buyer traffic, and trade tools
- Buyers get product discovery, verified suppliers, competitive pricing, and purchasing infrastructure
- Platform earns revenue through commissions, subscriptions, and value-added services

**Benchmark:** Alibaba.com (international B2B), 1688.com (domestic China B2B)

---

## 2. Alibaba B2B Platform Benchmark

### What Alibaba.com Offers (Feature Map)

| Category | Alibaba Features |
|---|---|
| **Supplier Storefronts** | Customizable mini-sites per supplier, company profile, product showcase, certifications, factory tour videos, response time badges |
| **Product Catalog** | 200M+ products, deep category taxonomy (5+ levels), product attributes/specs matrix, image/video galleries, related products |
| **Search & Discovery** | AI-powered search, filters (MOQ, price range, supplier location, certifications), category browsing, "Top Ranking" algorithm |
| **Pricing** | Tiered pricing (volume discounts), RFQ system, negotiated pricing, "Get Latest Price" CTA, price visibility controls |
| **RFQ (Request for Quotation)** | Buyer posts requirements → multiple suppliers respond with quotes → buyer compares and selects. AI-matched supplier suggestions |
| **Trade Assurance** | Escrow-based payment protection, on-time shipment guarantee, product quality guarantee, refund policy, dispute resolution |
| **Payment** | T/T (bank transfer), L/C (letter of credit), credit card, e-checking, Western Union, Alibaba.com Pay, payment terms (Net 30/60/90) |
| **Logistics** | Alibaba Freight (ocean, air, express), door-to-door, container booking, customs clearance, shipment tracking, logistics insurance |
| **Messaging** | Built-in chat (TradeManager), real-time messaging, file/image sharing, translation, read receipts, inquiry management |
| **Verification** | Verified Supplier (SGS/BV audit), Gold Supplier (paid tier), Trade Assurance badge, business license verification, factory inspection reports |
| **Reviews & Ratings** | Supplier ratings (transaction level), product reviews, response rate, on-time delivery rate, dispute rate |
| **Buyer Tools** | Favorites/wishlists, purchase history, reorder, RFQ management, supplier comparison, import dashboard |
| **Supplier Tools** | Product listing manager, inquiry inbox, quotation templates, analytics dashboard, keyword ads, traffic reports |
| **Marketing** | Keyword advertising (P4P), premium placement, industry showcases, trade shows (Canton Fair integration), sourcing events |
| **Mobile** | Full native app (iOS/Android), mobile-optimized web, push notifications, scan-to-order |
| **API/Integration** | Open API for ERP integration, bulk product upload (CSV/Excel), order API, logistics API |
| **Financial Services** | Trade finance, working capital loans, buyer credit, forex tools |
| **Compliance** | Export/import documentation, HS code lookup, customs compliance, product certification tracking |

---

## 3. Platform Architecture Overview

### Proposed Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router, Proxy, React 19), TypeScript | Reuse from ecom |
| UI | Tailwind CSS + shadcn/ui | Component library |
| State | Zustand | Client state |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) | Reuse from ecom |
| Real-time | Supabase Realtime / WebSockets | For messaging, notifications |
| Search | Supabase Full-Text Search → Meilisearch/Typesense (Phase 2) | Upgrade path for scale |
| Payments | TapPay (Taiwan) + Stripe (International) | Multi-provider |
| File Storage | Supabase Storage + CDN | Product images, documents |
| Email | Resend | Transactional + marketing |
| Messaging | LINE OA / LIFF + In-platform chat | Hybrid |
| i18n | next-intl | zh-TW primary |
| Hosting | Vercel + Supabase Cloud | ap-northeast-1 |
| AI | Claude API / OpenAI | Product matching, RFQ, search |

### Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                    PLATFORM LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Buyer    │  │ Supplier │  │ Admin    │  │ Public  │ │
│  │ Portal   │  │ Portal   │  │ Panel    │  │ Catalog │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│  ┌────┴──────────────┴──────────────┴──────────────┴───┐ │
│  │                   API LAYER                          │ │
│  │  Auth │ Products │ Orders │ RFQ │ Chat │ Payments   │ │
│  └────┬─────────────────────────────────────────────┬──┘ │
│       │                                             │    │
│  ┌────┴─────────────┐  ┌───────────────────────────┴──┐ │
│  │   Core Services  │  │     External Integrations    │ │
│  │  ─────────────── │  │  ────────────────────────    │ │
│  │  User Management │  │  Payment Gateways            │ │
│  │  Product Engine  │  │  Logistics Providers          │ │
│  │  Order Engine    │  │  E-Invoice (MIG)              │ │
│  │  RFQ Engine      │  │  Notification (LINE, Email)   │ │
│  │  Chat Engine     │  │  AI Services                  │ │
│  │  Search Engine   │  │  ERP Connectors               │ │
│  │  Trust Engine    │  │  Customs/Compliance            │ │
│  └────┬─────────────┘  └──────────────────────────────┘ │
│       │                                                  │
│  ┌────┴──────────────────────────────────────────────┐   │
│  │              DATA LAYER (Supabase)                 │   │
│  │  PostgreSQL │ Auth │ Storage │ Realtime │ Edge Fn  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. User Roles & Personas

### 4.1 Buyer

| Attribute | Description |
|---|---|
| **Who** | Businesses purchasing products in bulk (retailers, distributors, manufacturers needing raw materials) |
| **Goals** | Find reliable suppliers, compare prices, negotiate terms, place bulk orders, track shipments |
| **Account Level** | Free account → Verified Buyer (with business docs) → Premium Buyer (credit terms) |

**Buyer Sub-Roles:**
- **Purchasing Manager** — Full order authority, budget approval
- **Procurement Staff** — Can browse, create RFQs, draft orders (needs approval)
- **Finance** — Payment processing, invoice management
- **Viewer** — Browse only (for stakeholder review)

### 4.2 Supplier

| Attribute | Description |
|---|---|
| **Who** | Manufacturers, wholesalers, trading companies listing products for sale |
| **Goals** | Get buyer traffic, manage product catalog, respond to inquiries/RFQs, fulfill orders, grow revenue |
| **Account Level** | Free Supplier → Standard (paid) → Gold Supplier (premium) → Verified Supplier (audited) |

**Supplier Sub-Roles:**
- **Owner/Admin** — Full account control, billing, team management
- **Sales Manager** — Inquiry response, quotation, order management
- **Catalog Manager** — Product listing, images, pricing
- **Warehouse Staff** — Order fulfillment, shipment updates

### 4.3 Platform Admin

| Attribute | Description |
|---|---|
| **Who** | Platform operations team |
| **Goals** | Moderate content, verify suppliers, resolve disputes, monitor platform health, manage revenue |
| **Access Level** | Super Admin → Moderator → Support Agent → Analyst |

---

## 5. Module Breakdown & Gap Analysis

Legend:
- **[ALIBABA]** = Feature Alibaba has
- **[GAP]** = Not in our current ecom project — must be built from scratch
- **[PARTIAL]** = Exists in ecom but needs significant modification for B2B
- **[REUSE]** = Can be ported from ecom with minor changes

---

### 5.1 Supplier Management

#### 5.1.1 Supplier Registration & Onboarding

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Business registration form (company name, type, size, industry) | Yes | **[GAP]** | P0 |
| Business license upload & verification | Yes | **[GAP]** | P0 |
| Tax ID / 統一編號 verification | Yes | **[PARTIAL]** — ecom has tax ID for invoices | P0 |
| Product category selection during signup | Yes | **[GAP]** | P0 |
| Bank account verification | Yes | **[GAP]** | P1 |
| Factory/warehouse address & details | Yes | **[GAP]** | P1 |
| Contact person management (multiple) | Yes | **[GAP]** | P1 |
| Onboarding wizard / guided setup | Yes | **[GAP]** | P1 |
| Profile completion score | Yes | **[GAP]** | P2 |
| Factory tour video upload | Yes | **[GAP]** | P3 |

#### 5.1.2 Supplier Storefront

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Customizable company profile page | Yes — full mini-site | **[GAP]** | P0 |
| Company overview (about, history, capacity) | Yes | **[GAP]** | P0 |
| Product showcase on storefront | Yes | **[GAP]** | P0 |
| Company logo & banner | Yes | **[GAP]** | P0 |
| Certification badges display | Yes | **[GAP]** | P1 |
| Response rate & time badge | Yes | **[GAP]** | P1 |
| Transaction history badge | Yes | **[GAP]** | P2 |
| Custom storefront themes | Yes | **[GAP]** | P3 |
| SEO-optimized supplier URLs | Yes | **[GAP]** | P1 |

#### 5.1.3 Supplier Tiers & Subscription

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Free tier (basic listing, limited products) | Yes | **[GAP]** | P0 |
| Paid tier — Standard (more products, analytics) | Yes — Gold Supplier | **[GAP]** | P1 |
| Paid tier — Premium (priority placement, badges) | Yes — Gold+ | **[GAP]** | P2 |
| Verified Supplier (third-party audit) | Yes — SGS/BV | **[GAP]** | P2 |
| Tier comparison page | Yes | **[GAP]** | P1 |
| Subscription billing (monthly/annual) | Yes | **[GAP]** | P1 |
| Grace period & downgrade handling | Yes | **[GAP]** | P2 |

#### 5.1.4 Supplier Dashboard

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Sales overview (revenue, orders, conversion) | Yes | **[GAP]** | P0 |
| Inquiry/RFQ inbox | Yes | **[GAP]** | P0 |
| Product performance (views, clicks, inquiries) | Yes | **[GAP]** | P1 |
| Buyer traffic analytics | Yes | **[GAP]** | P1 |
| Payout/settlement summary | Yes | **[PARTIAL]** — ecom has affiliate payouts | P0 |
| Action items / to-do list | Yes | **[GAP]** | P2 |
| Account health score | Yes | **[GAP]** | P2 |

---

### 5.2 Buyer Experience

#### 5.2.1 Buyer Registration & Profiles

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Email/password registration | Yes | **[REUSE]** | P0 |
| Social login (LINE, Google) | Yes | **[PARTIAL]** — ecom has LINE LIFF | P0 |
| Company profile (for verified buyers) | Yes | **[GAP]** | P1 |
| Business verification | Yes | **[GAP]** | P1 |
| Multi-user company accounts | Yes | **[GAP]** | P1 |
| Role-based permissions within company | Yes | **[GAP]** | P1 |
| Purchase approval workflows | Yes | **[GAP]** | P2 |

#### 5.2.2 Buyer Dashboard

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Order history & tracking | Yes | **[PARTIAL]** — ecom has basic order history | P0 |
| RFQ management (sent, received quotes) | Yes | **[GAP]** | P0 |
| Favorite suppliers & products | Yes | **[GAP]** | P0 |
| Reorder from past purchases | Yes | **[GAP]** | P1 |
| Spending analytics | Yes | **[GAP]** | P2 |
| Supplier comparison tool | Yes | **[GAP]** | P2 |
| Import/customs dashboard | Yes | **[GAP]** | P3 |

---

### 5.3 Product Catalog & Discovery

#### 5.3.1 Product Listing

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Multi-vendor product listings | Yes | **[GAP]** — ecom is single-vendor | P0 |
| Product title, description, specs | Yes | **[REUSE]** | P0 |
| Image gallery (multiple images per product) | Yes | **[REUSE]** | P0 |
| Video upload for products | Yes | **[GAP]** | P2 |
| Product variants (size, color, material) | Yes | **[REUSE]** | P0 |
| SKU management per variant | Yes | **[REUSE]** | P0 |
| Minimum Order Quantity (MOQ) | Yes | **[GAP]** | P0 |
| Tiered/volume pricing table | Yes | **[GAP]** | P0 |
| Lead time / production time | Yes | **[GAP]** | P0 |
| Customization options (OEM/ODM flags) | Yes | **[GAP]** | P1 |
| Sample availability & pricing | Yes | **[GAP]** | P1 |
| Product certifications (CE, FDA, etc.) | Yes | **[GAP]** | P1 |
| HS code / tariff classification | Yes | **[GAP]** | P2 |
| FOB / CIF / EXW pricing terms | Yes | **[GAP]** | P1 |
| Packaging details | Yes | **[GAP]** | P2 |
| Bulk product upload (CSV/Excel) | Yes | **[GAP]** | P1 |
| Product status (active, draft, out of stock) | Yes | **[REUSE]** | P0 |
| Product approval workflow (admin review) | Yes | **[GAP]** | P0 |

#### 5.3.2 Category Taxonomy

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Multi-level category hierarchy (5+ levels) | Yes — thousands of categories | **[GAP]** — ecom has flat categories | P0 |
| Category-specific attribute templates | Yes | **[GAP]** | P1 |
| Industry-based grouping | Yes | **[GAP]** | P1 |
| Category landing pages | Yes | **[GAP]** | P2 |
| Trending categories | Yes | **[GAP]** | P2 |

#### 5.3.3 Search & Filtering

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Full-text product search | Yes — AI-powered | **[GAP]** | P0 |
| Category filter | Yes | **[PARTIAL]** | P0 |
| Price range filter | Yes | **[GAP]** | P0 |
| MOQ range filter | Yes | **[GAP]** | P0 |
| Supplier location filter | Yes | **[GAP]** | P0 |
| Supplier type filter (manufacturer, trader) | Yes | **[GAP]** | P1 |
| Certification filter | Yes | **[GAP]** | P1 |
| Verified supplier filter | Yes | **[GAP]** | P1 |
| Sort by (relevance, price, orders, newest) | Yes | **[GAP]** | P0 |
| Image search (upload image to find product) | Yes | **[GAP]** | P3 |
| Search autocomplete & suggestions | Yes | **[GAP]** | P1 |
| Recent & saved searches | Yes | **[GAP]** | P2 |
| "Similar products" recommendation | Yes | **[GAP]** | P2 |

---

### 5.4 Pricing & Quotation Engine

#### 5.4.1 Pricing Models

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Fixed price per unit | Yes | **[REUSE]** | P0 |
| Tiered pricing (quantity brackets) | Yes | **[GAP]** | P0 |
| Negotiable price ("Contact for price") | Yes | **[GAP]** | P0 |
| FOB / CIF / EXW / DDP trade terms | Yes | **[GAP]** | P1 |
| Currency support (TWD, USD, others) | Yes | **[GAP]** — ecom is TWD only | P1 |
| Price visibility controls (show/hide/login-only) | Yes | **[GAP]** | P1 |

#### 5.4.2 RFQ (Request for Quotation) System

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Buyer creates RFQ (product, quantity, specs, deadline) | Yes | **[GAP]** | P0 |
| RFQ category & keyword matching to suppliers | Yes — AI-matched | **[GAP]** | P0 |
| Supplier receives RFQ notification | Yes | **[GAP]** | P0 |
| Supplier submits quotation (price, MOQ, lead time, terms) | Yes | **[GAP]** | P0 |
| Buyer receives & compares multiple quotes | Yes | **[GAP]** | P0 |
| Buyer accepts/rejects/counters quote | Yes | **[GAP]** | P0 |
| Quote validity period | Yes | **[GAP]** | P1 |
| RFQ templates (reusable) | Yes | **[GAP]** | P2 |
| RFQ status tracking (open, quoted, awarded, expired) | Yes | **[GAP]** | P0 |
| Anonymous RFQ option (hide buyer identity) | Yes | **[GAP]** | P2 |
| AI-suggested pricing for suppliers | Yes — newer feature | **[GAP]** | P3 |

#### 5.4.3 Quotation Management

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Quotation builder (itemized line items) | Yes | **[GAP]** | P0 |
| Quotation PDF export | Yes | **[GAP]** | P1 |
| Quotation versioning (revisions) | Yes | **[GAP]** | P1 |
| Quotation templates for suppliers | Yes | **[GAP]** | P2 |
| Quote-to-order conversion | Yes | **[GAP]** | P0 |

---

### 5.5 Order Management

#### 5.5.1 Order Flow

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Cart / multi-supplier cart | Yes | **[GAP]** — ecom cart is single-vendor | P0 |
| Split orders by supplier at checkout | Yes | **[GAP]** | P0 |
| Order creation from accepted quotation | Yes | **[GAP]** | P0 |
| Order creation from catalog (direct buy) | Yes | **[PARTIAL]** | P0 |
| Sample order flow (small qty, different pricing) | Yes | **[GAP]** | P1 |
| Purchase order (PO) generation | Yes | **[GAP]** | P0 |
| Order confirmation by supplier | Yes | **[GAP]** | P0 |
| Order modification (before production) | Yes | **[GAP]** | P1 |
| Order cancellation with reason | Yes | **[PARTIAL]** | P0 |
| Partial fulfillment / split shipments | Yes | **[GAP]** | P1 |

#### 5.5.2 Order Status & Tracking

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Order status pipeline | Yes | **[PARTIAL]** — ecom has 9 states but B2C-oriented | P0 |
| B2B order states: Draft → Confirmed → In Production → QC → Shipped → Delivered → Completed | Yes | **[GAP]** | P0 |
| Supplier updates status with notes | Yes | **[GAP]** | P0 |
| Buyer receives status notifications | Yes | **[PARTIAL]** | P0 |
| Shipment tracking integration | Yes | **[PARTIAL]** — ecom has ECPay tracking | P1 |
| Delivery confirmation by buyer | Yes | **[GAP]** | P1 |
| Proof of delivery (photo/signature) | Yes | **[GAP]** | P2 |

#### 5.5.3 Contracts & Agreements

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Digital purchase agreement / contract | Yes — Trade Assurance | **[GAP]** | P1 |
| Terms & conditions per order | Yes | **[GAP]** | P1 |
| E-signature support | Yes | **[GAP]** | P2 |
| Contract template library | Yes | **[GAP]** | P2 |

---

### 5.6 Payment & Financial Services

#### 5.6.1 Payment Methods

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Credit card payment | Yes | **[REUSE]** — TapPay | P0 |
| Bank transfer (T/T) | Yes | **[GAP]** | P0 |
| Platform escrow (pay to platform, release to supplier) | Yes — Trade Assurance | **[GAP]** | P0 |
| LINE Pay | Yes (regional) | **[REUSE]** | P1 |
| Payment terms — Net 30/60/90 | Yes | **[GAP]** | P1 |
| Letter of Credit (L/C) | Yes | **[GAP]** | P3 |
| Milestone / progress payments | Yes | **[GAP]** | P2 |
| Multi-currency support | Yes | **[GAP]** | P2 |
| Deposit + balance payment | Yes | **[GAP]** | P1 |

#### 5.6.2 Escrow / Trade Assurance

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Buyer pays to escrow → platform holds funds | Yes | **[GAP]** | P1 |
| Release on delivery confirmation | Yes | **[GAP]** | P1 |
| Automatic release after X days | Yes | **[GAP]** | P1 |
| Dispute-triggered hold | Yes | **[GAP]** | P1 |
| Partial release (milestone-based) | Yes | **[GAP]** | P2 |

#### 5.6.3 Supplier Settlements

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Settlement schedule (weekly/bi-weekly/monthly) | Yes | **[GAP]** | P0 |
| Commission deduction at settlement | Yes | **[GAP]** | P0 |
| Settlement reports / statements | Yes | **[GAP]** | P0 |
| Payout to supplier bank account | Yes | **[PARTIAL]** — ecom has offline payout | P0 |
| Tax withholding / invoice requirements | Yes | **[PARTIAL]** — ecom has e-invoice | P1 |
| Platform fee transparency | Yes | **[GAP]** | P0 |

#### 5.6.4 Financial Services

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Buyer credit / financing | Yes | **[GAP]** | P3 |
| Supplier working capital loans | Yes | **[GAP]** | P3 |
| Forex tools | Yes | **[GAP]** | P3 |
| Insurance (cargo, trade) | Yes | **[GAP]** | P3 |

---

### 5.7 Logistics & Shipping

#### 5.7.1 Shipping Management

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Supplier enters tracking number | Yes | **[PARTIAL]** | P0 |
| Multiple carrier support | Yes | **[GAP]** — ecom is ECPay only | P1 |
| Domestic shipping (Taiwan carriers) | Yes (regional) | **[PARTIAL]** — ECPay logistics | P0 |
| International freight (ocean/air) | Yes — Alibaba Freight | **[GAP]** | P2 |
| Shipping cost calculator | Yes | **[GAP]** | P1 |
| Shipping label generation | Yes | **[GAP]** | P2 |
| Customs documentation | Yes | **[GAP]** | P3 |
| Container booking | Yes | **[GAP]** | P3 |
| Freight forwarder directory | Yes | **[GAP]** | P3 |

#### 5.7.2 Delivery & Fulfillment

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Delivery address management (buyer) | Yes | **[REUSE]** | P0 |
| Multiple delivery addresses per order | Yes | **[GAP]** | P2 |
| Warehouse/factory ship-from address (supplier) | Yes | **[GAP]** | P0 |
| Estimated delivery date | Yes | **[GAP]** | P1 |
| Delivery confirmation | Yes | **[GAP]** | P1 |

---

### 5.8 Communication & Messaging

#### 5.8.1 In-Platform Messaging

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| 1-to-1 chat (buyer ↔ supplier) | Yes — TradeManager | **[GAP]** | P0 |
| Real-time messaging (WebSocket) | Yes | **[GAP]** — Supabase Realtime available | P0 |
| File/image sharing in chat | Yes | **[GAP]** | P0 |
| Chat history persistence | Yes | **[GAP]** | P0 |
| Unread message count / badges | Yes | **[GAP]** | P0 |
| Chat from product page ("Contact Supplier") | Yes | **[GAP]** | P0 |
| Auto-translation | Yes | **[GAP]** | P3 |
| Inquiry templates | Yes | **[GAP]** | P2 |
| Chat-to-order conversion | Yes | **[GAP]** | P2 |
| Read receipts | Yes | **[GAP]** | P2 |
| Typing indicators | Yes | **[GAP]** | P3 |
| Chat search | Yes | **[GAP]** | P2 |

#### 5.8.2 Notifications

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Email notifications (order, RFQ, message) | Yes | **[PARTIAL]** — Resend setup exists | P0 |
| In-app notification center | Yes | **[GAP]** | P0 |
| LINE push notifications | Yes (regional) | **[PARTIAL]** — ecom has LINE integration | P1 |
| Push notifications (web/mobile) | Yes | **[GAP]** | P2 |
| Notification preferences / controls | Yes | **[GAP]** | P1 |
| Digest emails (daily/weekly summary) | Yes | **[GAP]** | P2 |

---

### 5.9 Trust & Safety

#### 5.9.1 Supplier Verification

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Business license verification | Yes | **[GAP]** | P0 |
| Identity verification (owner/contact) | Yes | **[GAP]** | P1 |
| Third-party audit (SGS, BV equivalent) | Yes — Verified Supplier | **[GAP]** | P3 |
| Verification badges on profile | Yes | **[GAP]** | P1 |
| Annual re-verification | Yes | **[GAP]** | P2 |

#### 5.9.2 Reviews & Ratings

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Buyer reviews supplier (per transaction) | Yes | **[GAP]** — ecom has product reviews | P0 |
| Rating dimensions (quality, communication, shipping) | Yes | **[GAP]** | P0 |
| Supplier response to reviews | Yes | **[GAP]** | P1 |
| Overall supplier score (aggregated) | Yes | **[GAP]** | P0 |
| Review verification (only verified buyers) | Yes | **[GAP]** | P1 |
| Product-level reviews | Yes | **[PARTIAL]** | P1 |

#### 5.9.3 Dispute Resolution

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Dispute filing (buyer initiates) | Yes | **[GAP]** | P1 |
| Evidence submission (photos, docs, chat logs) | Yes | **[GAP]** | P1 |
| Supplier response to dispute | Yes | **[GAP]** | P1 |
| Platform mediation | Yes | **[GAP]** | P1 |
| Refund processing via dispute | Yes | **[GAP]** | P1 |
| Dispute escalation workflow | Yes | **[GAP]** | P2 |
| Dispute history & analytics | Yes | **[GAP]** | P2 |

#### 5.9.4 Content Moderation

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Product listing review queue | Yes | **[GAP]** | P0 |
| Prohibited product detection | Yes | **[GAP]** | P1 |
| Intellectual property (IP) reporting | Yes | **[GAP]** | P2 |
| Spam/fraud detection | Yes | **[GAP]** | P2 |
| Supplier account suspension | Yes | **[GAP]** | P0 |

---

### 5.10 Analytics & Reporting

#### 5.10.1 Platform Analytics (Admin)

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| GMV (Gross Merchandise Volume) dashboard | Yes | **[GAP]** | P0 |
| Active buyers & suppliers metrics | Yes | **[GAP]** | P0 |
| Revenue & commission reports | Yes | **[GAP]** | P0 |
| Top products / categories | Yes | **[GAP]** | P1 |
| Conversion funnel (visit → inquiry → order) | Yes | **[GAP]** | P1 |
| Supplier health metrics | Yes | **[GAP]** | P2 |
| Dispute rate tracking | Yes | **[GAP]** | P2 |

#### 5.10.2 Supplier Analytics

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Product views / impressions | Yes | **[GAP]** | P1 |
| Inquiry-to-order conversion | Yes | **[GAP]** | P1 |
| Revenue & order trends | Yes | **[GAP]** | P0 |
| Buyer demographics | Yes | **[GAP]** | P2 |
| Keyword performance (search terms) | Yes | **[GAP]** | P2 |
| Competitor benchmarking | Yes | **[GAP]** | P3 |

#### 5.10.3 Buyer Analytics

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Purchase history & spend reports | Yes | **[GAP]** | P1 |
| Supplier performance tracking | Yes | **[GAP]** | P2 |
| Budget vs. actual spending | Yes | **[GAP]** | P3 |

---

### 5.11 Admin / Platform Operations

#### 5.11.1 Admin Dashboard

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Platform KPIs overview | Yes | **[PARTIAL]** — ecom has basic admin dashboard | P0 |
| Supplier approval queue | Yes | **[GAP]** | P0 |
| Product moderation queue | Yes | **[GAP]** | P0 |
| Dispute management | Yes | **[GAP]** | P1 |
| User management (buyers + suppliers) | Yes | **[PARTIAL]** — ecom has customer management | P0 |
| Category management | Yes | **[PARTIAL]** | P0 |
| Commission / fee configuration | Yes | **[GAP]** | P0 |
| Platform settings | Yes | **[PARTIAL]** | P0 |
| Content management (banners, featured) | Yes | **[GAP]** | P1 |
| Audit logs | Yes | **[GAP]** | P2 |
| Bulk operations (approve, reject, suspend) | Yes | **[GAP]** | P1 |

---

### 5.12 Marketing & Growth

#### 5.12.1 Supplier Marketing Tools

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Promoted / sponsored product listings | Yes — P4P (Pay for Performance) | **[GAP]** | P2 |
| Keyword advertising | Yes | **[GAP]** | P2 |
| Featured supplier placement | Yes | **[GAP]** | P2 |
| Coupon / promotion creation (supplier-level) | Yes | **[GAP]** — ecom coupons are platform-level | P1 |
| Flash deals / limited-time offers | Yes | **[GAP]** | P2 |

#### 5.12.2 Platform Marketing

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Homepage featured products / suppliers | Yes | **[GAP]** | P0 |
| Category spotlight sections | Yes | **[GAP]** | P1 |
| Sourcing events / campaigns | Yes — Super September, etc. | **[GAP]** | P3 |
| Newsletter / email marketing | Yes | **[REUSE]** | P1 |
| SEO-optimized product/category pages | Yes | **[GAP]** | P1 |
| Referral program (buyer-to-buyer, supplier-to-supplier) | Yes | **[PARTIAL]** — ecom has affiliate system | P2 |

---

### 5.13 API & Integrations

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| REST API for order management | Yes | **[GAP]** | P1 |
| Product listing API (bulk operations) | Yes | **[GAP]** | P1 |
| Webhook events (order, payment, shipment) | Yes | **[PARTIAL]** — ecom has TapPay webhooks | P1 |
| ERP integration (SAP, Oracle, etc.) | Yes | **[GAP]** | P2 |
| Accounting software integration | Yes | **[GAP]** | P2 |
| CSV/Excel import-export | Yes | **[GAP]** | P1 |
| API key management | Yes | **[GAP]** | P1 |
| API documentation portal | Yes | **[GAP]** | P2 |

---

### 5.14 Mobile Experience

| Feature | Alibaba | Status | Priority |
|---|---|---|---|
| Responsive web (mobile-optimized) | Yes | **[PARTIAL]** — ecom is responsive | P0 |
| Progressive Web App (PWA) | Yes | **[GAP]** | P1 |
| Native mobile app (iOS/Android) | Yes | **[GAP]** | P3 |
| Mobile-optimized chat | Yes | **[GAP]** | P1 |
| Push notifications (mobile) | Yes | **[GAP]** | P2 |
| Barcode/QR scanner | Yes | **[GAP]** | P3 |

---

## 6. Database Schema (High-Level)

### New Tables Required (Beyond Ecom)

```
# Company / Organization Layer
companies                    # Buyer and supplier company profiles
company_members              # Users belonging to a company + roles
company_verifications        # Business license, ID verification records
company_documents            # Uploaded certifications, licenses

# Supplier Layer
supplier_profiles            # Extended supplier info (factory, capacity, MOQ defaults)
supplier_tiers               # Free / Standard / Gold / Verified tier definitions
supplier_subscriptions       # Active subscription per supplier
supplier_stats               # Cached metrics (response rate, on-time rate, rating)

# Enhanced Product Layer
product_categories           # Deep hierarchy (parent_id, level, path)
category_attributes          # Per-category attribute templates
product_attributes           # Key-value specs per product
product_pricing_tiers        # Volume discount brackets per product
product_certifications       # CE, FDA, ISO per product
product_moderation_queue     # Admin approval workflow

# RFQ Layer
rfqs                         # Buyer-created requests for quotation
rfq_items                    # Line items within an RFQ
rfq_attachments              # Files attached to RFQ
quotations                   # Supplier responses to RFQs
quotation_items              # Line items within a quotation
quotation_revisions          # Version history of quotations

# Enhanced Order Layer
purchase_orders              # B2B orders (extends ecom orders concept)
po_items                     # Line items
po_shipments                 # Multiple shipments per order
po_payments                  # Multiple payments per order (deposit + balance)
po_status_history            # Full audit trail of status changes

# Payment Layer
escrow_transactions          # Platform-held funds
settlement_records           # Supplier payouts
platform_commissions         # Commission per transaction
payment_terms_agreements     # Net-30/60/90 terms per buyer-supplier

# Communication Layer
conversations                # Chat threads (buyer ↔ supplier)
messages                     # Individual messages
message_attachments          # Files in messages
inquiries                    # Product inquiries (pre-chat)

# Trust Layer
supplier_reviews             # Buyer reviews of suppliers
review_dimensions            # Quality, communication, shipping scores
disputes                     # Dispute records
dispute_evidence             # Uploaded evidence
dispute_resolutions          # Mediation outcomes

# Analytics Layer
product_views                # View tracking
search_logs                  # Search query tracking
conversion_events            # Funnel tracking

# Marketing Layer  
promoted_listings            # Paid product placements
supplier_coupons             # Supplier-created promotions
featured_content             # Homepage / category spotlights

# Notification Layer
notification_preferences     # Per-user notification settings
notifications                # In-app notifications (extends ecom)
```

### Tables Reusable from Ecom (with modifications)

```
user_profiles          → Add company_id FK, B2B role fields
products               → Add supplier_id FK, MOQ, lead_time, trade_terms
product_variants       → Add bulk pricing fields
orders                 → Extend for B2B states, PO reference
order_items            → Add supplier_id for multi-vendor split
payments               → Add escrow fields, payment terms
shipments              → Add multi-carrier support
coupons                → Add supplier_id for supplier-created coupons
addresses              → Reuse as-is
invoices               → Add B2B invoice types
newsletter_subscribers → Reuse as-is
```

---

## 7. Reusable Components from Existing Ecom Project

| Ecom Component | Reuse Level | Modification Needed |
|---|---|---|
| **Auth (Supabase)** | High | Add company/org layer, role-based access |
| **Product listing UI** | Medium | Add MOQ, tiered pricing, supplier badge, bulk upload |
| **Product detail page** | Medium | Add "Contact Supplier", RFQ button, tiered pricing table |
| **Shopping cart** | Medium | Multi-vendor cart split, MOQ validation |
| **Checkout flow** | Low | Complete rebuild for B2B (PO, payment terms, multi-address) |
| **Order management** | Medium | New status pipeline, supplier confirmation step |
| **TapPay integration** | High | Add escrow wrapper |
| **ECPay logistics** | Medium | Add multi-carrier abstraction |
| **E-invoice (MIG)** | High | Add B2B invoice types |
| **Admin sidebar/layout** | High | Extend with new menu items |
| **Admin product CRUD** | Medium | Add moderation queue, supplier assignment |
| **Admin order list** | Medium | Add supplier filter, split view |
| **Customer management** | Medium | Split into buyer/supplier management |
| **Coupon system** | Medium | Add supplier-level coupons |
| **Affiliate system** | Low | Rethink as supplier referral or buyer acquisition |
| **Newsletter/email** | High | Reuse with B2B templates |
| **i18n setup** | High | Reuse, expand translations |
| **Zustand stores** | Medium | Extend for multi-vendor cart, RFQ state |
| **CSS/dark mode** | High | Reuse design tokens |
| **Supabase client setup** | High | Reuse all client configurations |

---

## 8. Gap Summary Matrix

### Feature Coverage: BUY Platform vs. Alibaba.com

| Module | Total Features | [REUSE] | [PARTIAL] | [GAP] | Coverage |
|---|---|---|---|---|---|
| Supplier Management | 30 | 0 | 1 | 29 | 3% |
| Buyer Experience | 14 | 1 | 2 | 11 | 21% |
| Product Catalog | 30 | 5 | 2 | 23 | 23% |
| Pricing & Quotation | 22 | 1 | 0 | 21 | 5% |
| Order Management | 19 | 0 | 4 | 15 | 21% |
| Payment & Finance | 18 | 2 | 2 | 14 | 22% |
| Logistics & Shipping | 12 | 1 | 2 | 9 | 25% |
| Communication | 18 | 0 | 2 | 16 | 11% |
| Trust & Safety | 16 | 0 | 1 | 15 | 6% |
| Analytics | 14 | 0 | 0 | 14 | 0% |
| Admin | 11 | 0 | 3 | 8 | 27% |
| Marketing | 11 | 1 | 1 | 9 | 18% |
| API & Integrations | 8 | 0 | 1 | 7 | 13% |
| Mobile | 6 | 0 | 1 | 5 | 17% |
| **TOTAL** | **229** | **11** | **22** | **196** | **14%** |

### Key Takeaway

**196 features (86%) are net-new** and need to be built from scratch. Only 14% of Alibaba's feature set has overlap with the existing ecom project. The biggest gaps are in:

1. **RFQ/Quotation Engine** — entirely new, core B2B differentiator
2. **Supplier Management** — multi-vendor infrastructure doesn't exist
3. **Trust & Safety** — verification, disputes, escrow
4. **Communication** — real-time messaging system
5. **Analytics** — no B2B analytics exist

---

## 9. Phased Roadmap

### Phase 0 — Foundation (Weeks 1-3)
> Get the multi-tenant architecture right before building features

- [x] Project scaffolding (Next.js 16 + Supabase + Tailwind + shadcn)
- [ ] Database schema: companies, company_members, supplier_profiles, enhanced products
- [ ] Auth: company registration, user-to-company association, role system
- [ ] RLS policies for multi-tenant data isolation
- [ ] Seed data: categories (3-level taxonomy), test companies

### Phase 1 — Core Marketplace MVP (Weeks 4-10)
> Suppliers can list, buyers can discover and purchase

- [ ] **Supplier portal:** registration, company profile, product CRUD (with MOQ, tiered pricing)
- [ ] **Public catalog:** product listing, search, category filters, supplier profile pages
- [ ] **Buyer portal:** registration, browse, add to cart (multi-vendor), basic checkout
- [ ] **Order system:** PO creation, supplier confirmation, status pipeline, basic tracking
- [ ] **Admin panel:** supplier approval, product moderation, order overview, category management
- [ ] **Payment:** TapPay integration with platform commission split
- [ ] **Notifications:** email (Resend) for key events (order, approval)

### Phase 2 — Trade Infrastructure (Weeks 11-17)
> Enable B2B-specific workflows

- [ ] **RFQ system:** create, match, quote, compare, accept, convert-to-order
- [ ] **Messaging:** real-time chat (Supabase Realtime), file sharing, inquiry management
- [ ] **Tiered pricing engine:** volume discounts, price breaks display
- [ ] **Payment terms:** deposit + balance, net-30 terms
- [ ] **Supplier dashboard:** sales analytics, inquiry inbox, product performance
- [ ] **Buyer dashboard:** RFQ management, order tracking, favorites
- [ ] **In-app notifications:** notification center, preferences

### Phase 3 — Trust & Quality (Weeks 18-23)
> Build marketplace trust

- [ ] **Supplier verification:** business license upload, admin review, verification badges
- [ ] **Escrow/Trade Assurance:** basic escrow flow (pay → hold → release)
- [ ] **Reviews & ratings:** multi-dimension supplier reviews, aggregated scores
- [ ] **Dispute resolution:** filing, evidence, mediation workflow
- [ ] **Content moderation:** product approval queue, prohibited items detection
- [ ] **Settlement system:** automated commission calculation, payout scheduling

### Phase 4 — Growth & Scale (Weeks 24-30)
> Marketing tools and platform growth

- [ ] **Supplier tiers:** free/standard/premium subscription with feature gates
- [ ] **Promoted listings:** paid product placement, keyword advertising
- [ ] **Advanced search:** Meilisearch integration, autocomplete, filters
- [ ] **Supplier coupons & promotions:** supplier-created deals
- [ ] **SEO optimization:** structured data, category landing pages
- [ ] **Bulk operations:** CSV/Excel product upload, bulk order management
- [ ] **API layer:** REST API for ERP integration, webhooks, API keys

### Phase 5 — Advanced Features (Weeks 31+)
> Platform maturity

- [ ] **AI features:** product matching, RFQ auto-routing, search ranking
- [ ] **Multi-currency support**
- [ ] **International logistics integration**
- [ ] **PWA / mobile optimization**
- [ ] **Advanced analytics:** conversion funnels, supplier health scoring
- [ ] **Financial services:** buyer credit, trade financing partnerships
- [ ] **Multi-language expansion**

---

## 10. Open Questions & Decisions Required

| # | Question | Impact | Decision Needed By |
|---|---|---|---|
| 1 | **Taiwan-only or international?** Multi-currency, multi-language, and cross-border logistics depend on this | Architecture, payments, i18n | Phase 0 |
| 2 | **Industry vertical or horizontal?** Vertical (e.g., food/wine/electronics) simplifies category taxonomy and attribute templates; horizontal requires generic system | Category design, search | Phase 0 |
| 3 | **Escrow required for MVP?** Escrow adds trust but significant complexity. Can MVP launch with direct payment + commission? | Payment architecture | Phase 1 |
| 4 | **Supabase scalability ceiling?** At what user/product volume do we need to consider dedicated PostgreSQL, separate search engine, or queue system? | Infrastructure cost | Phase 2 |
| 5 | **Supplier self-service vs curated?** Open registration (scale faster, more moderation) vs invite-only (quality control, slower growth) | Onboarding flow | Phase 1 |
| 6 | **Commission model?** Fixed % per transaction? Tiered by supplier level? Category-based? | Revenue model | Phase 1 |
| 7 | **Sample order support in MVP?** Sample orders add complexity but are critical for B2B buyer confidence | Order system design | Phase 1 |
| 8 | **LINE integration scope?** LIFF login only, or full LINE OA messaging for buyer-supplier communication? | Communication architecture | Phase 2 |
| 9 | **AI budget & scope?** Which AI features are worth the API cost at early stage? | Feature prioritization | Phase 4 |
| 10 | **Team size & timeline?** Solo developer vs team affects phase duration dramatically | All phases | Now |

---

---

## 11. Extended Gap Analysis — Top-Tier B2B Platforms

Beyond Alibaba.com, the following platforms define best-in-class B2B commerce. Each brings unique capabilities that represent additional gaps.

### Platform Benchmark Map

| Platform | Focus | Unique Strength | Revenue Model |
|---|---|---|---|
| **Alibaba.com** | Global B2B trade | Scale, RFQ, Trade Assurance, logistics | Membership + ads + commission |
| **1688.com** | China domestic B2B | Low-cost sourcing, factory-direct, WeChat integration | Commission + ads |
| **Amazon Business** | B2B procurement | Business pricing, approval workflows, punchout catalogs, tax exemption | Commission per sale |
| **IndiaMART** | India B2B marketplace | Lead generation model, pay-per-lead, buyer requirements matching | Subscription (supplier) + pay-per-lead |
| **ThomasNet** | Industrial/manufacturing | Engineering specs search, CAD downloads, supplier capability matching | Subscription + advertising |
| **Global Sources** | Asia export sourcing | Verified suppliers, trade show integration, sourcing magazine | Membership + events |
| **Faire** | Wholesale (DTC brands → retailers) | Net-60 terms, free returns, consignment model, brand discovery | Commission (hidden from retailer) |
| **Tundra** | Wholesale marketplace | 0% commission, free shipping over threshold, brand-first discovery | Supplier subscription |
| **TradeIndia** | India B2B | Dial-to-connect, buyer requirement posting, trust seal program | Membership + leads |
| **DHgate** | Small-batch B2B/B2C hybrid | Low MOQ, buyer protection, cross-border logistics | Commission |
| **Orderchamp** | European wholesale | Curated brands, net-60, sustainability focus, data-driven recommendations | Commission |

---

### 11.1 Missing Gaps from Amazon Business

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Business Prime** | Subscription for free shipping, analytics, and guided buying | **[GAP]** | P2 |
| **Punchout catalog (cXML/OCI)** | Integration with procurement systems (SAP Ariba, Coupa, Oracle) | **[GAP]** | P3 |
| **Approval workflows** | Multi-level purchase approval chains with configurable thresholds | **[GAP]** | P1 |
| **Tax exemption program (TAXEP)** | Buyer uploads tax-exempt certificates, automatic tax removal | **[GAP]** | P2 |
| **Business analytics** | Spend visibility dashboard for buyer organizations | **[GAP]** | P2 |
| **Guided buying** | Admin-curated preferred supplier lists that restrict what employees can buy | **[GAP]** | P3 |
| **Quantity discounts (auto-applied)** | System automatically shows best price at quantity without manual negotiation | **[GAP]** | P1 |
| **Reorder lists** | One-click reorder from past purchases, scheduled reorders | **[GAP]** | P1 |
| **Multi-user business accounts** | Shared company account with individual logins, budget controls | **[GAP]** | P1 |
| **Pay by invoice** | Automated Net-30 invoicing for qualified business accounts | **[GAP]** | P1 |
| **Amazon Business Lending** | Working capital financing based on sales history | **[GAP]** | P3 |

### 11.2 Missing Gaps from Faire / Wholesale Platforms

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Net-60 payment terms (platform-funded)** | Platform pays supplier upfront, collects from buyer in 60 days | **[GAP]** | P2 |
| **Free returns on first order** | Risk-free first order to drive trial, platform absorbs cost | **[GAP]** | P3 |
| **Brand discovery feed** | Instagram-like visual brand browsing experience, curated collections | **[GAP]** | P2 |
| **Opening order vs reorder pricing** | Different terms for first purchase vs repeat purchases | **[GAP]** | P2 |
| **Insider/exclusive products** | Products available only through the platform (not DTC) | **[GAP]** | P3 |
| **Smart restock recommendations** | AI predicts when buyer needs to reorder based on velocity | **[GAP]** | P3 |
| **Consignment model** | Supplier ships inventory, buyer only pays for what sells | **[GAP]** | P3 |
| **Sustainability filters** | Filter by eco-friendly, organic, fair-trade certifications | **[GAP]** | P2 |
| **Buyer onboarding quiz** | Guided questionnaire to match buyers with relevant brands | **[GAP]** | P2 |
| **Faire Direct (off-platform)** | Existing supplier relationships tracked through platform for data | **[GAP]** | P3 |

### 11.3 Missing Gaps from IndiaMART / Lead-Gen Model

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Buy requirements board** | Buyers post what they need, suppliers see and respond (inverse marketplace) | **[GAP]** | P1 |
| **Pay-per-lead model** | Suppliers pay per qualified buyer contact/inquiry | **[GAP]** | P2 |
| **Click-to-call / dial-to-connect** | Platform-mediated phone calls between buyer and supplier | **[GAP]** | P3 |
| **Lead scoring** | AI ranks buyer inquiries by purchase intent and quality | **[GAP]** | P2 |
| **Supplier lead inbox** | CRM-like interface for managing buyer inquiries with follow-up reminders | **[GAP]** | P1 |
| **Trust seal verification levels** | Multiple verification tiers (TrustSEAL, verified, audited) with different requirements | **[GAP]** | P1 |
| **Annual subscription plans (supplier)** | Tiered annual plans with lead quotas and visibility levels | **[GAP]** | P1 |
| **GST/tax auto-lookup** | Auto-fill company details from tax registration number | **[GAP]** | P2 |
| **Regional language support** | Interface in local languages beyond primary market language | **[GAP]** | P2 |

### 11.4 Missing Gaps from ThomasNet / Industrial B2B

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Supplier capability search** | Search by manufacturing process, material, tolerance, volume capacity | **[GAP]** | P2 |
| **CAD file downloads** | 3D models, technical drawings as product attachments | **[GAP]** | P3 |
| **RFI (Request for Information)** | Lightweight pre-RFQ to gather supplier capabilities | **[GAP]** | P2 |
| **Supplier capability matrix** | Side-by-side comparison of supplier capabilities (not just products) | **[GAP]** | P2 |
| **Industry-specific product attributes** | Engineering specs (dimensions, tolerances, materials, compliance codes) | **[GAP]** | P1 |
| **Shortlist / supplier comparison** | Save and compare up to N suppliers in a structured comparison view | **[GAP]** | P1 |
| **Supplier news / updates feed** | Supplier publishes capability updates, new certifications, capacity changes | **[GAP]** | P3 |
| **Diversity & compliance filters** | Filter by woman-owned, minority-owned, ISO certified, etc. | **[GAP]** | P2 |

### 11.5 Missing Gaps from Global Sources / Trade Show Platforms

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Virtual trade show / showroom** | Online event-based sourcing with live supplier booths | **[GAP]** | P3 |
| **Sourcing magazine / content hub** | Industry reports, buyer guides, trend analysis content | **[GAP]** | P3 |
| **Product video demos** | Supplier-uploaded product demonstration videos | **[GAP]** | P2 |
| **Factory audit reports (viewable)** | Third-party inspection reports publicly viewable on supplier profile | **[GAP]** | P2 |
| **Matched sourcing requests** | Platform staff manually matches complex buyer requests to suppliers | **[GAP]** | P3 |
| **Private sourcing events** | Invite-only sourcing events for enterprise buyers | **[GAP]** | P3 |

### 11.6 Missing Gaps from Modern Demo/Sales Platforms

| Feature | Description | Status | Priority |
|---|---|---|---|
| **Product demo scheduling** | Buyer books a live video demo with supplier (Calendly-like) | **[GAP]** | P2 |
| **Interactive product configurator** | Configure custom product (dimensions, materials, finish) with live pricing | **[GAP]** | P3 |
| **Digital showroom** | 360-degree product views, AR product preview | **[GAP]** | P3 |
| **Video call integration** | Built-in video conferencing for supplier-buyer meetings | **[GAP]** | P3 |
| **Sales pipeline for suppliers** | CRM-like pipeline: lead → inquiry → sample → quote → order → repeat | **[GAP]** | P2 |
| **Shared workspace / project board** | Buyer-supplier collaboration space for complex orders (specs, samples, revisions) | **[GAP]** | P2 |
| **Digital catalog sharing** | Supplier generates shareable catalog link (password-protected, expiring) | **[GAP]** | P2 |
| **Buyer intent signals** | Suppliers see who viewed their products, time on page, repeat visits | **[GAP]** | P2 |
| **Quote follow-up automation** | Auto-remind buyer if quote hasn't been responded to in N days | **[GAP]** | P2 |
| **Proposal builder** | Rich proposal with company intro + pricing + terms + timeline in one doc | **[GAP]** | P2 |

---

### 11.7 Cross-Platform Gap Summary (Additional to Alibaba)

| Category | Additional Gaps Found | Total New Features |
|---|---|---|
| Procurement & compliance (Amazon Business) | Approval workflows, punchout, tax exemption, guided buying | 11 |
| Wholesale & brand discovery (Faire/Tundra) | Net-60 terms, brand feed, restock AI, consignment, sustainability | 10 |
| Lead generation & CRM (IndiaMART) | Buy board, pay-per-lead, lead scoring, supplier CRM | 9 |
| Industrial/engineering (ThomasNet) | Capability search, CAD files, RFI, spec search | 8 |
| Trade shows & content (Global Sources) | Virtual showrooms, audit reports, sourcing events | 6 |
| Modern sales/demo tools | Product configurator, video demos, shared workspace, intent signals | 10 |
| **TOTAL ADDITIONAL GAPS** | | **54** |

---

### 11.8 Revised Total Gap Count

| Source | Features | [REUSE] | [PARTIAL] | [GAP] |
|---|---|---|---|---|
| Alibaba.com baseline | 229 | 11 | 22 | 196 |
| Amazon Business | 11 | 0 | 0 | 11 |
| Faire / Wholesale | 10 | 0 | 0 | 10 |
| IndiaMART / Lead-Gen | 9 | 0 | 0 | 9 |
| ThomasNet / Industrial | 8 | 0 | 0 | 8 |
| Global Sources / Events | 6 | 0 | 0 | 6 |
| Modern Demo/Sales | 10 | 0 | 0 | 10 |
| **GRAND TOTAL** | **283** | **11 (4%)** | **22 (8%)** | **250 (88%)** |

---

### 11.9 Top 20 High-Impact Gaps to Prioritize

These are features that appear across multiple top-tier platforms and represent the highest-value gaps:

| # | Feature | Platforms | Impact | Effort | Recommended Phase |
|---|---|---|---|---|---|
| 1 | **Multi-vendor product catalog + supplier storefronts** | All | Critical — no marketplace without it | High | Phase 1 |
| 2 | **RFQ/Quotation engine** | Alibaba, IndiaMART, ThomasNet | Core B2B differentiator from B2C | High | Phase 2 |
| 3 | **Real-time messaging (buyer ↔ supplier)** | Alibaba, all | Trust & conversion driver | Medium | Phase 2 |
| 4 | **Multi-level approval workflows** | Amazon Business | Enterprise buyer requirement | Medium | Phase 2 |
| 5 | **Buyer requirements board (reverse RFQ)** | IndiaMART, Alibaba | Demand aggregation, supplier matching | Medium | Phase 2 |
| 6 | **Supplier verification & trust badges** | All | Marketplace trust foundation | Medium | Phase 3 |
| 7 | **Escrow / trade assurance** | Alibaba, DHgate | Payment confidence for new relationships | High | Phase 3 |
| 8 | **Tiered/volume pricing engine** | All | B2B pricing is not B2C pricing | Medium | Phase 1 |
| 9 | **Platform settlement & commission** | All | Revenue infrastructure | Medium | Phase 1 |
| 10 | **Supplier lead management inbox** | IndiaMART, ThomasNet | Supplier retention & productivity | Medium | Phase 2 |
| 11 | **Multi-user company accounts + roles** | Amazon Business, Alibaba | Enterprise adoption requirement | Medium | Phase 1 |
| 12 | **Dispute resolution system** | Alibaba, Faire | Marketplace integrity | Medium | Phase 3 |
| 13 | **Product moderation queue** | All | Content quality control | Low | Phase 1 |
| 14 | **Supplier subscription tiers** | Alibaba, IndiaMART, ThomasNet | Revenue diversification | Medium | Phase 4 |
| 15 | **Net-30/60 payment terms** | Amazon Business, Faire | B2B purchase expectation | High | Phase 2 |
| 16 | **Advanced search (faceted + full-text)** | All | Discovery at scale | Medium | Phase 4 |
| 17 | **Supplier analytics dashboard** | All | Supplier retention through value | Medium | Phase 2 |
| 18 | **Digital catalog / proposal builder** | Modern sales | Higher-touch B2B sales enablement | Medium | Phase 4 |
| 19 | **Reorder lists / scheduled reorders** | Amazon Business, Faire | Buyer retention & GMV driver | Low | Phase 3 |
| 20 | **Sustainability / compliance filters** | Faire, Orderchamp, ThomasNet | Growing buyer requirement | Low | Phase 4 |

---

*This PRD is a living document. Update as decisions are made and gaps are closed.*
