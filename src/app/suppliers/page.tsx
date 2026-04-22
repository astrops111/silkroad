import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getPublicSuppliers } from "@/lib/queries/supplier";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MapPin,
  ShieldCheck,
  Package,
  Clock,
  Search,
} from "lucide-react";

export default async function SuppliersPage() {
  let suppliers: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    country_code: string;
    city: string | null;
    description: string | null;
    verification_status: string;
    established_year: number | null;
    supplier_profiles: {
      tier: string;
      response_rate: number | null;
      on_time_delivery_rate: number | null;
      average_rating: number | null;
      total_orders: number;
    }[] | null;
  }[] = [];

  try {
    const result = await getPublicSuppliers({ limit: 20 });
    suppliers = result.suppliers as typeof suppliers;
  } catch {
    // DB not available
  }

  // Fallback demo suppliers if DB is empty
  if (suppliers.length === 0) {
    suppliers = [
      { id: "1", name: "Guangzhou HuaNan Precision Machinery Co.", slug: "huanan-precision-machinery", logo_url: null, country_code: "CN", city: "Guangzhou", description: "Leading manufacturer of CNC laser cutting machines and industrial automation.", verification_status: "verified", established_year: 2008, supplier_profiles: [{ tier: "gold", response_rate: 98, on_time_delivery_rate: 96.4, average_rating: 4.8, total_orders: 3240 }] },
      { id: "2", name: "Shenzhen DigiTech Electronics Ltd.", slug: "digitech-electronics", logo_url: null, country_code: "CN", city: "Shenzhen", description: "OEM/ODM manufacturer of smartphones, tablets, and consumer electronics.", verification_status: "verified", established_year: 2012, supplier_profiles: [{ tier: "gold", response_rate: 99, on_time_delivery_rate: 97.2, average_rating: 4.6, total_orders: 8910 }] },
      { id: "3", name: "Accra Exports Ltd", slug: "accra-exports", logo_url: null, country_code: "GH", city: "Accra", description: "Premium African agricultural exports — shea butter, cocoa, moringa, and spices.", verification_status: "verified", established_year: 2018, supplier_profiles: [{ tier: "verified", response_rate: 88, on_time_delivery_rate: 91, average_rating: 4.7, total_orders: 456 }] },
      { id: "4", name: "Jiangsu SunPower Energy Tech Co.", slug: "sunpower-energy-tech", logo_url: null, country_code: "CN", city: "Nanjing", description: "Tier 1 solar panel manufacturer with focus on African off-grid solutions.", verification_status: "verified", established_year: 2010, supplier_profiles: [{ tier: "gold", response_rate: 96, on_time_delivery_rate: 95.1, average_rating: 4.7, total_orders: 567 }] },
      { id: "5", name: "Zhejiang Silk Valley Textiles Inc.", slug: "silk-valley-textiles", logo_url: null, country_code: "CN", city: "Hangzhou", description: "Premium organic cotton garments and custom printing manufacturer.", verification_status: "verified", established_year: 2005, supplier_profiles: [{ tier: "verified", response_rate: 95, on_time_delivery_rate: 94.8, average_rating: 4.9, total_orders: 2340 }] },
      { id: "6", name: "Nairobi Fresh Commodities", slug: "nairobi-fresh", logo_url: null, country_code: "KE", city: "Nairobi", description: "East African specialty coffee, tea, and horticultural exports.", verification_status: "pending", established_year: 2020, supplier_profiles: [{ tier: "free", response_rate: 85, on_time_delivery_rate: 88, average_rating: 4.3, total_orders: 34 }] },
    ];
  }

  const countryNames: Record<string, string> = {
    CN: "China", GH: "Ghana", KE: "Kenya", NG: "Nigeria", ZA: "South Africa",
    TZ: "Tanzania", UG: "Uganda", EG: "Egypt", SN: "Senegal", RW: "Rwanda",
  };

  return (
    <>
      <Navbar />
      <main className="pt-[104px] lg:pt-[184px] min-h-screen bg-[var(--surface-secondary)]">
        {/* Header */}
        <div className="bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
            <h1
              className="text-2xl lg:text-3xl font-bold text-[var(--obsidian)] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Verified Suppliers
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Browse {suppliers.length}+ verified manufacturers and exporters across China and Africa
            </p>

            {/* Search */}
            <div className="mt-5 flex items-center h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] focus-within:border-[var(--amber)] transition-colors max-w-2xl">
              <Search className="w-4 h-4 ml-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search suppliers by name, product, or country..."
                className="w-full bg-transparent px-3 text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>

        {/* Supplier Grid */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => {
              const profile = supplier.supplier_profiles?.[0];
              const isVerified = supplier.verification_status === "verified";
              const tierColor = profile?.tier === "gold" ? "var(--amber)" : profile?.tier === "verified" ? "var(--success)" : "var(--text-tertiary)";

              return (
                <Link
                  key={supplier.id}
                  href={`/suppliers/${supplier.slug}`}
                  className="card-elevated block p-6 space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${tierColor} 12%, transparent)`,
                        color: tierColor,
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {supplier.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--obsidian)] text-sm leading-tight truncate">
                        {supplier.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <MapPin className="w-3 h-3" />
                          {supplier.city}, {countryNames[supplier.country_code] ?? supplier.country_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {isVerified && (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </Badge>
                    )}
                    {profile?.tier && profile.tier !== "free" && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {profile.tier}
                      </Badge>
                    )}
                    {supplier.established_year && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="w-3 h-3" />
                        Since {supplier.established_year}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                    {supplier.description}
                  </p>

                  {/* Metrics */}
                  {profile && (
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border-subtle)]">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3 h-3 fill-[var(--amber)] text-[var(--amber)]" />
                          <span className="text-sm font-bold text-[var(--obsidian)]">
                            {profile.average_rating?.toFixed(1) ?? "—"}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Rating</p>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-[var(--obsidian)]">
                          {profile.response_rate ?? 0}%
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Response</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3 h-3 text-[var(--text-tertiary)]" />
                          <span className="text-sm font-bold text-[var(--obsidian)]">
                            {profile.total_orders?.toLocaleString() ?? 0}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Orders</p>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
