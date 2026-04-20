"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Filter,
  Package,
} from "lucide-react";

type ProductStatus = "approved" | "pending" | "rejected";

interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  moq: number;
  stock: number;
  status: ProductStatus;
}

const PRODUCTS: Product[] = [
  {
    id: "P001",
    name: "Premium Shea Butter - Raw Unrefined",
    category: "Beauty & Skincare",
    price: "$18.50",
    moq: 100,
    stock: 2400,
    status: "approved",
  },
  {
    id: "P002",
    name: "Organic Cocoa Beans - Grade A",
    category: "Food & Agriculture",
    price: "$42.00",
    moq: 500,
    stock: 8000,
    status: "approved",
  },
  {
    id: "P003",
    name: "Handwoven Kente Cloth - Authentic",
    category: "Textiles & Apparel",
    price: "$85.00",
    moq: 20,
    stock: 150,
    status: "pending",
  },
  {
    id: "P004",
    name: "Cold-Pressed Moringa Oil",
    category: "Health & Wellness",
    price: "$24.00",
    moq: 200,
    stock: 1200,
    status: "approved",
  },
  {
    id: "P005",
    name: "Dried Hibiscus Flowers - Export Quality",
    category: "Food & Agriculture",
    price: "$12.00",
    moq: 300,
    stock: 5500,
    status: "approved",
  },
  {
    id: "P006",
    name: "African Black Soap - Bulk",
    category: "Beauty & Skincare",
    price: "$8.50",
    moq: 500,
    stock: 3000,
    status: "pending",
  },
  {
    id: "P007",
    name: "Cashew Nuts - W320 Grade",
    category: "Food & Agriculture",
    price: "$35.00",
    moq: 1000,
    stock: 0,
    status: "rejected",
  },
  {
    id: "P008",
    name: "Baobab Powder - Organic Certified",
    category: "Health & Wellness",
    price: "$29.00",
    moq: 100,
    stock: 800,
    status: "approved",
  },
];

const STATUS_FILTERS = [
  { value: "all", label: "All Products" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    approved:
      "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
    pending:
      "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/20",
    rejected:
      "bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function SupplierProducts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = PRODUCTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Products
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage your product catalog and listings.
          </p>
        </div>
        <button className="btn-primary self-start">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--amber)] focus:ring-2 focus:ring-[var(--amber)]/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--text-tertiary)]" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 ${
                statusFilter === f.value
                  ? "bg-[var(--amber)]/15 text-[var(--amber-dark)] border-[var(--amber)]/30"
                  : "text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Product
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Price
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  MOQ
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Stock
                </th>
                <th className="text-left py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-[var(--text-tertiary)] font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-secondary)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-tertiary)] flex items-center justify-center flex-shrink-0">
                        <Package
                          size={16}
                          className="text-[var(--text-tertiary)]"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {product.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {product.price}
                    <span className="text-[var(--text-tertiary)] font-normal">
                      /unit
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {product.moq.toLocaleString()} units
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-medium ${
                        product.stock === 0
                          ? "text-[var(--danger)]"
                          : product.stock < 200
                            ? "text-[var(--warning)]"
                            : "text-[var(--text-primary)]"
                      }`}
                    >
                      {product.stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() =>
                          setOpenMenu(
                            openMenu === product.id ? null : product.id
                          )
                        }
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors"
                      >
                        <MoreHorizontal
                          size={16}
                          className="text-[var(--text-tertiary)]"
                        />
                      </button>
                      {openMenu === product.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-10 py-1">
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">
                            <Eye size={14} />
                            View
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors">
                            <Edit size={14} />
                            Edit
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--surface-secondary)] transition-colors">
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Package
              size={40}
              className="mx-auto text-[var(--text-tertiary)] mb-3"
            />
            <p className="text-[var(--text-secondary)] font-medium">
              No products found
            </p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between text-sm text-[var(--text-tertiary)]">
        <p>
          Showing {filtered.length} of {PRODUCTS.length} products
        </p>
      </div>
    </div>
  );
}
