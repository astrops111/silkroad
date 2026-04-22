"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkCreateProducts,
  fetchGoogleSheetCsv,
  type BulkImportRow,
  type BulkImportResult,
} from "@/lib/actions/products";
import type { ProductInput } from "@/lib/validators/product";

/* ------------------------------------------------------------------ */
/*  Header aliases — supports both the Chinese spreadsheet and common  */
/*  English variants so suppliers can use either template.             */
/* ------------------------------------------------------------------ */

type FieldKey =
  | "name"
  | "nameLocal"
  | "brand"
  | "description"
  | "cogs"
  | "moq"
  | "originCountry"
  | "janCode"
  | "shelfLifeDays"
  | "boxPackQty"
  | "shippingMode"
  | "legalCategory"
  | "skinHairType"
  | "targetAudience"
  | "scent"
  | "texture"
  | "usageInstructions"
  | "storageInstructions"
  | "warnings"
  | "weightKg"
  | "hsCode"
  | "tradeTerm"
  | "leadTimeDays"
  | "currency"
  | "image1"
  | "image2"
  | "image3"
  | "image4"
  | "image5"
  | "image6";

const ALIASES: Record<FieldKey, string[]> = {
  name: ["商品名稱*", "name", "product_name", "product name"],
  nameLocal: ["商品名稱", "name_local", "local_name"],
  brand: ["品牌", "brand"],
  description: ["產品敘述", "description", "desc"],
  cogs: ["COGS*", "COGS", "cogs", "cost"],
  moq: ["MOQ（單位：箱）", "MOQ(單位:箱)", "MOQ", "moq", "min_order_qty"],
  originCountry: ["原產國", "origin_country", "origin", "country"],
  janCode: ["Jancode", "JAN", "jan_code", "barcode"],
  shelfLifeDays: ["商品保存天數", "shelf_life_days", "shelf_life"],
  boxPackQty: ["箱入數", "box_pack_qty", "units_per_box"],
  shippingMode: ["貨品運輸方式 Air/Sea", "shipping_mode", "freight_mode"],
  legalCategory: ["法定種類", "legal_category"],
  skinHairType: ["適用膚/髮質", "skin_hair_type"],
  targetAudience: ["適用對象", "target_audience"],
  scent: ["香味", "scent"],
  texture: ["產品質地/型態", "texture", "form"],
  usageInstructions: ["使用方法", "usage", "usage_instructions"],
  storageInstructions: ["保存和處理方法", "storage", "storage_instructions"],
  warnings: ["其他注意事項", "warnings", "cautions"],
  weightKg: ["商品重量", "weight_kg", "weight"],
  hsCode: ["HS Code", "hs_code"],
  tradeTerm: ["FOB CIF EXW DDP", "trade_term"],
  leadTimeDays: ["lead_time_days", "lead_time"],
  currency: ["currency"],
  image1: ["image 1", "image1", "img1", "主要圖示檔名"],
  image2: ["image 2", "image2", "img2", "細項圖示檔名(商品標示)", "細項圖示檔名"],
  image3: ["image 3", "image3", "img3", "圖檔3"],
  image4: ["image 4", "image4", "img4", "圖檔4"],
  image5: ["image 5", "image5", "img5", "圖檔5"],
  image6: ["image 6", "image6", "img6", "圖檔6"],
};

const IMAGE_FIELDS: FieldKey[] = [
  "image1",
  "image2",
  "image3",
  "image4",
  "image5",
  "image6",
];

/* ------------------------------------------------------------------ */
/*  CSV parser — RFC 4180-ish. Handles quoted cells, CRLF, escaped "". */
/* ------------------------------------------------------------------ */

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip BOM if Excel exported it.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        cell = "";
        if (row.some((v) => v.length > 0)) rows.push(row);
        row = [];
      } else {
        cell += c;
      }
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((v) => v.length > 0)) rows.push(row);
  }
  return rows;
}

function buildHeaderIndex(headers: string[]): Partial<Record<FieldKey, number>> {
  const normalized = headers.map((h) => h.trim());
  const map: Partial<Record<FieldKey, number>> = {};
  for (const [field, aliases] of Object.entries(ALIASES) as [
    FieldKey,
    string[],
  ][]) {
    for (const alias of aliases) {
      const idx = normalized.findIndex(
        (h) => h.toLowerCase() === alias.toLowerCase()
      );
      if (idx !== -1) {
        map[field] = idx;
        break;
      }
    }
  }
  return map;
}

function normalizeShipping(v: string): "air" | "sea" | "either" | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (s.includes("both") || s.includes("either") || s.includes("海空"))
    return "either";
  if (s.includes("air") || s.includes("空")) return "air";
  if (s.includes("sea") || s.includes("海")) return "sea";
  return undefined;
}

const TRADE_TERMS = ["fob", "cif", "exw", "ddp", "dap", "cpt", "fca"] as const;
function normalizeTradeTerm(v: string): (typeof TRADE_TERMS)[number] | undefined {
  const s = v.trim().toLowerCase();
  return (TRADE_TERMS as readonly string[]).includes(s)
    ? (s as (typeof TRADE_TERMS)[number])
    : undefined;
}

function maybeNumber(v: string): number | undefined {
  const s = v.trim().replace(/,/g, "");
  if (!s) return undefined;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function maybeInt(v: string): number | undefined {
  const n = maybeNumber(v);
  return n != null ? Math.trunc(n) : undefined;
}

function maybeStr(v: string): string | undefined {
  const s = v.trim();
  return s ? s : undefined;
}

interface PreviewRow {
  input: ProductInput;
  imageUrls: string[];
  error: string | null;
  raw: string[];
}

function looksLikeUrl(v: string): boolean {
  return /^https?:\/\//i.test(v.trim());
}

const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "KES", "GHS", "NGN", "ZAR"];

interface Props {
  categories: { id: string; name: string; level: number; parentId: string | null }[];
}

export default function BulkImportClient({ categories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [fileName, setFileName] = useState<string>("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [headersRaw, setHeadersRaw] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  function ingestCsvText(text: string, source: string): boolean {
    const all = parseCSV(text);
    if (all.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return false;
    }
    const [headers, ...data] = all;
    const idx = buildHeaderIndex(headers);
    if (idx.name === undefined) {
      toast.error("Missing required column: product name (商品名稱*)");
      return false;
    }
    if (idx.cogs === undefined) {
      toast.error("Missing required column: COGS*");
      return false;
    }
    setFileName(source);
    setHeadersRaw(headers);
    setRows(data.map((r) => mapRow(r, idx)));
    setImportResult(null);
    return true;
  }

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => ingestCsvText(reader.result as string, file.name);
    reader.readAsText(file, "utf-8");
  }

  async function handleFetchSheet() {
    const url = sheetUrl.trim();
    if (!url) {
      toast.error("Paste a Google Sheets URL");
      return;
    }
    setFetching(true);
    try {
      const res = await fetchGoogleSheetCsv(url);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Failed to fetch sheet");
        return;
      }
      ingestCsvText(res.data.csv, "Google Sheets");
    } finally {
      setFetching(false);
    }
  }

  function mapRow(
    raw: string[],
    idx: Partial<Record<FieldKey, number>>
  ): PreviewRow {
    const cell = (k: FieldKey) => (idx[k] != null ? raw[idx[k]!] ?? "" : "");

    const cogs = maybeNumber(cell("cogs"));
    const input: ProductInput = {
      name: maybeStr(cell("name")) || "",
      nameLocal: maybeStr(cell("nameLocal")),
      description: maybeStr(cell("description")) || "",
      categoryId: defaultCategoryId,
      basePrice: cogs ? cogs * 1.4 : 0,
      currency: maybeStr(cell("currency")) || defaultCurrency,
      moq: maybeInt(cell("moq")) ?? 1,
      leadTimeDays: maybeInt(cell("leadTimeDays")),
      tradeTerm: normalizeTradeTerm(cell("tradeTerm")) ?? "fob",
      sampleAvailable: false,
      weightKg: maybeNumber(cell("weightKg")),
      hsCode: maybeStr(cell("hsCode")),
      originCountry: (() => {
        const v = maybeStr(cell("originCountry"));
        if (!v) return undefined;
        return v.length === 2 ? v.toUpperCase() : undefined;
      })(),
      cogs,
      brand: maybeStr(cell("brand")),
      janCode: maybeStr(cell("janCode")),
      shelfLifeDays: maybeInt(cell("shelfLifeDays")),
      boxPackQty: maybeInt(cell("boxPackQty")),
      shippingMode: normalizeShipping(cell("shippingMode")),
      legalCategory: maybeStr(cell("legalCategory")),
      skinHairType: maybeStr(cell("skinHairType")),
      targetAudience: maybeStr(cell("targetAudience")),
      scent: maybeStr(cell("scent")),
      texture: maybeStr(cell("texture")),
      usageInstructions: maybeStr(cell("usageInstructions")),
      storageInstructions: maybeStr(cell("storageInstructions")),
      warnings: maybeStr(cell("warnings")),
    };

    // Image URL columns — only http(s) values are kept; filename-only cells
    // from the original sheet are ignored since we can't resolve them.
    const imageUrls = IMAGE_FIELDS.map((k) => cell(k).trim())
      .filter((v) => v && looksLikeUrl(v));

    let error: string | null = null;
    if (!input.name || input.name.length < 3)
      error = "Name is required (≥3 chars)";
    else if (!input.description || input.description.length < 10)
      error = "Description ≥10 chars required";
    else if (!cogs || cogs <= 0) error = "COGS must be > 0";
    else if (!input.moq || input.moq < 1) error = "MOQ must be ≥ 1";

    return { input, imageUrls, error, raw };
  }

  function handleFilePick(files: FileList | null) {
    if (!files || !files[0]) return;
    parseFile(files[0]);
  }

  function rebuildWithDefaults() {
    // Re-apply defaults to already-parsed rows when supplier changes the dropdown.
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        input: {
          ...r.input,
          categoryId: defaultCategoryId,
          currency: r.input.currency || defaultCurrency,
        },
        error:
          !defaultCategoryId
            ? "Select a default category"
            : r.error === "Select a default category"
              ? null
              : r.error,
      }))
    );
  }

  function handleImport() {
    if (!defaultCategoryId) {
      toast.error("Select a default category first");
      return;
    }
    const validRows: BulkImportRow[] = rows
      .filter((r) => !r.error)
      .map((r) => ({
        input: { ...r.input, categoryId: defaultCategoryId },
        imageUrls: r.imageUrls,
      }));

    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    startTransition(async () => {
      const res = await bulkCreateProducts(validRows);
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Import failed");
        return;
      }
      setImportResult(res.data);
      toast.success(
        `Imported ${res.data.succeeded} of ${validRows.length} products`
      );
    });
  }

  function downloadTemplate() {
    const headers = [
      "商品名稱*",
      "品牌",
      "產品敘述",
      "COGS*",
      "MOQ",
      "原產國",
      "Jancode",
      "商品保存天數",
      "箱入數",
      "貨品運輸方式 Air/Sea",
      "法定種類",
      "適用膚/髮質",
      "適用對象",
      "香味",
      "產品質地/型態",
      "使用方法",
      "保存和處理方法",
      "其他注意事項",
      "商品重量",
      "HS Code",
      "image 1",
      "image 2",
      "image 3",
      "image 4",
      "image 5",
      "image 6",
    ];
    const example = [
      "Sweet Red Bean Soup",
      "Guanrui",
      "Traditional Japanese sweet red bean soup, 140g pouch.",
      "1.40",
      "10",
      "JP",
      "4901234567890",
      "730",
      "24",
      "Sea",
      "food",
      "",
      "all ages",
      "",
      "liquid",
      "Heat and serve.",
      "Store in a cool dry place.",
      "Contains allergens; check label.",
      "0.140",
      "2005.51",
      "https://example.com/products/red-bean-soup-1.jpg",
      "https://example.com/products/red-bean-soup-2.jpg",
      "",
      "",
      "",
      "",
    ];
    const csv = [headers, example]
      .map((r) =>
        r.map((c) => (c.includes(",") ? `"${c.replace(/"/g, '""')}"` : c)).join(",")
      )
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.length - validCount;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center gap-4">
        <Link
          href="/supplier/products"
          className="p-2 rounded-lg hover:bg-[var(--surface-primary)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-bold text-[var(--obsidian)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Bulk Import Products
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            Upload a CSV matching the supplier onboarding sheet. Listed price =
            COGS × 1.4.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4" />
          Download template
        </Button>
      </div>

      {/* Defaults */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default category *</Label>
            <Select
              value={defaultCategoryId}
              onValueChange={(v) => {
                setDefaultCategoryId(v);
                setRows((prev) =>
                  prev.map((r) => ({
                    ...r,
                    input: { ...r.input, categoryId: v },
                    error:
                      r.error === "Select a default category" ? null : r.error,
                  }))
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {"— ".repeat(c.level)}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[var(--text-tertiary)]">
              Applied to every row. Override per product after import.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Default currency</Label>
            <Select
              value={defaultCurrency}
              onValueChange={(v) => {
                setDefaultCurrency(v);
                rebuildWithDefaults();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Google Sheets URL */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          <Label>Import from Google Sheets</Label>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFetchSheet();
            }}
          />
          <Button onClick={handleFetchSheet} disabled={fetching}>
            {fetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            Fetch
          </Button>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Share the sheet as <strong>Anyone with the link → Viewer</strong> so
          we can read it. First tab is imported unless the URL has{" "}
          <code>gid=…</code>.
        </p>
      </div>

      {/* File drop */}
      <div
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
        style={{ borderColor: "var(--border-default)" }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilePick(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFilePick(e.target.files)}
        />
        <div className="w-14 h-14 rounded-xl bg-[var(--amber)]/10 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-7 h-7 text-[var(--amber)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {fileName || "Drop CSV here or click to browse"}
        </p>
        <p className="text-xs mt-1 text-[var(--text-tertiary)]">
          Chinese or English headers both supported
        </p>
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text-secondary)] font-medium">
                {rows.length} rows
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--success)]">
                <CheckCircle2 className="w-4 h-4" />
                {validCount} valid
              </span>
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4" />
                  {errorCount} with errors
                </span>
              )}
            </div>
            <Button onClick={handleImport} disabled={pending || validCount === 0}>
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Import {validCount} product{validCount === 1 ? "" : "s"}
            </Button>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-secondary)] sticky top-0">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left px-4 py-2 text-[var(--text-tertiary)] font-medium w-8"></th>
                  <th className="text-left px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Brand
                  </th>
                  <th className="text-right px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    COGS
                  </th>
                  <th className="text-right px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Listed
                  </th>
                  <th className="text-right px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    MOQ
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Origin
                  </th>
                  <th className="text-right px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Images
                  </th>
                  <th className="text-left px-4 py-2 text-[var(--text-tertiary)] font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)]"
                  >
                    <td className="px-4 py-2 text-[var(--text-tertiary)] text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2 font-medium text-[var(--text-primary)] max-w-xs truncate">
                      {r.input.name || <em className="text-[var(--text-tertiary)]">—</em>}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {r.input.brand ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--text-secondary)]">
                      {r.input.cogs?.toFixed(2) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-[var(--text-primary)]">
                      {r.input.cogs ? (r.input.cogs * 1.4).toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-[var(--text-secondary)]">
                      {r.input.moq}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-secondary)]">
                      {r.input.originCountry ?? "—"}
                    </td>
                    <td
                      className="px-4 py-2 text-right text-[var(--text-secondary)]"
                      title={r.imageUrls.join("\n")}
                    >
                      {r.imageUrls.length > 0 ? r.imageUrls.length : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {r.error ? (
                        <span
                          className="inline-flex items-center gap-1 text-[var(--danger)] text-xs"
                          title={r.error}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {r.error}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--success)] text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
            Detected headers: {headersRaw.length} columns. Unmapped columns are
            ignored.
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)] flex-wrap">
            <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
            {importResult.succeeded} products created · {importResult.failed.length}{" "}
            failed
            {(importResult.imagesDownloaded > 0 || importResult.imagesFailed > 0) && (
              <span className="text-sm font-normal text-[var(--text-tertiary)]">
                · {importResult.imagesDownloaded} image
                {importResult.imagesDownloaded === 1 ? "" : "s"} saved
                {importResult.imagesFailed > 0
                  ? `, ${importResult.imagesFailed} failed`
                  : ""}
              </span>
            )}
          </div>
          {importResult.failed.length > 0 && (
            <ul className="text-sm space-y-1">
              {importResult.failed.map((f) => (
                <li key={f.rowIndex} className="text-[var(--danger)]">
                  Row {f.rowIndex + 1}
                  {f.name ? ` (${f.name})` : ""}: {f.error}
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => router.push("/supplier/products")}>
            Go to products
          </Button>
        </div>
      )}
    </div>
  );
}
