import { useEffect, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpsertIncome, type Income, type Category } from "@/hooks/use-tracker-data";
import { CategoryIcon } from "@/components/category-icon";
import { toast } from "sonner";

const schema = z.object({
  amount: z.coerce.number().positive().max(1e10),
  category_id: z.string().uuid(),
  received_at: z.string().min(1),
  note: z.string().max(500).optional().nullable(),
});

export function IncomeDialog({
  open, onOpenChange, income, categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  income: Income | null;
  categories: Category[];
}) {
  const upsert = useUpsertIncome();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [receivedAt, setReceivedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(income ? String(income.amount) : "");
      setCategoryId(income?.category_id ?? categories[0]?.id ?? "");
      setReceivedAt(income?.received_at ?? format(new Date(), "yyyy-MM-dd"));
      setNote(income?.note ?? "");
    }
  }, [open, income, categories]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ amount, category_id: categoryId, received_at: receivedAt, note: note || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await upsert.mutateAsync({ id: income?.id, ...parsed.data, note: parsed.data.note ?? null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neon-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{income ? "Edit income" : "Add income"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
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
            <Label htmlFor="received_at">Date</Label>
            <Input
              id="received_at"
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              required
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Source or details"
              className="rounded-2xl"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl">
              Cancel
            </Button>
            <Button type="submit" disabled={upsert.isPending} className="rounded-2xl">
              {upsert.isPending ? "Saving…" : income ? "Save changes" : "Add income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
