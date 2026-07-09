import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { BookOpen, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import {
  useExpenses,
  useIncomes,
  useCategories,
  useProfile,
  formatCurrency,
} from "@/hooks/use-tracker-data";
import { CategoryIcon } from "@/components/category-icon";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { ExportMenu } from "@/components/export-menu";
import type { LedgerRow } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/ledger")({
  head: () => ({ meta: [{ title: "Ledger — Neon Expense Tracker" }] }),
  component: LedgerPage,
});

function LedgerPage() {
  const { data: expenses = [] } = useExpenses();
  const { data: incomes = [] } = useIncomes();
  const { data: categories = [] } = useCategories();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const opening = profile?.opening_balance ?? 0;

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [catFilter, setCatFilter] = useState<string>("all");

  // Build full ledger (ascending) to compute running balance from opening
  const fullAsc = useMemo(() => {
    const rows: (LedgerRow & { id: string; categoryId: string })[] = [];
    for (const i of incomes) {
      const c = catById.get(i.category_id);
      rows.push({
        id: `i-${i.id}`,
        categoryId: i.category_id,
        date: i.received_at,
        type: "income",
        category: c?.name ?? "—",
        note: i.note ?? "",
        amount: i.amount,
      });
    }
    for (const e of expenses) {
      const c = catById.get(e.category_id);
      rows.push({
        id: `e-${e.id}`,
        categoryId: e.category_id,
        date: e.spent_at,
        type: "expense",
        category: c?.name ?? "—",
        note: e.note ?? "",
        amount: -e.amount,
      });
    }
    rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let bal = opening;
    for (const r of rows) {
      bal += r.amount;
      r.balance = bal;
    }
    return rows;
  }, [incomes, expenses, catById, opening]);

  const currentBalance = fullAsc.length ? (fullAsc[fullAsc.length - 1].balance ?? opening) : opening;

  // Apply filters, keep running balance (as-of within filter window),
  // then reverse for display (newest first)
  const filtered = useMemo(() => {
    const rows = fullAsc.filter((r) => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (catFilter !== "all" && r.categoryId !== catFilter) return false;
      return true;
    });
    return rows;
  }, [fullAsc, from, to, typeFilter, catFilter]);

  const totalIncome = filtered.filter((r) => r.type === "income").reduce((a, r) => a + r.amount, 0);
  const totalExpense = filtered.filter((r) => r.type === "expense").reduce((a, r) => a + Math.abs(r.amount), 0);
  const net = totalIncome - totalExpense;

  const display = [...filtered].reverse();

  const exportRows: LedgerRow[] = display.map((r) => ({
    date: r.date,
    type: r.type,
    category: r.category,
    note: r.note,
    amount: r.amount,
    balance: r.balance,
  }));

  const filenameBase = `ledger_${from || "all"}_${to || "all"}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[color:var(--neon-cyan)]" /> Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Every entry, chronological, with a running balance. Opening balance set in Settings.
          </p>
        </div>
        <ExportMenu
          rows={exportRows}
          filenameBase={filenameBase}
          title="Ledger Statement"
          currency={currency}
          showBalance
          summary={[
            { label: "Opening", value: formatCurrency(opening, currency) },
            { label: "Income", value: formatCurrency(totalIncome, currency) },
            { label: "Expenses", value: formatCurrency(totalExpense, currency) },
            { label: "Net", value: formatCurrency(net, currency) },
            { label: "Balance", value: formatCurrency(currentBalance, currency) },
          ]}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="neon-panel p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Current balance</div>
          <div className="font-display text-xl sm:text-2xl font-semibold neon-text text-[color:var(--neon-cyan)]">
            {formatCurrency(currentBalance, currency)}
          </div>
        </div>
        <div className="neon-panel p-4">
          <div className="text-xs text-muted-foreground">Opening balance</div>
          <div className="font-display text-xl sm:text-2xl font-semibold">
            {formatCurrency(opening, currency)}
          </div>
        </div>
        <div className="neon-panel p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Income (filtered)</div>
          <div className="font-display text-xl sm:text-2xl font-semibold text-[color:var(--neon-lime)]">
            {formatCurrency(totalIncome, currency)}
          </div>
        </div>
        <div className="neon-panel p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Expenses (filtered)</div>
          <div className="font-display text-xl sm:text-2xl font-semibold text-[color:var(--neon-magenta)]">
            {formatCurrency(totalExpense, currency)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="neon-panel p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="col-span-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-2xl" />
        </div>
        <div className="col-span-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-2xl" />
        </div>
        <div className="col-span-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 lg:col-span-2">
          <label className="text-xs text-muted-foreground">Category</label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.kind})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile list */}
      <div className="space-y-2 sm:hidden">
        {display.length === 0 && (
          <div className="neon-panel p-6 text-center text-sm text-muted-foreground">
            No entries match your filters.
          </div>
        )}
        {display.map((r) => {
          const c = catById.get(r.categoryId);
          const isIncome = r.type === "income";
          return (
            <div key={r.id} className="neon-panel p-3 flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-2xl inline-flex items-center justify-center"
                style={{
                  background: `${c?.color ?? "#888"}20`,
                  border: `1px solid ${c?.color ?? "#888"}40`,
                  color: c?.color ?? "#fff",
                }}
              >
                <CategoryIcon name={c?.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.category}</span>
                  <span
                    className="font-display text-sm font-semibold whitespace-nowrap"
                    style={{ color: isIncome ? "var(--neon-lime)" : "var(--neon-magenta)" }}
                  >
                    {isIncome ? "+" : "−"}{formatCurrency(Math.abs(r.amount), currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{r.note || format(new Date(r.date), "MMM d, yyyy")}</span>
                  <span className="shrink-0">Bal {formatCurrency(r.balance ?? 0, currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="neon-panel overflow-hidden hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {display.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No entries match your filters.
                </TableCell>
              </TableRow>
            )}
            {display.map((r) => {
              const c = catById.get(r.categoryId);
              const isIncome = r.type === "income";
              return (
                <TableRow key={r.id} className="border-border/40">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(r.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      style={{
                        background: isIncome ? "var(--neon-lime)20" : "var(--neon-magenta)20",
                        color: isIncome ? "var(--neon-lime)" : "var(--neon-magenta)",
                        border: `1px solid ${isIncome ? "var(--neon-lime)" : "var(--neon-magenta)"}40`,
                      }}
                    >
                      {isIncome ? "Income" : "Expense"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <CategoryIcon name={c?.icon} className="h-3.5 w-3.5" style={{ color: c?.color }} />
                      {r.category}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-sm">{r.note || "—"}</TableCell>
                  <TableCell
                    className="text-right font-medium whitespace-nowrap"
                    style={{ color: isIncome ? "var(--neon-lime)" : "var(--neon-magenta)" }}
                  >
                    {isIncome ? "+" : "−"}{formatCurrency(Math.abs(r.amount), currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(r.balance ?? 0, currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
