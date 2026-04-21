"use server";

import { cookies } from "next/headers";
import { routing, type Locale } from "./routing";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setUserLocale(locale: Locale): Promise<void> {
  if (!routing.locales.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const store = await cookies();
  store.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}
