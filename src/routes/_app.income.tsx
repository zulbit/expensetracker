import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  useIncomes, useCategories, useProfile, useDeleteIncome, formatCurrency,
  type Income,
} from "@/hooks/use-tracker-data";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IncomeDialog } from "@/components/income-dialog";
import { ExportMenu } from "@/components/export-menu";
import type { LedgerRow } from "@/lib/export-utils";

export const Route = createFileRoute("/_app/income")({
  head: () => ({ meta: [{ title: "Income — Neon Expense Tracker" }] }),
  component: IncomePage,
});

function IncomePage() {
  const { data: incomes = [] } = useIncomes();
  const { data: allCategories = [] } = useCategories();
  const categories = useMemo(() => allCategories.filter((c) => c.kind === "income"), [allCategories]);
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "PKR";
  const del = useDeleteIncome();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const catById = useMemo(() => new Map(allCategories.map((c) => [c.id, c])), [allCategories]);

  const filtered = useMemo(() => {
    return incomes.filter((e) => {
      if (catFilter !== "all" && e.category_id !== catFilter) return false;
      if (from && e.received_at < from) return false;
      if (to && e.received_at > to) return false;
      if (search && !(e.note ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [incomes, catFilter, from, to, search]);

  const total = filtered.reduce((a, e) => a + e.amount, 0);

  const exportRows: LedgerRow[] = filtered.map((e) => ({
    date: e.received_at,
    type: "income",
    category: catById.get(e.category_id)?.name ?? "—",
    note: e.note ?? "",
    amount: e.amount,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">Income</h1>
          <p className="text-sm text-muted-foreground">Log every incoming payment.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            rows={exportRows}
            filenameBase={`income_${from || "all"}_${to || "all"}`}
            title="Income Statement"
            currency={currency}
            summary={[{ label: "Total", value: formatCurrency(total, currency) }]}
          />
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="rounded-2xl"
            disabled={categories.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" /> Add income
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="neon-panel p-4 text-sm text-muted-foreground">
          Create an income category first from the Categories page.
        </div>
      )}

      <div className="neon-panel p-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="col-span-2 lg:col-span-2 relative">
          <Search className="absolute left-3 top-9 h-4 w-4 text-muted-foreground" />
          <label className="text-xs text-muted-foreground">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-9 rounded-2xl"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-2xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-2xl" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Category</label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 lg:col-span-5 rounded-2xl bg-accent/40 px-4 py-2 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">{filtered.length} entries</span>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-display font-semibold text-[color:var(--neon-lime)] neon-text">
              {formatCurrency(total, currency)}
            </span>
          </span>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 && (
          <div className="neon-panel p-6 text-center text-sm text-muted-foreground">
            No income entries yet.
          </div>
        )}
        {filtered.map((e) => {
          const c = catById.get(e.category_id);
          return (
            <div key={e.id} className="neon-panel p-3 flex items-center gap-3">
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
                  <span className="truncate text-sm font-medium">{c?.name ?? "—"}</span>
                  <span className="font-display text-sm font-semibold text-[color:var(--neon-lime)] whitespace-nowrap">
                    {formatCurrency(e.amount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{e.note || "—"}</span>
                  <span className="shrink-0">{format(new Date(e.received_at), "MMM d")}</span>
                </div>
              </div>
              <div className="flex flex-col shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-2xl" onClick={() => { setEditing(e); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-2xl text-destructive hover:text-destructive" onClick={() => setDeletingId(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="neon-panel overflow-hidden hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No income entries yet. Add one to get started.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => {
              const c = catById.get(e.category_id);
              return (
                <TableRow key={e.id} className="border-border/40">
                  <TableCell className="text-muted-foreground">{format(new Date(e.received_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs"
                      style={{
                        background: `${c?.color ?? "#888"}20`,
                        color: c?.color ?? "#fff",
                        border: `1px solid ${c?.color ?? "#888"}40`,
                      }}
                    >
                      <CategoryIcon name={c?.icon} className="h-3.5 w-3.5" />
                      {c?.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-sm">{e.note || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(e.amount, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => {
                        setEditing(e);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(e.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <IncomeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        income={editing}
        categories={categories}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="neon-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this income entry?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingId) del.mutate(deletingId);
                setDeletingId(null);
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
