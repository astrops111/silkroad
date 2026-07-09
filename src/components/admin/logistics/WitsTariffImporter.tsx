"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WITS_REPORTER_CODES } from "@/lib/logistics/tariffs/wits";

interface ImportResponse {
  success: boolean;
  imported: { hsCode: string; destinationCountry: string; dutyPct: number; year: number }[];
  skipped: { hsCode: string; destinationCountry: string; reason: string }[];
  error?: string;
}

const MAX_PAIRS_CLIENT = 20; // mirrors MAX_PAIRS in /api/admin/tariffs/import-wits

export function WitsTariffImporter({ portCountries }: { portCountries: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hsCodesText, setHsCodesText] = useState("");
  const [countries, setCountries] = useState<Set<string>>(new Set());
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  // Only offer countries this platform actually has ports for AND WITS can report on.
  const availableCountries = useMemo(
    () => portCountries.filter((c) => c in WITS_REPORTER_CODES).sort(),
    [portCountries]
  );

  function toggleCountry(code: string) {
    setCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const hsCodes = useMemo(
    () =>
      hsCodesText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [hsCodesText]
  );
  const pairCount = hsCodes.length * countries.size;

  async function runImport() {
    if (hsCodes.length === 0) {
      toast.error("Enter at least one 6-digit HS code");
      return;
    }
    if (countries.size === 0) {
      toast.error("Select at least one destination country");
      return;
    }
    if (pairCount > MAX_PAIRS_CLIENT) {
      toast.error(`${pairCount} combinations requested — max ${MAX_PAIRS_CLIENT} per import. Narrow your codes or countries.`);
      return;
    }

    const pairs = hsCodes.flatMap((hsCode) =>
      [...countries].map((destinationCountry) => ({ hsCode, destinationCountry }))
    );

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/tariffs/import-wits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs, year: year ? Number(year) : undefined }),
      });
      const data = (await res.json()) as ImportResponse;
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      setResult(data);
      if (data.imported.length > 0) {
        toast.success(`Imported ${data.imported.length} rate(s) from WITS`);
        router.refresh();
      } else {
        toast.error("No rates found for these combinations — see details below");
      }
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Globe2 className="mr-1 size-4" /> Import from WITS
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import duty rates from WITS</DialogTitle>
            <DialogDescription>
              Free World Bank WITS/TRAINS lookup — MFN import duty only, no API key. VAT and excise are not covered
              by WITS and still need manual entry. WITS can be slow (up to ~10s per year attempted); large imports
              may take a minute or two.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 text-xs">HS codes (6-digit, comma or newline separated)</Label>
              <textarea
                className="w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs"
                rows={3}
                placeholder="610910, 851712&#10;620342"
                value={hsCodesText}
                onChange={(e) => setHsCodesText(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1 text-xs">Destination countries</Label>
              {availableCountries.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No active port countries are WITS-supported. Add ports or extend WITS_REPORTER_CODES.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableCountries.map((c) => (
                    <label key={c} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={countries.has(c)} onChange={() => toggleCountry(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 text-xs">Year (optional — defaults to most recent, walks back if empty)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2021"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              <div className="flex items-end justify-end text-xs text-muted-foreground">
                {pairCount > 0 && (
                  <span className={pairCount > MAX_PAIRS_CLIENT ? "text-destructive" : ""}>
                    {pairCount} combination{pairCount === 1 ? "" : "s"} (max {MAX_PAIRS_CLIENT})
                  </span>
                )}
              </div>
            </div>

            {result && (
              <div className="space-y-2 rounded-md border p-3 text-xs">
                {result.imported.length > 0 && (
                  <div>
                    <div className="mb-1 font-medium text-foreground">Imported ({result.imported.length})</div>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {result.imported.map((r) => (
                        <li key={`${r.hsCode}-${r.destinationCountry}`}>
                          {r.hsCode} → {r.destinationCountry}: {r.dutyPct}% (reported {r.year})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.skipped.length > 0 && (
                  <div>
                    <div className="mb-1 font-medium text-foreground">Skipped ({result.skipped.length})</div>
                    <ul className="space-y-0.5 text-muted-foreground">
                      {result.skipped.map((r) => (
                        <li key={`${r.hsCode}-${r.destinationCountry}`}>
                          {r.hsCode} → {r.destinationCountry}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={runImport} disabled={loading}>
              {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Globe2 className="mr-1 size-4" />}
              Run import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
