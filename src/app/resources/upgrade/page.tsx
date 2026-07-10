import { redirect } from "next/navigation";

// Plan-tier pricing is disabled for now — RFQs and quotations are free for
// all companies on the Resources portal. Restore the plan cards here (see
// git history) to bring pricing back.
export default function ResourcesUpgradePage() {
  redirect("/resources");
}
