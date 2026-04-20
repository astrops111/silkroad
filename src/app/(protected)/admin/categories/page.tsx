"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, FolderTree, ChevronRight } from "lucide-react";

const CATEGORIES = [
  { id: "1", name: "Electronics & Technology", slug: "electronics", subcategories: 6, products: 245, level: 0 },
  { id: "2", name: "Machinery & Equipment", slug: "machinery", subcategories: 6, products: 189, level: 0 },
  { id: "3", name: "Textiles & Apparel", slug: "textiles", subcategories: 4, products: 312, level: 0 },
  { id: "4", name: "Construction & Building Materials", slug: "construction", subcategories: 5, products: 178, level: 0 },
  { id: "5", name: "Agriculture & Food", slug: "agriculture", subcategories: 6, products: 423, level: 0 },
  { id: "6", name: "Minerals & Raw Materials", slug: "minerals", subcategories: 4, products: 89, level: 0 },
  { id: "7", name: "Energy & Solar", slug: "energy", subcategories: 0, products: 156, level: 0 },
  { id: "8", name: "Consumer Goods", slug: "consumer-goods", subcategories: 0, products: 201, level: 0 },
  { id: "9", name: "Automotive & Transport", slug: "automotive", subcategories: 0, products: 67, level: 0 },
  { id: "10", name: "Chemicals & Pharmaceuticals", slug: "chemicals", subcategories: 0, products: 45, level: 0 },
];

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--obsidian)]" style={{ fontFamily: "var(--font-display)" }}>
            Categories
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            {CATEGORIES.length} top-level categories
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      <div className="space-y-2">
        {CATEGORIES.map((cat) => (
          <Card key={cat.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="flex items-center gap-4 py-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--amber-glow)] flex items-center justify-center shrink-0">
                <FolderTree className="w-5 h-5 text-[var(--amber-dark)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--obsidian)]">{cat.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">/{cat.slug}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {cat.subcategories > 0 && (
                  <Badge variant="secondary">{cat.subcategories} subcategories</Badge>
                )}
                <span className="text-sm text-[var(--text-secondary)]">{cat.products} products</span>
                <Button variant="ghost" size="icon-sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
