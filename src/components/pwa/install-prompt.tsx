"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 p-4 rounded-xl bg-[var(--obsidian)] text-[var(--ivory)] shadow-xl border border-white/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--amber)] flex items-center justify-center shrink-0">
          <span className="font-black text-[var(--obsidian)] text-sm" style={{ fontFamily: "var(--font-display)" }}>
            SR
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Install SilkRoad Africa</p>
          <p className="text-xs text-white/50 mt-0.5">
            Get faster access and work offline
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} className="bg-[var(--amber)] text-[var(--obsidian)] hover:bg-[var(--amber-light)]">
              <Download className="w-3.5 h-3.5" />
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="text-white/50 hover:text-white/70">
              <X className="w-3.5 h-3.5" />
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
