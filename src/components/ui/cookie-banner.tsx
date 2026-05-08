"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import {
  getConsent,
  setConsent,
  isConsentRecorded,
  type ConsentCategory,
} from "@/lib/consent";

const CATEGORIES: { key: ConsentCategory; label: string; description: string }[] = [
  {
    key: "functional",
    label: "Functional",
    description:
      "Remember your preferences such as region, currency, and language settings across visits.",
  },
  {
    key: "analytics",
    label: "Analytics",
    description:
      "Help us understand how visitors use the platform. Data is anonymised and cannot identify you personally.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description:
      "Allow us to show relevant product recommendations and measure the effectiveness of our campaigns.",
  },
];

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState<Record<ConsentCategory, boolean>>({
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Honour Global Privacy Control — auto-decline non-essential without showing UI.
    // https://globalprivacycontrol.org/
    if (
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    ) {
      if (!isConsentRecorded()) {
        setConsent({ functional: false, analytics: false, marketing: false });
      }
      return;
    }

    if (!isConsentRecorded()) {
      setVisible(true);
    }

    // Footer "Cookie settings" button dispatches this event to reopen preferences.
    function handleReopen() {
      const existing = getConsent();
      setPrefs({
        functional: existing?.functional ?? false,
        analytics: existing?.analytics ?? false,
        marketing: existing?.marketing ?? false,
      });
      setExpanded(true);
      setVisible(true);
    }

    window.addEventListener("open-cookie-prefs", handleReopen);
    return () => window.removeEventListener("open-cookie-prefs", handleReopen);
  }, []);

  function acceptAll() {
    setConsent({ functional: true, analytics: true, marketing: true });
    setVisible(false);
  }

  function rejectAll() {
    setConsent({ functional: false, analytics: false, marketing: false });
    setVisible(false);
  }

  function savePrefs() {
    setConsent(prefs);
    setVisible(false);
  }

  function toggle(key: ConsentCategory) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-stone-200 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        {/* Main bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Cookie
              className="mt-0.5 shrink-0 h-5 w-5 text-amber-600"
              aria-hidden
            />
            <p className="text-sm text-stone-700 leading-relaxed">
              We use cookies to improve your experience and understand how the
              platform is used. Read our{" "}
              <Link
                href="/cookies"
                className="underline underline-offset-2 text-amber-700 hover:text-amber-800"
              >
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 text-amber-700 hover:text-amber-800"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="text-sm text-stone-600 underline underline-offset-2 hover:text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 rounded"
            >
              Manage preferences
            </button>
            <button
              type="button"
              onClick={rejectAll}
              className="rounded-md border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            >
              Reject non-essential
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
            >
              Accept all
            </button>
          </div>
        </div>

        {/* Expandable category toggles */}
        {expanded && (
          <div className="mt-4 border-t border-stone-100 pt-4 space-y-4">
            {/* Strictly necessary — cannot be disabled */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  Strictly necessary
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Required for authentication, security, and core platform
                  functions. Cannot be disabled.
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-stone-500 bg-stone-100 rounded-full px-2.5 py-0.5 mt-0.5">
                Always on
              </span>
            </div>

            {CATEGORIES.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900">{label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={`Toggle ${label} cookies`}
                  onClick={() => toggle(key)}
                  className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 mt-0.5 ${
                    prefs[key] ? "bg-amber-600" : "bg-stone-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                      prefs[key] ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={savePrefs}
                className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
