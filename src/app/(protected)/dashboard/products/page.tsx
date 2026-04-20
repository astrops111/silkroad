"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Search, Loader2, ArrowRight } from "lucide-react";

interface RecentProduct {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  supplier_name: string;
  image_url: string | null;
}

export default function BuyerProductsPage() {
  const [recentlyViewed] = useState<RecentProduct[]>([]);
  const [frequentlyOrdered] = useState<RecentProduct[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Products
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          Browse, search, and reorder products from your suppliers
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/marketplace" className="p-6 rounded-2xl border transition-all hover:shadow-md group" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <Search className="w-6 h-6 mb-3" style={{ color: "var(--amber)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Browse Marketplace</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Search thousands of products from verified suppliers
          </p>
          <ArrowRight className="w-4 h-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-tertiary)" }} />
        </Link>
        <Link href="/dashboard/rfq/new" className="p-6 rounded-2xl border transition-all hover:shadow-md group" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
          <Package className="w-6 h-6 mb-3" style={{ color: "var(--indigo)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Create RFQ</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Describe what you need and let suppliers come to you
          </p>
          <ArrowRight className="w-4 h-4 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-tertiary)" }} />
        </Link>
      </div>

      {/* Recently viewed / frequently ordered - placeholder */}
      <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--surface-primary)", borderColor: "var(--border-subtle)" }}>
        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Your product history will appear here</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          Recently viewed and frequently ordered products will show up as you use the platform.
        </p>
      </div>
    </div>
  );
}
