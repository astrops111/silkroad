import { redirect } from "next/navigation";

// Plan-tier pricing is disabled for now — all supplier features are free.
// Restore the tier cards here (see git history) to bring pricing back.
export default function SubscriptionPage() {
  redirect("/supplier/dashboard");
}
