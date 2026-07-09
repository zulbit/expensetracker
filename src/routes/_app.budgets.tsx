import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Plus, Trash2, Target } from "lucide-react";
import {
  useBudgets,
  useUpsertBudget,
  useDeleteBudget,
  useCategories,
  useExpenses,
  useProfile,
  formatCurrency,
} from "@/hooks/use-tracker-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/budgets")({
  head: () => ({ meta: [{ title: "Budgets — Neon Expense Tracker" }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: expenses = [] } = useExpenses();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();

  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("__overall__");
  const [amount, setAmount] = useState("");

  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const monthKey = format(startOfMonth(new Date()), "yyyy-MM");

  const monthSpendByCat = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const e of expenses) {
      if (!e.spent_at.startsWith(monthKey)) continue;
      map.set(e.category_id, (map.get(e.category_id) ?? 0) + e.amount);
      total += e.amount;
    }
    return { map, total };
  }, [expenses, monthKey]);

  const rows = budgets.map((b) => {
    const cat = b.category_id ? categories.find((c) => c.id === b.category_id) : null;
    const spent = b.category_id
      ? monthSpendByCat.map.get(b.category_id) ?? 0
      : monthSpendByCat.total;
    const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
    const over = spent > b.amount && b.amount > 0;
    return { budget: b, category: cat, spent, pct, over };
  });

  const takenIds = new Set(budgets.map((b) => b.category_id));
  const availableForNew = expenseCategories.filter((c) => !takenIds.has(c.id));
  const overallTaken = takenIds.has(null as unknown as string);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!isFinite(n) || n <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    await upsert.mutateAsync({
      category_id: categoryId === "__overall__" ? null : categoryId,
      amount: n,
    });
    setOpen(false);
    setAmount("");
    setCategoryId("__overall__");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Monthly caps · {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl">
              <Plus className="h-4 w-4 mr-1" /> New budget
            </Button>
          </DialogTrigger>
          <DialogContent className="neon-panel sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Add budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!overallTaken && (
                      <SelectItem value="__overall__">Overall (all expenses)</SelectItem>
                    )}
                    {availableForNew.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2" style={{ color: c.color }}>
                          <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                          <span className="text-foreground">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monthly amount</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-2xl"
                  required
                />
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
      </div>

      {rows.length === 0 ? (
        <div className="neon-panel p-10 text-center text-sm text-muted-foreground">
          <Target className="h-6 w-6 mx-auto mb-2 text-[color:var(--neon-cyan)]" />
          No budgets yet. Add one to track spending against a monthly cap.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map(({ budget, category, spent, pct, over }) => {
            const color = category?.color ?? "var(--neon-cyan)";
            const label = category?.name ?? "Overall";
            const remaining = budget.amount - spent;
            return (
              <div key={budget.id} className="neon-panel p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-2xl"
                      style={{ background: `${color}22`, color }}
                    >
                      {category ? (
                        <CategoryIcon name={category.icon} className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(spent, currency)} of {formatCurrency(budget.amount, currency)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-2xl text-muted-foreground hover:text-destructive"
                    onClick={() => del.mutate(budget.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 h-2 w-full rounded-full bg-accent/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: over ? "var(--neon-magenta)" : color,
                      boxShadow: `0 0 12px ${over ? "var(--neon-magenta)" : color}`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={over ? "text-[color:var(--neon-magenta)]" : "text-muted-foreground"}>
                    {pct.toFixed(0)}% used
                  </span>
                  <span className={over ? "text-[color:var(--neon-magenta)]" : "text-[color:var(--neon-lime)]"}>
                    {over
                      ? `${formatCurrency(Math.abs(remaining), currency)} over`
                      : `${formatCurrency(remaining, currency)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
