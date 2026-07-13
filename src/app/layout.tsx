import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register";
import { ShoppingAssistantWidget } from "@/components/ai/shopping-assistant-widget";
import { rtlLocales, type Locale } from "@/i18n/routing";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silk Road Africa — World-Africa B2B Trade Platform",
  description:
    "The premier bidirectional B2B marketplace connecting manufacturers worldwide with African businesses and African producers with importers worldwide. Verified suppliers and door-to-door logistics.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SilkRoad",
  },
};

export const viewport: Viewport = {
  themeColor: "#D89F2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            {/* Buyer chatbot on all public pages; mounted in the root layout so
                it survives client-side navigation. Hides itself on admin/auth. */}
            <ShoppingAssistantWidget />
          </Providers>
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
