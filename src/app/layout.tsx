import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
import { ServiceWorkerRegistration } from "@/components/pwa/sw-register";
import { rtlLocales, type Locale } from "@/i18n/routing";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silk Road Africa — China-Africa B2B Trade Platform",
  description:
    "The premier bidirectional B2B marketplace connecting Chinese manufacturers with African businesses and African producers with Chinese importers. Trade assurance, escrow payments, and verified suppliers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SilkRoad",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4A853",
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
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
