import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const COOKIE_NAME = "NEXT_LOCALE";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Fall back to NEXT_LOCALE cookie (set by RegionPicker) before defaulting.
  if (!locale) {
    const store = await cookies();
    locale = store.get(COOKIE_NAME)?.value ?? undefined;
  }

  if (!locale || !routing.locales.includes(locale as typeof routing.locales[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
