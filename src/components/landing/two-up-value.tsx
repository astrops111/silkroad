import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Truck } from "lucide-react";

export function TwoUpValue() {
  return (
    <section className="py-16 lg:py-24 bg-[var(--surface-primary)]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-5">
          <Link
            href="/trade-assurance"
            className="group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl min-h-[360px] lg:min-h-[420px] p-8 lg:p-10 border border-[var(--border-subtle)]"
          >
            <Image
              src="https://images.pexels.com/photos/33175650/pexels-photo-33175650.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Two professionals shaking hands at a business meeting"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03] -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--amber)]/20 border border-[var(--amber)]/30 backdrop-blur-md mb-5 w-fit">
              <Shield className="w-5 h-5 text-[var(--amber)]" />
            </div>
            <h3
              className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight max-w-md"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Trade assurance on every order.
            </h3>
            <p className="mt-3 text-sm lg:text-base text-white/80 max-w-md leading-relaxed">
              Funds held in escrow until delivery is confirmed. Disputes
              mediated by Silk Road operations — not the supplier, not the
              buyer.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:gap-2.5 transition-all">
              How it works
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            href="/logistics"
            className="group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl min-h-[360px] lg:min-h-[420px] p-8 lg:p-10 border border-[var(--border-subtle)]"
          >
            <Image
              src="https://images.pexels.com/photos/5860937/pexels-photo-5860937.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="Warehouse logistics interior"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03] -z-10"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--terracotta-light)]/25 border border-[var(--terracotta-light)]/30 backdrop-blur-md mb-5 w-fit">
              <Truck className="w-5 h-5 text-[var(--terracotta-light)]" />
            </div>
            <h3
              className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight max-w-md"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Owned logistics, door to door.
            </h3>
            <p className="mt-3 text-sm lg:text-base text-white/80 max-w-md leading-relaxed">
              Our fleet, our drivers, our bonded warehouses across 27 African
              countries. Real-time tracking, customs handling, insurance
              included.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:gap-2.5 transition-all">
              See coverage
              <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
