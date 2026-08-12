import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimGuestRfqs } from "@/lib/rfq/claim-guest-rfqs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Email is confirmed at this point, which is the gate claimGuestRfqs
      // requires — adopt any RFQs sent anonymously from the public cart.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await claimGuestRfqs(user.id);

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth-code-error`);
}
