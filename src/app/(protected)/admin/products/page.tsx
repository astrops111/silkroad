"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Eye, Package, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { approveProduct, rejectProduct, getPendingProductModeration } from "@/lib/actions/admin";

interface PendingProduct {
  id: string;
  name: string;
  supplier: string;
  category: string;
  price: string;
  moq: number;
  submittedAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPendingProductModeration();
        setProducts(
          data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            supplier: ((p.companies as Record<string, unknown>)?.name as string) ?? "Unknown",
            category: "General",
            price: `$${((p.base_price as number) / 100).toFixed(2)}`,
            moq: (p.moq as number) ?? 1,
            submittedAt: (p.created_at as string)?.slice(0, 10) ?? "",
          }))
        );
      } catch {
        // Fallback to empty — DB may not have data yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAction(productId: string, action: "approve" | "reject") {
    setProcessingId(productId);
    const result = action === "approve"
      ? await approveProduct(productId, "admin")
      : await rejectProduct(productId, "admin");

    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast.success(action === "approve" ? "Product approved" : "Product rejected");
    } else {
      toast.error(result.error ?? "Action failed");
    }
    setProcessingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--amber)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
            Product Moderation
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {products.length} products pending review
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
            <p className="text-lg font-semibold text-[var(--obsidian)]">All caught up!</p>
            <p className="text-sm text-[var(--text-tertiary)]">No products pending moderation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center gap-6 py-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--surface-tertiary)] flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--obsidian)] truncate">{product.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{product.supplier}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="secondary">{product.category}</Badge>
                    <span className="text-xs text-[var(--text-tertiary)]">{product.price} · MOQ: {product.moq}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      <Clock className="w-3 h-3 inline mr-1" />{product.submittedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAction(product.id, "approve")}
                    disabled={processingId === product.id}
                  >
                    {processingId === product.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction(product.id, "reject")}
                    disabled={processingId === product.id}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
