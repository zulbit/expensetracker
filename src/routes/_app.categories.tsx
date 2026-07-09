import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useCategories, useExpenses, useUpsertCategory, useDeleteCategory,
  type Category,
} from "@/hooks/use-tracker-data";
import { CategoryIcon, CATEGORY_ICON_NAMES, getCategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/categories")({
  head: () => ({ meta: [{ title: "Categories — Neon Expense Tracker" }] }),
  component: CategoriesPage,
});

const PRESET_COLORS = [
  "#00e5ff", "#ff2bd6", "#39ff14", "#8b5cf6", "#f59e0b",
  "#22d3ee", "#f472b6", "#a3e635", "#fb923c", "#e11d48",
];

function CategoriesPage() {
  const { data: categories = [] } = useCategories();
  const { data: expenses = [] } = useExpenses();
  const upsert = useUpsertCategory();
  const del = useDeleteCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [newKind, setNewKind] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>("Tag");
  const [deleting, setDeleting] = useState<Category | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category_id, (m.get(e.category_id) ?? 0) + 1);
    return m;
  }, [expenses]);

  const incomeCategories = useMemo(() => categories.filter((c) => c.kind === "income"), [categories]);
  const expenseCategories = useMemo(() => categories.filter((c) => c.kind !== "income"), [categories]);

  const openNew = (kind: "expense" | "income") => {
    setEditing(null);
    setNewKind(kind);
    setName("");
    setColor(kind === "income" ? "#39ff14" : PRESET_COLORS[0]);
    setIcon(kind === "income" ? "Wallet" : "Tag");
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setColor(c.color);
    setIcon(c.icon || "Tag");
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    await upsert.mutateAsync({
      id: editing?.id,
      name: name.trim(),
      color,
      icon,
      kind: editing ? editing.kind : newKind,
    });
    setOpen(false);
  };

  const renderCard = (c: Category) => (
    <div key={c.id} className="neon-panel p-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="h-10 w-10 rounded-2xl shrink-0 inline-flex items-center justify-center"
          style={{ background: `${c.color}20`, border: `1px solid ${c.color}80`, boxShadow: `0 0 20px -4px ${c.color}80`, color: c.color }}
        >
          <CategoryIcon name={c.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="font-medium truncate">{c.name}</div>
          <div className="text-xs text-muted-foreground">
            {c.kind === "income" ? "Income" : `${counts.get(c.id) ?? 0} expenses`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={() => openEdit(c)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-2xl text-destructive hover:text-destructive"
          onClick={() => setDeleting(c)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">Group your income and spending your way.</p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-[color:var(--neon-lime)] neon-text">Income Categories</h2>
            <p className="text-xs text-muted-foreground">Money coming in.</p>
          </div>
          <Button onClick={() => openNew("income")} className="rounded-2xl w-full sm:w-auto" variant="secondary">
            <Plus className="h-4 w-4 mr-1" /> New income category
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {incomeCategories.length === 0 && (
            <div className="text-sm text-muted-foreground">No income categories yet.</div>
          )}
          {incomeCategories.map(renderCard)}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-semibold text-[color:var(--neon-magenta)] neon-text">Expense Categories</h2>
            <p className="text-xs text-muted-foreground">Money going out.</p>
          </div>
          <Button onClick={() => openNew("expense")} className="rounded-2xl w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> New expense category
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {expenseCategories.map(renderCard)}
        </div>
      </section>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="neon-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? `Edit ${editing.kind} category` : `New ${newKind} category`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className="h-9 w-9 rounded-2xl transition"
                    style={{
                      background: col,
                      boxShadow: color === col ? `0 0 0 2px var(--background), 0 0 0 4px ${col}, 0 0 16px ${col}` : `0 0 12px -4px ${col}`,
                    }}
                    aria-label={col}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 rounded-2xl border border-border/40">
                {CATEGORY_ICON_NAMES.map((n) => {
                  const Ico = getCategoryIcon(n);
                  const selected = icon === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setIcon(n)}
                      className="h-9 w-9 rounded-2xl inline-flex items-center justify-center transition"
                      style={{
                        background: selected ? `${color}25` : "transparent",
                        border: `1px solid ${selected ? color : "hsl(var(--border))"}`,
                        color: selected ? color : "hsl(var(--muted-foreground))",
                        boxShadow: selected ? `0 0 12px -2px ${color}` : "none",
                      }}
                      aria-label={n}
                      title={n}
                    >
                      <Ico className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-2xl">
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending} className="rounded-2xl">
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="neon-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. If the category has expenses, delete or reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) del.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
