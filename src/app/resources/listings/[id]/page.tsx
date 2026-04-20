import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getResourceListing } from "@/lib/queries/resources";
import { getCallerTierStatus } from "@/lib/auth/tier";

export default async function ResourceListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("resources.detail");

  let listing: Awaited<ReturnType<typeof getResourceListing>> = null;
  try {
    listing = await getResourceListing(id);
  } catch {
    // DB unavailable — fall through to 404
  }

  if (!listing) notFound();

  const tier = await getCallerTierStatus();

  const uom =
    listing.unit_of_measure ?? listing.resource_categories?.unit_of_measure ?? "unit";
  const cat = listing.resource_categories;
  const assayEntries = listing.assay
    ? Object.entries(listing.assay as Record<string, unknown>)
    : [];

  const complianceRefs: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Kimberley", value: (listing as { kimberley_cert_ref?: string | null }).kimberley_cert_ref },
    { label: "OECD 3TG", value: (listing as { oecd_3tg_due_diligence_ref?: string | null }).oecd_3tg_due_diligence_ref },
    { label: "CITES", value: (listing as { cites_permit_ref?: string | null }).cites_permit_ref },
    { label: "GACC", value: (listing as { gacc_registration_ref?: string | null }).gacc_registration_ref },
    { label: t("mineLicense"), value: (listing as { mine_license_ref?: string | null }).mine_license_ref },
    { label: t("exportPermit"), value: (listing as { export_permit_ref?: string | null }).export_permit_ref },
  ].filter((c) => c.value);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
      <nav className="text-xs text-slate-400 mb-6 flex items-center gap-2">
        <Link href="/resources" className="hover:text-white">
          {t("breadcrumbHome")}
        </Link>
        <span>/</span>
        <Link href="/resources/listings" className="hover:text-white">
          {t("breadcrumbListings")}
        </Link>
        {cat && (
          <>
            <span>/</span>
            <Link
              href={`/resources/listings?group=${cat.group_code}`}
              className="hover:text-white"
            >
              {cat.name_en}
            </Link>
          </>
        )}
      </nav>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10">
        <div>
          <div className="aspect-[4/3] rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center text-slate-500">
            {listing.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.images[0]}
                alt={listing.name_en}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{cat?.name_en ?? listing.category}</span>
            )}
          </div>
          {listing.images && listing.images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {listing.images.slice(1, 5).map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-white/5 overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider mb-3">
            {listing.origin_country}
            {listing.origin_region && <span>· {listing.origin_region}</span>}
          </div>
          <h1 className="text-3xl font-semibold leading-tight mb-2">
            {listing.name_en}
          </h1>
          {listing.name_zh && (
            <p className="text-slate-300 mb-4">{listing.name_zh}</p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-6">
            <div>
              <div className="text-xs text-slate-400">{t("price")}</div>
              <div className="text-xl font-semibold">
                {listing.price_per_unit_usd != null
                  ? `$${listing.price_per_unit_usd.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}/${uom}`
                  : "POA"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t("incoterm")}</div>
              <div className="text-xl font-semibold">
                {listing.incoterm?.toUpperCase() ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t("available")}</div>
              <div>
                {listing.available_quantity != null
                  ? `${listing.available_quantity.toLocaleString()} ${uom}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t("moq")}</div>
              <div>
                {listing.min_order_quantity != null
                  ? `${listing.min_order_quantity.toLocaleString()} ${uom}`
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t("loadPort")}</div>
              <div>{listing.port_of_loading ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t("dischargePort")}</div>
              <div>{listing.port_of_discharge ?? "—"}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {tier.isPaid ? (
              <Link
                href={`/resources/rfqs/new?commodity=${listing.id}`}
                className="px-5 py-2.5 rounded-md bg-[var(--amber)] text-black font-medium hover:opacity-90"
              >
                {t("ctaRfq")}
              </Link>
            ) : (
              <Link
                href="/resources/upgrade"
                className="px-5 py-2.5 rounded-md bg-[var(--amber)] text-black font-medium hover:opacity-90 inline-flex items-center gap-2"
                title={t("ctaRfqLocked")}
              >
                <span aria-hidden>★</span>
                {t("ctaRfqLocked")}
              </Link>
            )}
            <Link
              href={`/messages/new?to=${listing.tenant_id}`}
              className="px-5 py-2.5 rounded-md border border-white/20 hover:bg-white/5"
            >
              {t("ctaContact")}
            </Link>
          </div>
        </div>
      </div>

      {assayEntries.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold mb-4">{t("assay")}</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 border border-white/10 rounded-xl p-6">
            {assayEntries.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-400 uppercase tracking-wider">
                  {k}
                </dt>
                <dd className="text-sm mt-1">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {complianceRefs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-4">{t("compliance")}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {complianceRefs.map((c) => (
              <li
                key={c.label}
                className="border border-white/10 rounded-lg px-4 py-3 text-sm"
              >
                <div className="text-xs text-slate-400">{c.label}</div>
                <div>{c.value}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {listing.companies && (
        <section className="mt-12 border-t border-white/10 pt-10">
          <h2 className="text-xl font-semibold mb-4">{t("supplier")}</h2>
          <Link
            href={`/suppliers/${listing.companies.slug ?? listing.companies.id}`}
            className="inline-flex items-center gap-3 text-sm hover:text-[var(--amber)]"
          >
            <span className="font-medium">{listing.companies.name}</span>
            {listing.companies.verification_status === "verified" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {t("verified")}
              </span>
            )}
            <span>·</span>
            <span className="text-slate-400">
              {listing.companies.country_code ?? ""}
            </span>
          </Link>
        </section>
      )}
    </div>
  );
}
