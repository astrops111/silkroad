"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  Star,
  Shield,
  CheckCircle2,
  MapPin,
  Clock,
  Heart,
  Share2,
  MessageSquare,
  Package,
  Truck,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  Globe,
  Factory,
  Award,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  Play,
  Image as ImageIcon,
  Zap,
  Wrench,
  Search,
  Grid3X3,
  List,
  ThumbsUp,
  BadgeCheck,
  ShieldCheck,
  Building2,
  Ruler,
  Timer,
  CircleDollarSign,
  BoxIcon,
} from "lucide-react";

/* ==========================================================================
   MOCK DATA — SUPPLIER PROFILE
   ========================================================================== */

const SUPPLIER = {
  slug: "huanan-precision-machinery",
  name: "Guangzhou HuaNan Precision Machinery Co., Ltd.",
  nameZh: "广州华南精密机械有限公司",
  tagline: "Professional CNC & Laser Equipment Manufacturer Since 2008 — Serving 60+ Countries Across Africa, Asia & South America",
  logo: "HN",
  coverGradient: "from-[#1a2744] via-[#1e3a5f] to-[#0f2030]",
  verified: true,
  goldSupplier: true,
  yearsOnPlatform: 6,
  established: 2008,
  province: "Guangdong",
  city: "Guangzhou",
  country: "China",
  employees: "500-999",
  annualRevenue: "$10M - $50M",
  factorySize: "25,000 m²",
  productionLines: 12,
  rdStaff: 45,
  exportPercentage: "75%",
  mainMarkets: [
    "West Africa (22%)",
    "East Africa (18%)",
    "Southern Africa (12%)",
    "Southeast Asia (15%)",
    "South America (8%)",
    "Middle East (5%)",
    "Domestic China (20%)",
  ],
  certifications: [
    "ISO 9001:2015 (Quality Management)",
    "ISO 14001:2015 (Environmental)",
    "CE (European Conformity)",
    "SGS Verified Factory Audit",
    "TÜV Rheinland Product Safety",
    "OHSAS 18001 (Occupational Safety)",
  ],
  rating: 4.8,
  totalReviews: 486,
  totalTransactions: 3240,
  responseRate: "98%",
  responseTime: "< 2 hours",
  onTimeDelivery: "96.4%",
  repeatBuyerRate: "42%",
  disputeRate: "0.3%",
  qualityScore: 4.8,
  communicationScore: 4.9,
  shippingScore: 4.5,
  description:
    "Guangzhou HuaNan Precision Machinery Co., Ltd. is a leading manufacturer of CNC laser cutting machines, metal forming equipment, and industrial automation solutions. Founded in 2008, we operate a 25,000m² factory in the Guangzhou Economic and Technological Development Zone with 12 production lines and a dedicated R&D center staffed by 45+ engineers.\n\nOur core product lines include fiber laser cutting machines (1000W–30000W), CNC hydraulic press brakes, plasma cutting systems, laser welding equipment, and industrial robotic arms. We source premium components from IPG Photonics (Germany), Precitec (Germany), and Yaskawa (Japan) to ensure world-class cutting accuracy and machine longevity.\n\nSince 2018, we have strategically expanded into the African market, now serving over 1,200 customers across 38 African countries. Our Africa sales team includes French- and English-speaking export managers who understand the unique logistics, customs, and payment requirements of doing business on the continent. We offer door-to-door shipping via Guangzhou port to major African destinations including Lagos, Accra, Dar es Salaam, Mombasa, Durban, and Douala.\n\nEvery machine ships with comprehensive documentation including CE certificates, operation manuals (English/French/Arabic), installation videos, and a 24-month warranty. We provide remote installation support via video call and can dispatch on-site technicians to Africa for large orders.",
  companyOverview: {
    businessType: "Manufacturer / Factory",
    registeredCapital: "¥50,000,000 (CNY)",
    legalRepresentative: "Mr. Chen Weiming (陈伟明)",
    registrationNumber: "91440101MA5CXXX",
    registeredAddress: "No. 168, Kexue Avenue, Guangzhou ETDZ, Guangdong 510730, China",
    ownershipType: "Private Limited Company",
    totalArea: "25,000 m² (factory) + 3,000 m² (office)",
    qualityControlStaff: 28,
    annualOutputValue: "2,400+ machines per year",
    nearestPort: "Guangzhou / Shenzhen / Nansha",
    averageLeadTime: "15-30 days (standard), 7-12 days (in-stock models)",
    paymentTerms: "T/T (30% deposit + 70% before shipping), L/C at sight",
    samplePolicy: "Free factory visit & live demo; sample machines available for select models",
    afterSalesService: "24-month warranty, lifetime technical support, spare parts within 48hrs",
    tradeCapacity: "120 x 40ft containers / year",
    deliveryTerms: "FOB Guangzhou, CIF any African port, DDP (door-to-door) available",
  },
  contactPerson: "Mr. David Chen (Export Manager — Africa Division)",
  phone: "+86-20-8888-9999",
  whatsapp: "+86-138-2888-6666",
  email: "export@huanan-machinery.com",
  website: "www.huanan-machinery.com",
  languages: ["English", "中文", "Français", "العربية"],
  socialProof: {
    topBuyerCountries: [
      { country: "Nigeria", flag: "🇳🇬", orders: 420 },
      { country: "Ghana", flag: "🇬🇭", orders: 310 },
      { country: "Kenya", flag: "🇰🇪", orders: 285 },
      { country: "Tanzania", flag: "🇹🇿", orders: 195 },
      { country: "South Africa", flag: "🇿🇦", orders: 180 },
      { country: "Ethiopia", flag: "🇪🇹", orders: 165 },
      { country: "Cameroon", flag: "🇨🇲", orders: 140 },
      { country: "Senegal", flag: "🇸🇳", orders: 120 },
      { country: "Côte d'Ivoire", flag: "🇨🇮", orders: 110 },
      { country: "DRC", flag: "🇨🇩", orders: 95 },
    ],
    recentTransactions: [
      { date: "Apr 14, 2026", buyer: "Lagos Metal Works Ltd.", product: "3000W Fiber Laser x2", amount: "$24,000" },
      { date: "Apr 12, 2026", buyer: "Kigali Steel Fabricators", product: "CNC Press Brake 160T", amount: "$15,500" },
      { date: "Apr 10, 2026", buyer: "Addis Engineering PLC", product: "6000W Fiber Laser", amount: "$32,000" },
      { date: "Apr 8, 2026", buyer: "Nairobi Industrial Co.", product: "Plasma Cutter 1530 x3", amount: "$18,600" },
      { date: "Apr 5, 2026", buyer: "Accra Precision Mfg.", product: "Laser Welder 1500W x5", amount: "$22,500" },
    ],
  },
};

const PRODUCT_CATEGORIES = [
  { name: "Laser Cutting Machines", count: 24, icon: Zap },
  { name: "CNC Bending Machines", count: 18, icon: Wrench },
  { name: "Welding Equipment", count: 15, icon: Factory },
  { name: "Plasma Cutting", count: 8, icon: Zap },
  { name: "Automation & Robotics", count: 6, icon: Wrench },
  { name: "Spare Parts & Accessories", count: 45, icon: BoxIcon },
];

const PRODUCTS = [
  {
    id: "p1",
    name: "3000W Fiber Laser Cutting Machine IPG Source — Carbon Steel 22mm / Stainless 12mm",
    price: 8500,
    priceMax: 12000,
    moq: 1,
    unit: "Set",
    leadTime: "15-20 days",
    image: "from-slate-200 to-slate-300",
    rating: 4.8,
    reviews: 142,
    orders: 320,
    tags: ["Hot Sale"],
  },
  {
    id: "p2",
    name: "6000W High-Power Fiber Laser Cutter with Auto Exchange Table — 3000x1500mm Work Area",
    price: 22000,
    priceMax: 35000,
    moq: 1,
    unit: "Set",
    leadTime: "20-30 days",
    image: "from-blue-100 to-indigo-200",
    rating: 4.9,
    reviews: 67,
    orders: 89,
    tags: ["New Arrival"],
  },
  {
    id: "p3",
    name: "CNC Hydraulic Press Brake 160T/3200mm — Delem DA66T Controller, 6-Axis Backgauge",
    price: 12000,
    priceMax: 18000,
    moq: 1,
    unit: "Set",
    leadTime: "15-25 days",
    image: "from-amber-100 to-yellow-200",
    rating: 4.7,
    reviews: 95,
    orders: 210,
    tags: [],
  },
  {
    id: "p4",
    name: "Tube & Pipe Laser Cutting Machine 2000W — Round/Square/Rectangular up to 220mm Diameter",
    price: 15000,
    priceMax: 22000,
    moq: 1,
    unit: "Set",
    leadTime: "20-30 days",
    image: "from-emerald-100 to-green-200",
    rating: 4.6,
    reviews: 38,
    orders: 64,
    tags: [],
  },
  {
    id: "p5",
    name: "CO2 Laser Engraving & Cutting Machine 150W — Acrylic, Wood, Leather, Fabric 1300x900mm",
    price: 2800,
    priceMax: 4500,
    moq: 1,
    unit: "Set",
    leadTime: "7-10 days",
    image: "from-purple-100 to-violet-200",
    rating: 4.5,
    reviews: 210,
    orders: 540,
    tags: ["Best Seller"],
  },
  {
    id: "p6",
    name: "Handheld Fiber Laser Welding Machine 1500W — Stainless, Carbon Steel, Aluminum",
    price: 3200,
    priceMax: 5000,
    moq: 1,
    unit: "Set",
    leadTime: "7-12 days",
    image: "from-rose-100 to-pink-200",
    rating: 4.7,
    reviews: 128,
    orders: 380,
    tags: ["Hot Sale"],
  },
  {
    id: "p7",
    name: "CNC Plasma Cutting Machine Table Type 1530 — Hypertherm 65A/105A, 20mm Mild Steel",
    price: 4200,
    priceMax: 6800,
    moq: 1,
    unit: "Set",
    leadTime: "10-15 days",
    image: "from-orange-100 to-amber-200",
    rating: 4.4,
    reviews: 72,
    orders: 155,
    tags: [],
  },
  {
    id: "p8",
    name: "Industrial 6-Axis Welding Robot Arm with Positioner — MIG/TIG/Laser Compatible",
    price: 18000,
    priceMax: 28000,
    moq: 1,
    unit: "Unit",
    leadTime: "25-35 days",
    image: "from-cyan-100 to-sky-200",
    rating: 4.8,
    reviews: 24,
    orders: 42,
    tags: ["New Arrival"],
  },
  {
    id: "p9",
    name: "12000W Ultra-High Power Fiber Laser Cutting Machine — 25mm Stainless, 40mm Carbon Steel",
    price: 58000,
    priceMax: 85000,
    moq: 1,
    unit: "Set",
    leadTime: "30-45 days",
    image: "from-gray-200 to-zinc-300",
    rating: 5.0,
    reviews: 12,
    orders: 18,
    tags: ["Premium"],
  },
  {
    id: "p10",
    name: "CNC Hydraulic Shearing Machine 6x3200mm — Estun E21S Controller, Pneumatic Clutch",
    price: 7500,
    priceMax: 11000,
    moq: 1,
    unit: "Set",
    leadTime: "15-20 days",
    image: "from-stone-200 to-neutral-300",
    rating: 4.6,
    reviews: 56,
    orders: 145,
    tags: [],
  },
  {
    id: "p11",
    name: "Laser Cleaning Machine 1000W — Rust, Paint, Oxide Removal for Metal Surfaces",
    price: 5800,
    priceMax: 8500,
    moq: 1,
    unit: "Set",
    leadTime: "10-15 days",
    image: "from-teal-100 to-emerald-200",
    rating: 4.7,
    reviews: 34,
    orders: 78,
    tags: ["New Arrival"],
  },
  {
    id: "p12",
    name: "CNC Fiber Laser Marking Machine 30W — Metal, Plastic, Jewelry Engraving 200x200mm",
    price: 1200,
    priceMax: 2400,
    moq: 2,
    unit: "Set",
    leadTime: "5-7 days",
    image: "from-yellow-100 to-lime-200",
    rating: 4.5,
    reviews: 315,
    orders: 890,
    tags: ["Best Seller"],
  },
  {
    id: "p13",
    name: "CNC Hydraulic Iron Worker Machine 90T — Punching, Shearing, Notching Multi-Function",
    price: 4800,
    priceMax: 7200,
    moq: 1,
    unit: "Set",
    leadTime: "12-18 days",
    image: "from-red-100 to-rose-200",
    rating: 4.3,
    reviews: 42,
    orders: 98,
    tags: [],
  },
  {
    id: "p14",
    name: "Automatic Sheet Metal Decoiler & Leveler Line — Coil Feed System for Press / Laser",
    price: 8000,
    priceMax: 14000,
    moq: 1,
    unit: "Set",
    leadTime: "20-28 days",
    image: "from-sky-100 to-blue-200",
    rating: 4.6,
    reviews: 19,
    orders: 35,
    tags: [],
  },
  {
    id: "p15",
    name: "Fiber Laser Cutting Head Precitec ProCutter 2.0 — Replacement / Upgrade Part",
    price: 1800,
    priceMax: 2500,
    moq: 1,
    unit: "Piece",
    leadTime: "3-5 days",
    image: "from-violet-100 to-purple-200",
    rating: 4.9,
    reviews: 88,
    orders: 420,
    tags: ["Best Seller"],
  },
  {
    id: "p16",
    name: "Protective Lens Kit for Fiber Laser (37x7mm, 30x5mm) — 10-Pack Quartz, Anti-Reflective",
    price: 45,
    priceMax: 80,
    moq: 10,
    unit: "Pack",
    leadTime: "2-3 days",
    image: "from-fuchsia-100 to-pink-200",
    rating: 4.4,
    reviews: 520,
    orders: 2400,
    tags: ["Hot Sale"],
  },
];

const REVIEWS = [
  {
    id: "r1",
    buyer: "Amara Diallo",
    company: "TechHub Ghana",
    country: "Ghana",
    avatar: "AD",
    rating: 5,
    date: "Mar 2026",
    product: "3000W Fiber Laser Cutting Machine",
    comment:
      "Excellent machine quality. David from HuaNan was incredibly responsive throughout the process — from quotation to delivery. The machine arrived well-packaged in a wooden crate and the installation video guide (in English) was very helpful. Production started within 2 days of setup. The IPG laser source is rock solid. Already cut 3mm stainless and 16mm mild steel with perfect edges. Highly recommended for African metal fabrication businesses.",
    images: 3,
    helpful: 24,
    dimensions: { quality: 5, communication: 5, shipping: 4 },
  },
  {
    id: "r2",
    buyer: "Emmanuel Osei",
    company: "Accra Steel Works Ltd.",
    country: "Ghana",
    avatar: "EO",
    rating: 5,
    date: "Feb 2026",
    product: "CNC Hydraulic Press Brake 160T",
    comment:
      "Second purchase from HuaNan. The press brake is heavy duty and precise — we're bending 6mm stainless at 3-meter lengths without any springback issues. They even helped us spec the right tooling for our application (V-dies for African standard gauge sheets). After-sales support has been excellent — they shipped replacement seals for free when we had a minor hydraulic leak. David arranged a video call with their engineer to walk us through the setup. Will order the 250T model next quarter.",
    images: 5,
    helpful: 31,
    dimensions: { quality: 5, communication: 5, shipping: 5 },
  },
  {
    id: "r3",
    buyer: "Fatima Nkosi",
    company: "Johannesburg Manufacturing Co.",
    country: "South Africa",
    avatar: "FN",
    rating: 4,
    date: "Jan 2026",
    product: "CO2 Laser Engraving Machine 150W",
    comment:
      "Good machine for the price. We use it for cutting acrylic signage and engraving wooden trophies. Shipping to Durban took a bit longer than expected (35 days instead of the quoted 25), but the product quality is solid. Customer service was helpful in resolving the delay — they provided tracking updates daily once I flagged the issue. The RuiDa controller is easy to use with LightBurn software. Would buy again but would recommend negotiating DDP terms for South Africa to avoid customs delays.",
    images: 2,
    helpful: 18,
    dimensions: { quality: 5, communication: 4, shipping: 3 },
  },
  {
    id: "r4",
    buyer: "Ibrahim Koné",
    company: "Bamako Industrial Supply SARL",
    country: "Mali",
    avatar: "IK",
    rating: 5,
    date: "Dec 2025",
    product: "Handheld Fiber Laser Welding Machine 1500W",
    comment:
      "Un changement radical pour notre atelier. Le soudeur laser portatif est beaucoup plus rapide et plus propre que notre ancien poste MIG. La formation a été dispensée par appel vidéo en français, ce qui a été très apprécié — David a même fait traduire le manuel d'utilisation pour nous. Le cordon de soudure sur l'inox 3mm est parfait, presque invisible. Nous avons déjà commandé un deuxième pour notre succursale de Bamako.",
    images: 4,
    helpful: 22,
    dimensions: { quality: 5, communication: 5, shipping: 4 },
  },
  {
    id: "r5",
    buyer: "Chinedu Okafor",
    company: "Lagos Metal Fabricators & Eng. Ltd.",
    country: "Nigeria",
    avatar: "CO",
    rating: 5,
    date: "Nov 2025",
    product: "6000W High-Power Fiber Laser Cutter",
    comment:
      "This is the third machine we've bought from HuaNan. The 6000W is a beast — cutting 20mm carbon steel at 3m/min. The exchange table doubles our throughput since we can load the next sheet while the machine is cutting. Shipping to Lagos via Apapa port was smooth, arrived in 28 days. They arranged a technician to fly in from Guangzhou for the installation and training (3 days on-site). Our workshop has gone from 5 jobs/week to 15 since we installed this machine. The investment paid for itself in 4 months.",
    images: 6,
    helpful: 45,
    dimensions: { quality: 5, communication: 5, shipping: 5 },
  },
  {
    id: "r6",
    buyer: "Grace Wanjiku",
    company: "Nairobi Industrial Equipment Co.",
    country: "Kenya",
    avatar: "GW",
    rating: 4,
    date: "Oct 2025",
    product: "CNC Plasma Cutting Machine Table Type 1530",
    comment:
      "Solid machine for the price range. We use it for cutting 6-16mm mild steel plates for construction projects. The Hypertherm 105A source gives clean cuts. Two small issues: (1) the manual was only in Chinese initially, but David sent an English version within a day, and (2) one of the limit switches needed adjustment on arrival. Both were resolved quickly. The machine is now running 10 hours/day for our Mombasa Road factory expansion project. Good value for East African fabrication shops.",
    images: 2,
    helpful: 15,
    dimensions: { quality: 4, communication: 5, shipping: 4 },
  },
  {
    id: "r7",
    buyer: "Kwame Mensah",
    company: "Kumasi Engineering Works",
    country: "Ghana",
    avatar: "KM",
    rating: 5,
    date: "Sep 2025",
    product: "CNC Fiber Laser Marking Machine 30W",
    comment:
      "Perfect for our product marking needs. We're marking serial numbers, QR codes, and logos on our agricultural equipment parts. Very fast — marks stainless steel in under 2 seconds. The EzCad software has a slight learning curve but David arranged a remote training session. Shipping to Tema port was surprisingly fast (18 days). The small size of this machine is a big advantage — it sits right on our production floor workbench. Already ordered 2 more for our Tamale and Takoradi branches.",
    images: 3,
    helpful: 19,
    dimensions: { quality: 5, communication: 5, shipping: 5 },
  },
  {
    id: "r8",
    buyer: "Aissatou Ba",
    company: "Dakar Métallurgie SA",
    country: "Senegal",
    avatar: "AB",
    rating: 5,
    date: "Aug 2025",
    product: "3000W Fiber Laser Cutting Machine",
    comment:
      "Nous utilisons cette machine depuis 8 mois maintenant et elle fonctionne parfaitement. La qualité de coupe sur l'acier inoxydable 6mm est excellente — nos clients pour la décoration architecturale sont très satisfaits. L'équipe de HuaNan parle français et comprend les défis logistiques de l'Afrique de l'Ouest. Livraison au port de Dakar en 22 jours. Nous recommandons vivement cette entreprise à tous les fabricants métalliques sénégalais et ouest-africains.",
    images: 4,
    helpful: 28,
    dimensions: { quality: 5, communication: 5, shipping: 5 },
  },
  {
    id: "r9",
    buyer: "Joseph Mugisha",
    company: "Kigali Steel Fabricators Ltd.",
    country: "Rwanda",
    avatar: "JM",
    rating: 4,
    date: "Jul 2025",
    product: "CNC Hydraulic Press Brake 160T",
    comment:
      "Good machine overall. Being a landlocked country, shipping to Rwanda is always a challenge, but HuaNan arranged the full logistics chain — sea freight to Dar es Salaam then overland to Kigali. Total transit was 38 days which is reasonable. The press brake itself is well-built and accurate. One suggestion: it would be helpful to have voltage compatibility for East African power standards (415V/50Hz) as standard, since we had to order a transformer. Otherwise very satisfied.",
    images: 1,
    helpful: 12,
    dimensions: { quality: 5, communication: 4, shipping: 3 },
  },
  {
    id: "r10",
    buyer: "Mohamed Abdi",
    company: "Addis Ababa Engineering PLC",
    country: "Ethiopia",
    avatar: "MA",
    rating: 5,
    date: "Jun 2025",
    product: "Industrial 6-Axis Welding Robot Arm",
    comment:
      "This robot arm has transformed our pipe welding operation. We went from 3 manual welders doing 40 pieces/day to one robot doing 120 pieces/day with perfect consistency. HuaNan sent an engineer for a full week of on-site installation and training in Addis. The programming interface is straightforward — our operators learned the basics in 2 days. ROI achieved in 3 months. Now planning to order a second unit for our steel structure division. David and his team are true partners, not just sellers.",
    images: 7,
    helpful: 38,
    dimensions: { quality: 5, communication: 5, shipping: 4 },
  },
];

const FACTORY_GALLERY = [
  { label: "Main Factory Floor — 25,000m² Production Area", gradient: "from-slate-300 to-zinc-400" },
  { label: "CNC Laser Machine Assembly Line", gradient: "from-blue-200 to-slate-300" },
  { label: "Quality Control & Testing Laboratory", gradient: "from-emerald-200 to-teal-300" },
  { label: "R&D Center — 45+ Engineers", gradient: "from-indigo-200 to-blue-300" },
  { label: "IPG & Raycus Laser Source Testing Room", gradient: "from-amber-200 to-orange-300" },
  { label: "CNC Sheet Metal Bending Workshop", gradient: "from-rose-200 to-pink-300" },
  { label: "Electrical Control Panel Assembly", gradient: "from-cyan-200 to-sky-300" },
  { label: "Finished Machines — Pre-Shipping Inspection", gradient: "from-violet-200 to-purple-300" },
  { label: "Wooden Crate Packaging for Export", gradient: "from-yellow-200 to-amber-300" },
  { label: "Shipping Container Loading Bay", gradient: "from-gray-200 to-neutral-300" },
  { label: "Customer Training Room & Demo Center", gradient: "from-lime-200 to-green-300" },
  { label: "Raw Material & Component Warehouse", gradient: "from-orange-200 to-red-300" },
];

/* ==========================================================================
   COMPONENTS
   ========================================================================== */

type TabKey = "products" | "profile" | "reviews" | "gallery";

// Initials for the logo badge when a supplier has no uploaded logo_url —
// derived from their real name, never a fixed placeholder like every
// storefront previously shared.
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Fields a real supplier can genuinely be missing (no local name, no listed
// founding year, etc.) are nullable here so the UI can fall back to an honest
// "not provided" state instead of silently reusing the mock company's own
// specific facts (its Chinese name, its 2008 founding year, ...).
type SupplierView = Omit<
  typeof SUPPLIER,
  "website" | "nameZh" | "city" | "province" | "description" | "established" | "employees"
> & {
  logoUrl: string | null;
  website: string | null;
  nameZh: string | null;
  city: string | null;
  province: string | null;
  description: string | null;
  established: number | null;
  employees: string | null;
};

function SupplierHero({ supplier, isReal }: { supplier: SupplierView; isReal: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Cover gradient */}
      <div className={`h-48 lg:h-56 bg-gradient-to-br ${supplier.coverGradient} relative`}>
        <div className="absolute inset-0 grid-pattern opacity-15" />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[300px]"
          style={{
            background: "radial-gradient(ellipse at bottom right, rgba(216,159,46,0.1), transparent 60%)",
          }}
        />
      </div>

      {/* Profile card */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="-mt-16 relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Logo */}
          <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-[var(--surface-primary)] border-4 border-[var(--surface-primary)] shadow-lg flex items-center justify-center shrink-0 overflow-hidden">
            {supplier.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={supplier.logoUrl}
                alt={supplier.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-[var(--indigo)] to-[var(--indigo-light)] flex items-center justify-center">
                <span
                  className="text-3xl lg:text-4xl font-black text-white tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {supplier.logo}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {supplier.verified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Verified Supplier
                    </span>
                  )}
                  {supplier.goldSupplier && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[var(--amber)]/10 text-[var(--amber-dark)] border border-[var(--amber)]/20">
                      <Award className="w-3.5 h-3.5" />
                      Gold Supplier
                    </span>
                  )}
                  {/* "Years on platform" isn't tracked on companies yet — demo only. */}
                  {!isReal && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      · {supplier.yearsOnPlatform} yrs on platform
                    </span>
                  )}
                </div>

                {/* Name */}
                <h1
                  className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {supplier.name}
                </h1>
                {supplier.nameZh && (
                  <p className="text-sm text-[var(--text-tertiary)] mt-1">
                    {supplier.nameZh}
                  </p>
                )}

                {/* Tagline — free-text marketing copy, not stored per-supplier. */}
                {!isReal && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl">
                    {supplier.tagline}
                  </p>
                )}

                {/* Location & quick stats */}
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[var(--text-tertiary)]">
                  {(supplier.city || supplier.province || supplier.country) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {[supplier.city, supplier.province, supplier.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {supplier.established && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      Est. {supplier.established}
                    </span>
                  )}
                  {supplier.employees && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {supplier.employees} employees
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(supplier.rating)
                              ? "text-[var(--amber)] fill-[var(--amber)]"
                              : "text-[var(--border-strong)]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {supplier.rating}
                    </span>
                    <span className="text-sm text-[var(--text-tertiary)]">
                      ({supplier.totalReviews} reviews)
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-tertiary)]">
                    · {supplier.totalTransactions.toLocaleString()} transactions
                  </span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col gap-2.5 shrink-0 lg:min-w-[200px]">
                <button className="btn-primary !rounded-xl !py-3 w-full">
                  <MessageSquare className="w-4 h-4" />
                  Contact Supplier
                </button>
                <Link href="/dashboard/rfq/new" className="btn-outline !rounded-xl !py-3 w-full text-center">
                  <FileText className="w-4 h-4" />
                  Send RFQ
                </Link>
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">
                    <Heart className="w-4 h-4" />
                    Save
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Performance metrics strip ---------- */
// Response time and repeat-buyer rate aren't tracked anywhere in the schema
// yet (supplier_profiles has response_rate/on_time_delivery_rate, but no
// response-latency or repeat-buyer columns) — show "-" for a real supplier
// rather than the same fabricated number every storefront used to display.
function PerformanceStrip({ supplier, isReal }: { supplier: SupplierView; isReal: boolean }) {
  const metrics = [
    { icon: Timer, label: "Response Time", value: isReal ? "-" : supplier.responseTime, accent: "var(--success)" },
    { icon: ThumbsUp, label: "Response Rate", value: supplier.responseRate, accent: "var(--amber-dark)" },
    { icon: Truck, label: "On-Time Delivery", value: supplier.onTimeDelivery, accent: "var(--indigo-light)" },
    { icon: Users, label: "Repeat Buyers", value: isReal ? "-" : supplier.repeatBuyerRate, accent: "var(--terracotta-light)" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 mt-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${m.accent} 12%, transparent)` }}
            >
              <m.icon className="w-5 h-5" style={{ color: m.accent }} />
            </div>
            <div>
              <div
                className="text-lg font-bold text-[var(--obsidian)] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {m.value}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] font-medium">
                {m.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Products Tab ---------- */
function ProductsTab({ products, isReal }: { products: RealSupplierProduct[]; isReal: boolean }) {
  if (isReal) {
    return (
      <div>
        {/* Search within supplier */}
        <div className="flex items-center h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--amber)] transition-colors mb-6 max-w-md">
          <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search this supplier's products..."
            className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No products listed yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              This supplier hasn&apos;t published any approved products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/marketplace/${product.id}`}
                className="group card-elevated block overflow-hidden"
              >
                <div className="relative h-44 bg-[var(--surface-secondary)]">
                  {product.isFeatured && (
                    <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[var(--amber)]/15 text-[var(--amber-dark)] border border-[var(--amber)]/20">
                        Featured
                      </span>
                    </div>
                  )}
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-contain p-3"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="absolute inset-0 m-auto w-14 h-14 text-[var(--text-primary)] opacity-[0.05]" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span
                      className="text-lg font-bold text-[var(--obsidian)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {product.currency === "USD" ? "$" : `${product.currency} `}
                      {product.price.toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-sm text-[var(--text-secondary)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--amber-dark)] transition-colors">
                    {product.name}
                  </h3>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    MOQ: {product.moq.toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Category chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button className="px-4 py-2 text-sm font-semibold rounded-full bg-[var(--amber)]/10 text-[var(--amber-dark)] border border-[var(--amber)]/20">
          All Products ({PRODUCTS.length + PRODUCT_CATEGORIES.reduce((s, c) => s + c.count, 0) - PRODUCTS.length})
        </button>
        {PRODUCT_CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Search within supplier */}
      <div className="flex items-center h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--amber)] transition-colors mb-6 max-w-md">
        <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search this supplier's products..."
          className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PRODUCTS.map((product) => (
          <Link
            key={product.id}
            href={`/marketplace/${product.id}`}
            className="group card-elevated block overflow-hidden"
          >
            <div className={`relative h-44 bg-gradient-to-br ${product.image}`}>
              {product.tags.length > 0 && (
                <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                        tag === "Hot Sale"
                          ? "bg-[var(--terracotta)]/15 text-[var(--terracotta)] border border-[var(--terracotta)]/20"
                          : tag === "Best Seller"
                          ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border border-[var(--amber)]/20"
                          : "bg-[var(--indigo)]/15 text-[var(--indigo)] border border-[var(--indigo)]/20"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <Package className="absolute inset-0 m-auto w-14 h-14 text-[var(--text-primary)] opacity-[0.05]" />
            </div>
            <div className="p-4">
              <div className="flex items-baseline gap-1.5 mb-1.5">
                <span
                  className="text-lg font-bold text-[var(--obsidian)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ${product.price.toLocaleString()}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  - ${product.priceMax.toLocaleString()} / {product.unit}
                </span>
              </div>
              <h3 className="text-sm text-[var(--text-secondary)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--amber-dark)] transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-[var(--amber)] fill-[var(--amber)]" />
                  {product.rating}
                </span>
                <span>{product.reviews} reviews</span>
                <span>{product.orders} sold</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--text-tertiary)]">
                <Clock className="w-3 h-3" />
                Lead time: {product.leadTime}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---------- Company Profile Tab ---------- */
function ProfileTab({ supplier, isReal }: { supplier: SupplierView; isReal: boolean }) {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main info */}
      <div className="lg:col-span-2 space-y-8">
        {/* About */}
        <div>
          <h3
            className="text-lg font-bold text-[var(--obsidian)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            About the Company
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {supplier.description ?? "No company description provided yet."}
          </p>
        </div>

        {/* Company details grid — registration number, capital, trade
            capacity, etc. aren't in the companies schema, so a real supplier
            only gets the handful of fields we actually store, not every
            HuaNan-specific fact restated for a different company. */}
        <div>
          <h3
            className="text-lg font-bold text-[var(--obsidian)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Company Details
          </h3>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {(isReal
              ? [
                  { icon: Calendar, label: "Year Established", value: supplier.established ? String(supplier.established) : null },
                  { icon: Users, label: "Total Employees", value: supplier.employees ?? null },
                  { icon: MapPin, label: "Location", value: [supplier.city, supplier.country].filter(Boolean).join(", ") || null },
                ]
              : [
                  { icon: Building2, label: "Business Type", value: SUPPLIER.companyOverview.businessType },
                  { icon: Calendar, label: "Year Established", value: String(SUPPLIER.established) },
                  { icon: MapPin, label: "Registered Address", value: SUPPLIER.companyOverview.registeredAddress },
                  { icon: Users, label: "Total Employees", value: SUPPLIER.employees },
                  { icon: CircleDollarSign, label: "Annual Revenue", value: SUPPLIER.annualRevenue },
                  { icon: CircleDollarSign, label: "Registered Capital", value: SUPPLIER.companyOverview.registeredCapital },
                  { icon: Ruler, label: "Factory Area", value: SUPPLIER.companyOverview.totalArea },
                  { icon: Factory, label: "Production Lines", value: String(SUPPLIER.productionLines) },
                  { icon: Users, label: "R&D Staff", value: String(SUPPLIER.rdStaff) },
                  { icon: Users, label: "QC Staff", value: String(SUPPLIER.companyOverview.qualityControlStaff) },
                  { icon: TrendingUp, label: "Annual Output", value: SUPPLIER.companyOverview.annualOutputValue },
                  { icon: Globe, label: "Export Percentage", value: SUPPLIER.exportPercentage },
                  { icon: Truck, label: "Nearest Port", value: SUPPLIER.companyOverview.nearestPort },
                  { icon: Truck, label: "Trade Capacity", value: SUPPLIER.companyOverview.tradeCapacity },
                  { icon: Clock, label: "Average Lead Time", value: SUPPLIER.companyOverview.averageLeadTime },
                  { icon: Truck, label: "Delivery Terms", value: SUPPLIER.companyOverview.deliveryTerms },
                  { icon: CircleDollarSign, label: "Payment Terms", value: SUPPLIER.companyOverview.paymentTerms },
                  { icon: Shield, label: "After-Sales Service", value: SUPPLIER.companyOverview.afterSalesService },
                  { icon: Globe, label: "Languages", value: SUPPLIER.languages.join(", ") },
                  { icon: Package, label: "Sample Policy", value: SUPPLIER.companyOverview.samplePolicy },
                ]
            )
              .filter((item) => item.value)
              .map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 py-3 border-b border-[var(--border-subtle)]"
                >
                  <item.icon className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-[var(--text-tertiary)] mb-0.5">{item.label}</div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{item.value}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Main Markets — not tracked per-supplier in the schema; demo only. */}
        {!isReal && (
          <div>
            <h3
              className="text-lg font-bold text-[var(--obsidian)] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Main Export Markets
            </h3>
            <div className="flex flex-wrap gap-2">
              {SUPPLIER.mainMarkets.map((market) => (
                <span
                  key={market}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  {market}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Buyer Countries / Recent Transactions — no order/transaction
            aggregation query exists yet, and exposing real buyer identities
            here would leak other customers' data publicly, so a real
            supplier gets an honest empty state instead of fabricated
            buyers/amounts. Demo (disconnected DB) mode keeps the illustrative
            mock content. */}
        {isReal ? (
          <div>
            <h3
              className="text-lg font-bold text-[var(--obsidian)] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent Activity
            </h3>
            <div className="flex items-center gap-3 px-4 py-6 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-tertiary)]">
              <TrendingUp className="w-4 h-4 shrink-0" />
              Order and buyer activity isn&apos;t published for this supplier yet.
            </div>
          </div>
        ) : (
          <>
            {/* Top Buyer Countries */}
            <div>
              <h3
                className="text-lg font-bold text-[var(--obsidian)] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Top Buyer Countries
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {SUPPLIER.socialProof.topBuyerCountries.map((c, i) => (
                  <div
                    key={c.country}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
                  >
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{c.country}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{c.orders} orders</div>
                    </div>
                    <span className="text-xs font-semibold text-[var(--amber-dark)]">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div>
              <h3
                className="text-lg font-bold text-[var(--obsidian)] mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {SUPPLIER.socialProof.recentTransactions.map((tx) => (
                  <div
                    key={tx.date + tx.buyer}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--success)]/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.product}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{tx.buyer} · {tx.date}</div>
                    </div>
                    <span
                      className="text-sm font-bold text-[var(--obsidian)] shrink-0"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Certifications */}
        <div className="p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
          <h4
            className="text-sm font-bold text-[var(--obsidian)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Certifications
          </h4>
          {supplier.certifications.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)]">No certifications listed yet.</p>
          ) : (
            <div className="space-y-3">
              {supplier.certifications.map((cert) => (
                <div
                  key={cert}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]"
                >
                  <ShieldCheck className="w-4 h-4 text-[var(--success)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{cert}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
          <h4
            className="text-sm font-bold text-[var(--obsidian)] mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Contact Information
          </h4>
          <div className="space-y-3">
            {/* Phone/email/named contact aren't in the companies schema yet —
                only shown in demo mode, never fabricated for a real supplier. */}
            {!isReal && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <span className="text-[var(--text-primary)]">{SUPPLIER.contactPerson}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <span className="text-[var(--text-secondary)]">{SUPPLIER.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                  <span className="text-[var(--text-secondary)]">{SUPPLIER.email}</span>
                </div>
              </>
            )}
            {supplier.website && (
              <div className="flex items-center gap-3 text-sm">
                <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                <span className="text-[var(--indigo-light)]">{supplier.website}</span>
              </div>
            )}
            {isReal && !supplier.website && (
              <p className="text-sm text-[var(--text-tertiary)]">
                No public contact details listed yet — use Send Inquiry below.
              </p>
            )}
          </div>
          <button className="mt-5 btn-primary w-full !rounded-xl !py-3 !text-sm">
            <MessageSquare className="w-4 h-4" />
            Send Inquiry
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Reviews Tab ---------- */
function ReviewsTab({
  reviews,
  isReal,
  rating,
  totalReviews,
  qualityScore,
  communicationScore,
  shippingScore,
}: {
  reviews: RealSupplierReview[];
  isReal: boolean;
  rating: number;
  totalReviews: number;
  qualityScore?: number;
  communicationScore?: number;
  shippingScore?: number;
}) {
  if (isReal) {
    const dims = (
      [
        { label: "Product Quality", value: qualityScore },
        { label: "Communication", value: communicationScore },
        { label: "Shipping Speed", value: shippingScore },
      ] as { label: string; value: number | undefined }[]
    ).filter((d) => d.value != null) as { label: string; value: number }[];

    return (
      <div>
        {/* Summary bar */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] mb-8">
          <div className="text-center sm:text-left sm:pr-8 sm:border-r border-[var(--border-subtle)]">
            <div
              className="text-5xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {totalReviews > 0 ? rating : "-"}
            </div>
            <div className="flex justify-center sm:justify-start gap-0.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(rating)
                      ? "text-[var(--amber)] fill-[var(--amber)]"
                      : "text-[var(--border-strong)]"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{totalReviews} reviews</p>
          </div>

          {dims.length > 0 && (
            <div className="flex-1 grid grid-cols-3 gap-4">
              {dims.map((dim) => (
                <div key={dim.label}>
                  <div className="text-xs text-[var(--text-tertiary)] mb-2">{dim.label}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--amber)]"
                        style={{ width: `${(dim.value / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] w-7 text-right">
                      {dim.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review list */}
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Star className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No reviews yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Be the first buyer to review this supplier after an order.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review) => {
              const dimensions = (
                [
                  { key: "quality", value: review.productQualityRating },
                  { key: "communication", value: review.communicationRating },
                  { key: "shipping", value: review.shippingRating },
                ] as { key: string; value: number | null }[]
              ).filter((d) => d.value != null) as { key: string; value: number }[];

              return (
                <div
                  key={review.id}
                  className="p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center text-xs font-bold text-[var(--amber-dark)]">
                        {initialsFromName(review.reviewerName ?? "Buyer")}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {review.reviewerName ?? "Verified Buyer"}
                        </div>
                        {review.reviewerCompany && (
                          <div className="text-xs text-[var(--text-tertiary)]">{review.reviewerCompany}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating
                              ? "text-[var(--amber)] fill-[var(--amber)]"
                              : "text-[var(--border-strong)]"
                          }`}
                        />
                      ))}
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]">
                        <BadgeCheck className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>

                  {review.title && (
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{review.title}</p>
                  )}
                  {review.content && (
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{review.content}</p>
                  )}

                  {review.images.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {review.images.slice(0, 4).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover border border-[var(--border-subtle)]"
                        />
                      ))}
                      {review.images.length > 4 && (
                        <div className="w-16 h-16 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--text-tertiary)]">
                          +{review.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {dimensions.length > 0 && (
                    <div className="flex gap-4">
                      {dimensions.map((d) => (
                        <div key={d.key} className="flex items-center gap-1.5 text-xs">
                          <span className="text-[var(--text-tertiary)] capitalize">{d.key}:</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < d.value ? "bg-[var(--amber)]" : "bg-[var(--border-subtle)]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-col sm:flex-row gap-6 p-6 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] mb-8">
        <div className="text-center sm:text-left sm:pr-8 sm:border-r border-[var(--border-subtle)]">
          <div
            className="text-5xl font-bold text-[var(--obsidian)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {SUPPLIER.rating}
          </div>
          <div className="flex justify-center sm:justify-start gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(SUPPLIER.rating)
                    ? "text-[var(--amber)] fill-[var(--amber)]"
                    : "text-[var(--border-strong)]"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {SUPPLIER.totalReviews} reviews
          </p>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-4">
          {[
            { label: "Product Quality", value: SUPPLIER.qualityScore },
            { label: "Communication", value: SUPPLIER.communicationScore },
            { label: "Shipping Speed", value: SUPPLIER.shippingScore },
          ].map((dim) => (
            <div key={dim.label}>
              <div className="text-xs text-[var(--text-tertiary)] mb-2">{dim.label}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--amber)]"
                    style={{ width: `${(dim.value / 5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)] w-7 text-right">
                  {dim.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-5">
        {REVIEWS.map((review) => (
          <div
            key={review.id}
            className="p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center text-xs font-bold text-[var(--amber-dark)]">
                  {review.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {review.buyer}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {review.company} · {review.country}
                  </div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">{review.date}</div>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < review.rating
                        ? "text-[var(--amber)] fill-[var(--amber)]"
                        : "text-[var(--border-strong)]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                for {review.product}
              </span>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              {review.comment}
            </p>

            {/* Review images placeholder */}
            {review.images > 0 && (
              <div className="flex gap-2 mb-4">
                {Array.from({ length: Math.min(review.images, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-16 h-16 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center"
                  >
                    <ImageIcon className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                ))}
                {review.images > 4 && (
                  <div className="w-16 h-16 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-semibold text-[var(--text-tertiary)]">
                    +{review.images - 4}
                  </div>
                )}
              </div>
            )}

            {/* Dimension scores + helpful */}
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                {Object.entries(review.dimensions).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span className="text-[var(--text-tertiary)] capitalize">{key}:</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < value ? "bg-[var(--amber)]" : "bg-[var(--border-subtle)]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" />
                Helpful ({review.helpful})
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Factory Gallery Tab ---------- */
// There is no factory-photo table anywhere in the schema (see
// database.types.ts) — a real supplier gets an honest empty state instead of
// the same twelve stock-gradient tiles every storefront used to show.
function GalleryTab({ isReal }: { isReal: boolean }) {
  if (isReal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ImageIcon className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mb-3" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">No photos yet</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          This supplier hasn&apos;t uploaded factory photos or video.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xl">
        Tour our {SUPPLIER.factorySize} manufacturing facility in {SUPPLIER.city}, {SUPPLIER.province}. Our facility houses {SUPPLIER.productionLines} production lines and a dedicated R&D center with {SUPPLIER.rdStaff}+ engineers.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {FACTORY_GALLERY.map((item, i) => (
          <div
            key={item.label}
            className={`group relative rounded-xl overflow-hidden border border-[var(--border-subtle)] hover:shadow-lg transition-all cursor-pointer ${
              i === 0 ? "col-span-2 row-span-2 h-80 lg:h-96" : "h-44 lg:h-52"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {i === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 text-white ml-1" />
                  </div>
                  <span className="text-sm font-medium text-white/80">Factory Tour Video</span>
                </div>
              ) : (
                <ImageIcon className="w-10 h-10 text-white/20" />
              )}
            </div>

            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent">
              <span className="text-sm font-medium text-white">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   PAGE COMPONENT
   ========================================================================== */

export interface RealSupplierProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  moq: number;
  isFeatured: boolean;
  image: string | null;
}

export interface RealSupplierReview {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  reviewerName: string | null;
  reviewerCompany: string | null;
  createdAt: string;
  communicationRating: number | null;
  productQualityRating: number | null;
  shippingRating: number | null;
  images: string[];
  isVerifiedPurchase: boolean;
}

export interface StorefrontProps {
  supplierData?: {
    name: string;
    nameLocal?: string;
    slug: string;
    logoUrl?: string;
    website?: string;
    city?: string;
    province?: string;
    country: string;
    description?: string;
    verified: boolean;
    tier: string;
    rating: number;
    totalReviews: number;
    totalOrders: number;
    responseRate: number;
    onTimeDelivery: number;
    certifications: string[];
    established?: number;
    employees?: string;
    qualityScore?: number;
    communicationScore?: number;
    shippingScore?: number;
    products: RealSupplierProduct[];
    reviews: RealSupplierReview[];
  } | null;
}

export function StorefrontClient({ supplierData }: StorefrontProps) {
  // supplierData is only non-null once a real company has been resolved by
  // the server component — every tab below switches on this flag so a real
  // supplier never renders another company's mock products/reviews/photos.
  const isReal = !!supplierData;

  // If real data is provided, override SUPPLIER with it
  const supplier: SupplierView = supplierData ? {
    ...SUPPLIER,
    name: supplierData.name,
    nameZh: supplierData.nameLocal ?? null,
    slug: supplierData.slug,
    logo: initialsFromName(supplierData.name),
    logoUrl: supplierData.logoUrl ?? null,
    website: supplierData.website ?? null,
    city: supplierData.city ?? null,
    province: supplierData.province ?? null,
    country: supplierData.country === "CN" ? "China" : supplierData.country === "GH" ? "Ghana" : supplierData.country,
    description: supplierData.description ?? null,
    verified: supplierData.verified,
    goldSupplier: supplierData.tier === "gold" || supplierData.tier === "verified",
    rating: supplierData.rating,
    totalReviews: supplierData.totalReviews,
    totalTransactions: supplierData.totalOrders,
    responseRate: `${supplierData.responseRate}%`,
    onTimeDelivery: `${supplierData.onTimeDelivery}%`,
    certifications: supplierData.certifications,
    established: supplierData.established ?? null,
    employees: supplierData.employees ?? null,
  } : { ...SUPPLIER, logoUrl: null };

  const realProducts = supplierData?.products ?? [];
  const realReviews = supplierData?.reviews ?? [];

  const [activeTab, setActiveTab] = useState<TabKey>("products");

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    {
      key: "products",
      label: "Products",
      count: isReal ? realProducts.length : PRODUCT_CATEGORIES.reduce((s, c) => s + c.count, 0),
    },
    { key: "profile", label: "Company Profile" },
    { key: "reviews", label: "Reviews", count: supplier.totalReviews },
    { key: "gallery", label: "Factory Gallery" },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[184px] bg-[var(--surface-secondary)] min-h-screen">
        <SupplierHero supplier={supplier} isReal={isReal} />
        <PerformanceStrip supplier={supplier} isReal={isReal} />

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 mt-8">
          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-[var(--amber)] text-[var(--obsidian)]"
                    : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-[var(--amber)]/10 text-[var(--amber-dark)]"
                        : "bg-[var(--surface-secondary)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-8 pb-16">
            {activeTab === "products" && <ProductsTab products={realProducts} isReal={isReal} />}
            {activeTab === "profile" && <ProfileTab supplier={supplier} isReal={isReal} />}
            {activeTab === "reviews" && (
              <ReviewsTab
                reviews={realReviews}
                isReal={isReal}
                rating={supplier.rating}
                totalReviews={supplier.totalReviews}
                qualityScore={supplierData?.qualityScore}
                communicationScore={supplierData?.communicationScore}
                shippingScore={supplierData?.shippingScore}
              />
            )}
            {activeTab === "gallery" && <GalleryTab isReal={isReal} />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
