import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/queries/user";
import { canBuy, canSupply } from "@/lib/company-access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Factory, ArrowRight, UserPlus } from "lucide-react";

type RoleKey = "buyer" | "supplier";

const LABEL: Record<RoleKey, string> = {
  buyer: "Buyer",
  supplier: "Supplier",
};

const PORTAL: Record<RoleKey, string> = {
  buyer: "/dashboard",
  supplier: "/supplier/dashboard",
};

export default async function RoleMismatchPage({
  searchParams,
}: {
  searchParams: Promise<{ wanted?: string }>;
}) {
  const { wanted: wantedParam } = await searchParams;
  const wanted: RoleKey = wantedParam === "supplier" ? "supplier" : "buyer";

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const hasBuyer = user.company_members.some((m) =>
    canBuy(m.companies?.type)
  );
  const hasSupplier = user.company_members.some((m) =>
    canSupply(m.companies?.type)
  );
  const hasWanted = wanted === "buyer" ? hasBuyer : hasSupplier;

  // Already qualifies — send to the requested portal.
  if (hasWanted) redirect(PORTAL[wanted]);

  // No memberships at all — regular onboarding.
  if (!hasBuyer && !hasSupplier) redirect("/onboarding");

  const have: RoleKey = hasBuyer ? "buyer" : "supplier";
  const WantedIcon = wanted === "buyer" ? ShoppingCart : Factory;
  const HaveIcon = have === "buyer" ? ShoppingCart : Factory;

  return (
    <Card className="border-[var(--border-subtle)] shadow-lg">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--amber-glow)] flex items-center justify-center mx-auto mb-2">
          <WantedIcon className="size-6 text-[var(--amber-dark)]" />
        </div>
        <CardTitle className="text-xl">
          {LABEL[wanted]} portal — profile required
        </CardTitle>
        <CardDescription>
          Your account is registered as a <strong>{LABEL[have]}</strong> only.
          {wanted === "supplier"
            ? " Supplier accounts are approved by our team — submit an application and we'll be in touch. Or head back to your buyer portal."
            : ` To enter the ${LABEL[wanted]} portal, add a ${LABEL[wanted]} profile to this account — or head back to your ${LABEL[have]} portal.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {wanted === "supplier" ? (
          <Button asChild className="w-full">
            <Link href="/request-supplier-account">
              <UserPlus className="size-4" />
              Request a supplier account
            </Link>
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/onboarding/add-role?type=${wanted}`}>
              <UserPlus className="size-4" />
              Add a {LABEL[wanted]} profile
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" className="w-full">
          <Link href={PORTAL[have]}>
            <HaveIcon className="size-4" />
            Go to my {LABEL[have]} portal
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
