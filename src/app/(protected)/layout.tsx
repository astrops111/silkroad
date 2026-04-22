import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Minimal auth gate. We only verify there is a valid session here.
// Child layouts decide what to do with the session (render shells,
// fetch company info, etc.) using their own queries.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <>{children}</>;
}
