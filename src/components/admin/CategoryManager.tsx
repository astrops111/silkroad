"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Folder,
  EyeOff,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import type { CategoryWithChildren } from "@/lib/queries/categories";

interface Props {
  tree: CategoryWithChildren[];
  productCounts: Record<string, number>;
  canDelete: boolean;
}

type FormState = {
  id?: string;
  name: string;
  nameLocal: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  name: "",
  nameLocal: "",
  slug: "",
  description: "",
  icon: "",
  parentId: null,
  sortOrder: 0,
  isActive: true,
};

export default function CategoryManager({ tree, productCounts, canDelete }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [parentName, setParentName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate(parent: CategoryWithChildren | null) {
    setMode("create");
    setForm({ ...EMPTY, parentId: parent?.id ?? null });
    setParentName(parent?.name ?? null);
    setDialogOpen(true);
  }

  function openEdit(cat: CategoryWithChildren, parent: CategoryWithChildren | null) {
    setMode("edit");
    setForm({
      id: cat.id,
      name: cat.name,
      nameLocal: cat.name_local ?? "",
      slug: cat.slug,
      description: cat.description ?? "",
      icon: cat.icon ?? "",
      parentId: cat.parent_id,
      sortOrder: cat.sort_order ?? 0,
      isActive: cat.is_active ?? true,
    });
    setParentName(parent?.name ?? null);
    setDialogOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const payload = {
        name: form.name,
        nameLocal: form.nameLocal || undefined,
        slug: form.slug || undefined,
        description: form.description || undefined,
        icon: form.icon || undefined,
        sortOrder: form.sortOrder,
      };
      const res =
        mode === "create"
          ? await createCategory({ ...payload, parentId: form.parentId })
          : await updateCategory(form.id!, { ...payload, isActive: form.isActive });
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(mode === "create" ? "Category created" : "Category updated");
      setDialogOpen(false);
    });
  }

  function handleDelete(cat: CategoryWithChildren) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success("Category deleted");
    });
  }

  function toggleActive(cat: CategoryWithChildren) {
    startTransition(async () => {
      const res = await updateCategory(cat.id, { isActive: !cat.is_active });
      if (!res.success) toast.error(res.error ?? "Failed");
      else toast.success(cat.is_active ? "Hidden from marketplace" : "Published");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-tertiary)]">
            {tree.length} top-level categor{tree.length === 1 ? "y" : "ies"} · managed taxonomy shown to suppliers and buyers
          </p>
        </div>
        <Button onClick={() => openCreate(null)} disabled={pending}>
          <Plus className="w-4 h-4" />
          New top-level
        </Button>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
        {tree.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-tertiary)]">
            No categories yet. Create your first top-level category.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {tree.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                parent={null}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
                onEdit={openEdit}
                onCreate={openCreate}
                onDelete={handleDelete}
                onToggleActive={toggleActive}
                productCounts={productCounts}
                canDelete={canDelete}
                pending={pending}
              />
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "New category" : "Edit category"}
            </DialogTitle>
            <DialogDescription>
              {parentName
                ? `Under: ${parentName}`
                : "Top-level category (no parent)"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name *</Label>
                <Input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cosmetics"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-name-local">Name (local)</Label>
                <Input
                  id="cat-name-local"
                  value={form.nameLocal}
                  onChange={(e) => setForm({ ...form, nameLocal: e.target.value })}
                  placeholder="e.g. 化妆品"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-icon">Icon</Label>
                <Input
                  id="cat-icon"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="emoji or icon name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <textarea
                id="cat-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/40 focus:border-[var(--amber)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="cat-sort">Sort order</Label>
                <Input
                  id="cat-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              {mode === "edit" && (
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--amber)] focus:ring-[var(--amber)]"
                  />
                  Published (visible to buyers)
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !form.name.trim()}>
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RowProps {
  cat: CategoryWithChildren;
  parent: CategoryWithChildren | null;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (cat: CategoryWithChildren, parent: CategoryWithChildren | null) => void;
  onCreate: (parent: CategoryWithChildren) => void;
  onDelete: (cat: CategoryWithChildren) => void;
  onToggleActive: (cat: CategoryWithChildren) => void;
  productCounts: Record<string, number>;
  canDelete: boolean;
  pending: boolean;
}

function CategoryRow({
  cat,
  parent,
  depth,
  expanded,
  onToggle,
  onEdit,
  onCreate,
  onDelete,
  onToggleActive,
  productCounts,
  canDelete,
  pending,
}: RowProps) {
  const hasChildren = (cat.children?.length ?? 0) > 0;
  const isOpen = expanded.has(cat.id);
  const count = productCounts[cat.id] ?? 0;

  return (
    <>
      <li
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-secondary)] transition-colors"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <button
          onClick={() => hasChildren && onToggle(cat.id)}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          aria-label={hasChildren ? (isOpen ? "Collapse" : "Expand") : ""}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : null}
        </button>

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: depth === 0 ? "var(--amber-glow)" : "var(--surface-tertiary)" }}
        >
          {depth === 0 ? (
            <FolderTree className="w-4 h-4 text-[var(--amber-dark)]" />
          ) : (
            <Folder className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-[var(--text-primary)] truncate">
              {cat.name}
            </p>
            {cat.name_local && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {cat.name_local}
              </span>
            )}
            {!cat.is_active && (
              <Badge variant="secondary" className="text-[10px]">hidden</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">/{cat.slug}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasChildren && (
            <Badge variant="secondary">
              {cat.children!.length} sub
            </Badge>
          )}
          <span className="text-xs text-[var(--text-tertiary)]">
            {count} product{count === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCreate(cat)}
              disabled={pending}
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggleActive(cat)}
              disabled={pending}
              title={cat.is_active ? "Hide" : "Publish"}
            >
              {cat.is_active ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(cat, parent)}
              disabled={pending}
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(cat)}
                disabled={pending}
                className="text-[var(--danger)]"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </li>

      {isOpen &&
        cat.children?.map((child) => (
          <CategoryRow
            key={child.id}
            cat={child}
            parent={cat}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onEdit={onEdit}
            onCreate={onCreate}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            productCounts={productCounts}
            canDelete={canDelete}
            pending={pending}
          />
        ))}
    </>
  );
}
