import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import { getVerificationStatus } from "@/lib/actions/verification";
import VerificationForm from "./verification-form";

export const dynamic = "force-dynamic";

export default async function SupplierVerificationPage() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) => canSupply(m.companies?.type));
  if (!membership) {
    redirect("/dashboard");
  }

  const verification = await getVerificationStatus(membership.company_id);

  return (
    <VerificationForm
      companyId={membership.company_id}
      initialStatus={(verification.status ?? "unverified") as "unverified" | "pending" | "verified" | "rejected" | "expired"}
      initialTaxId={verification.taxId ?? ""}
      initialTaxIdType={verification.taxIdType ?? ""}
      initialBusinessLicenseUrl={verification.businessLicenseUrl ?? ""}
    />
  );
}
