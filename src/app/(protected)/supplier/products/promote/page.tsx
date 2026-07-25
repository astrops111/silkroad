import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { canSupply } from "@/lib/company-access";
import PromoteClient from "./promote-client";

export const dynamic = "force-dynamic";

export default async function PromotePage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const membership = user?.company_members?.find((m) => canSupply(m.companies?.type));
  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <PromoteClient
      companyId={membership.company_id}
      initialProductId={params.productId}
    />
  );
}
