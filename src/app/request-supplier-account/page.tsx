import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/queries/user";
import { getCategories } from "@/lib/queries/categories";
import { canSupply } from "@/lib/company-access";
import RequestSupplierForm from "./request-supplier-form";

export const dynamic = "force-dynamic";

export default async function RequestSupplierAccountPage() {
  const user = await getCurrentUser();

  // If the user already has a company that can supply (supplier or both),
  // skip the form — they don't need to request a new profile.
  if (user?.company_members?.some((m) => canSupply(m.companies?.type))) {
    redirect("/supplier/dashboard");
  }

  const categories = await getCategories();
  const topLevel = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const hdrs = await headers();
  const locale = hdrs.get("x-next-intl-locale") ?? undefined;

  return (
    <RequestSupplierForm
      prefill={{
        fullName: user?.full_name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
      }}
      categories={topLevel.map((c) => ({
        slug: c.slug,
        name: c.name,
      }))}
      locale={locale}
    />
  );
}
