import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers
) {
  const initialRequestConfig = requestHeaders
    ? { headers: requestHeaders }
    : request;
  let supabaseResponse = NextResponse.next({ request: initialRequestConfig });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase URL/Key in middleware! URL:", !!url, "Key:", !!anonKey);
  }

  const supabase = createServerClient(
    url || "https://placeholder.supabase.co",
    anonKey || "placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: initialRequestConfig });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
