import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "fr", "sw", "pt", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  fr: "Français",
  sw: "Kiswahili",
  pt: "Português",
  ar: "العربية",
};

export const rtlLocales: Locale[] = ["ar"];
