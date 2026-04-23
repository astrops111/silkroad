import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Cookie Policy — Silk Road Africa",
  description:
    "What cookies and similar technologies Silk Road Africa uses, why, and how to manage them.",
};

const LAST_UPDATED = "April 23, 2026";

type CookieRow = {
  name: string;
  purpose: string;
  type: "Strictly necessary" | "Functional" | "Analytics" | "Marketing";
  retention: string;
};

const COOKIES: CookieRow[] = [
  {
    name: "sb-access-token / sb-refresh-token",
    purpose: "Supabase authentication — keeps you signed in.",
    type: "Strictly necessary",
    retention: "Session + 30 days",
  },
  {
    name: "sra_locale",
    purpose: "Stores your selected language (en, zh, fr).",
    type: "Functional",
    retention: "1 year",
  },
  {
    name: "sra_region",
    purpose:
      "Stores your selected buyer country, so prices and logistics options match your market.",
    type: "Functional",
    retention: "1 year",
  },
  {
    name: "sra_currency",
    purpose: "Stores your preferred display currency.",
    type: "Functional",
    retention: "1 year",
  },
  {
    name: "sra_cart",
    purpose: "Remembers cart contents for signed-out visitors.",
    type: "Functional",
    retention: "30 days",
  },
  {
    name: "_ga, _ga_*",
    purpose:
      "Google Analytics — measures aggregate traffic and page performance.",
    type: "Analytics",
    retention: "Up to 2 years",
  },
  {
    name: "sra_consent",
    purpose: "Records your cookie-consent choices.",
    type: "Strictly necessary",
    retention: "6 months",
  },
];

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="pt-[184px] pb-16 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
          <div className="max-w-[1000px] mx-auto px-6 lg:px-10">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-5">
              <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[var(--text-primary)]">Cookies</span>
            </div>
            <span className="text-xs font-semibold text-[var(--amber-dark)] tracking-[0.15em] uppercase">
              Legal
            </span>
            <h1
              className="mt-3 text-4xl lg:text-5xl font-bold tracking-tight text-[var(--obsidian)] leading-[1.05]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cookie Policy
            </h1>
            <p className="mt-4 text-sm text-[var(--text-tertiary)]">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="max-w-[900px] mx-auto px-6 lg:px-10 prose-legal">
            <p className="lead">
              Cookies are small text files that a website stores on your device.
              Silk Road Africa uses cookies and similar technologies (local
              storage, session storage) to keep you signed in, remember your
              preferences, measure platform performance, and, with consent,
              personalise marketing.
            </p>

            <h2>1. Categories we use</h2>
            <ul>
              <li>
                <strong>Strictly necessary</strong> — required for the site to
                function (authentication, security, consent record-keeping). These
                cannot be turned off.
              </li>
              <li>
                <strong>Functional</strong> — remember your language, currency,
                country, and cart. Disabling these will degrade the buying
                experience.
              </li>
              <li>
                <strong>Analytics</strong> — measure aggregate usage so we can
                improve pages. We use anonymised / IP-truncated collection.
              </li>
              <li>
                <strong>Marketing</strong> — used only with consent, to measure ad
                attribution. We do not run third-party ad retargeting on the buyer
                portal today.
              </li>
            </ul>

            <h2>2. Cookies we set</h2>
            <div className="overflow-x-auto -mx-6 lg:mx-0 my-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-left">
                    <th className="py-3 pr-4 font-semibold text-[var(--obsidian)]">Name</th>
                    <th className="py-3 pr-4 font-semibold text-[var(--obsidian)]">Purpose</th>
                    <th className="py-3 pr-4 font-semibold text-[var(--obsidian)]">Type</th>
                    <th className="py-3 font-semibold text-[var(--obsidian)]">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIES.map((c) => (
                    <tr
                      key={c.name}
                      className="border-b border-[var(--border-subtle)] align-top"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-[var(--text-primary)]">
                        {c.name}
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">
                        {c.purpose}
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">
                        {c.type}
                      </td>
                      <td className="py-3 text-[var(--text-tertiary)]">{c.retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>3. Third-party cookies</h2>
            <p>
              Some pages embed services that set their own cookies:
            </p>
            <ul>
              <li>
                <strong>Stripe</strong> — card-payment fraud prevention on checkout
                pages.
              </li>
              <li>
                <strong>Google Analytics</strong> — aggregate traffic measurement
                (with consent).
              </li>
              <li>
                <strong>YouTube / Vimeo</strong> — video embeds on marketing pages.
              </li>
            </ul>
            <p>
              Those services operate under their own privacy and cookie policies.
            </p>

            <h2>4. Managing cookies</h2>
            <ul>
              <li>
                Use the cookie banner on your first visit to accept or reject
                non-essential categories.
              </li>
              <li>
                Change your choice any time by clearing the{" "}
                <code>sra_consent</code> cookie or via browser settings.
              </li>
              <li>
                Most browsers let you block or delete cookies — note that blocking
                strictly-necessary cookies will break sign-in and checkout.
              </li>
              <li>
                On mobile, use your OS privacy settings to limit tracking.
              </li>
            </ul>

            <h2>5. Do Not Track</h2>
            <p>
              We honour the Global Privacy Control (GPC) signal as an opt-out of
              analytics and marketing cookies. We do not rely on the legacy DNT
              header because it is no longer consistently interpreted.
            </p>

            <h2>6. Changes</h2>
            <p>
              As we add or remove services, the cookies we use will change. This
              page and the in-app banner reflect the current list. For related
              topics see our{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2>7. Contact</h2>
            <p>
              Questions: <a href="mailto:privacy@silkroadafrica.com">privacy@silkroadafrica.com</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
