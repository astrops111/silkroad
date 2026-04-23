import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries/user";
import { getCompanyWithProfile } from "@/lib/queries/supplier";
import { canSupply } from "@/lib/company-access";
import SettingsForm from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SupplierSettingsPage() {
  const user = await getCurrentUser();
  const membership = user?.company_members?.[0];

  if (!membership || !canSupply(membership.companies?.type)) {
    redirect("/dashboard");
  }

  const company = await getCompanyWithProfile(membership.company_id);
  if (!company) redirect("/dashboard");

  const p = company.supplier_profile;

  return (
    <SettingsForm
      companyId={company.id}
      initial={{
        company: {
          name: company.name,
          nameLocal: company.name_local ?? "",
          description: company.description ?? "",
          website: company.website ?? "",
          industry: company.industry ?? "",
          countryCode: company.country_code,
          city: company.city ?? "",
          stateProvince: company.state_province ?? "",
          address: company.address ?? "",
          logoUrl: company.logo_url ?? "",
          establishedYear: company.established_year?.toString() ?? "",
          employeeCountRange: company.employee_count_range ?? "",
          marketRegion: company.market_region,
          taxId: company.tax_id ?? "",
          taxIdType: company.tax_id_type ?? "",
        },
        profile: {
          factoryAddress: p?.factory_address ?? "",
          factoryCity: p?.factory_city ?? "",
          factoryCountry: p?.factory_country ?? "",
          businessLicenseUrl: p?.business_license_url ?? "",
          moqDefault: p?.moq_default?.toString() ?? "",
          leadTimeDaysDefault: p?.lead_time_days_default?.toString() ?? "",
          tradeTermsDefault: p?.trade_terms_default ?? "fob",
          certifications: p?.certifications ?? [],
          bankCode: p?.bank_code ?? "",
          bankAccountNumber: p?.bank_account_number ?? "",
          bankAccountName: p?.bank_account_name ?? "",
          bankBranch: p?.bank_branch ?? "",
          mobileMoneyNumber: p?.mobile_money_number ?? "",
          mobileMoneyProvider: p?.mobile_money_provider ?? "",
        },
      }}
      verification={{
        status: company.verification_status ?? "unverified",
        tier: p?.tier ?? "free",
      }}
    />
  );
}
