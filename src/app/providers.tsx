"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/providers/query-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { RegionProvider } from "@/lib/providers/region-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <RegionProvider>
          {children}
          <Toaster position="top-right" richColors />
        </RegionProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
