import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Factory,
  LogOut,
  ShoppingCart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PortalKey = "buyer" | "supplier";

const LABEL: Record<PortalKey, string> = {
  buyer: "buyer",
  supplier: "supplier",
};

const PATH: Record<PortalKey, string> = {
  buyer: "/dashboard",
  supplier: "/supplier/dashboard",
};

/**
 * In-place panel shown on a portal route (/dashboard or /supplier/dashboard)
 * when the signed-in user has no membership matching that portal.
 *
 * The URL stays where the user requested — no auto-redirect to the other
 * portal — so the tab choice on the login form is respected.
 */
export function NoProfilePanel({
  wantedPortal,
  userEmail,
  hasOtherPortal,
}: {
  wantedPortal: PortalKey;
  userEmail: string | null;
  hasOtherPortal: boolean;
}) {
  const other: PortalKey = wantedPortal === "buyer" ? "supplier" : "buyer";
  const Icon = wantedPortal === "buyer" ? ShoppingCart : Factory;
  const OtherIcon = other === "buyer" ? ShoppingCart : Factory;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-secondary)] px-4 py-10">
      <Card className="w-full max-w-md border-[var(--border-subtle)] shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--amber)]/15 flex items-center justify-center">
            <Icon className="w-6 h-6 text-[var(--amber-dark)]" />
          </div>
          <CardTitle className="mt-2 text-xl">
            No active {LABEL[wantedPortal]} profile
          </CardTitle>
          <CardDescription>
            {userEmail ? (
              <>
                You&apos;re signed in as <strong>{userEmail}</strong>, but this
                account doesn&apos;t have a {LABEL[wantedPortal]} profile yet.
              </>
            ) : (
              <>
                This account doesn&apos;t have a {LABEL[wantedPortal]} profile
                yet.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {wantedPortal === "buyer" ? (
            <>
              <div className="rounded-md border border-[var(--amber)]/30 bg-[var(--amber)]/8 p-4 text-sm flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 text-[var(--amber-dark)] shrink-0" />
                <p className="text-[var(--text-primary)]">
                  Sorry, you do not have an active buyer profile — would you
                  like to create one?
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/onboarding/add-role?type=buyer">
                  Yes, create a buyer profile
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-md border border-[var(--amber)]/30 bg-[var(--amber)]/8 p-4 text-sm flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 text-[var(--amber-dark)] shrink-0" />
                <p className="text-[var(--text-primary)]">
                  Supplier accounts are approved by our team. Submit a short
                  application and we&apos;ll be in touch within 2 business days.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/request-supplier-account">
                  Request a supplier account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </>
          )}

          {hasOtherPortal && (
            <Button asChild variant="outline" className="w-full">
              <Link href={PATH[other]}>
                <OtherIcon className="size-4" />
                Go to my {LABEL[other]} portal instead
              </Link>
            </Button>
          )}

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-[var(--text-tertiary)]"
          >
            <Link href="/auth/logout">
              <LogOut className="size-4" />
              Sign out and try a different account
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
