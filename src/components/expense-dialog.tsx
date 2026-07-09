import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { Camera, Paperclip, X, FileText, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
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
import {
  useUpsertExpense, getReceiptSignedUrl, type Expense, type Category,
} from "@/hooks/use-tracker-data";
import { CategoryIcon } from "@/components/category-icon";
import { scanReceipt } from "@/lib/receipt-ocr.functions";
import { toast } from "sonner";


const schema = z.object({
  amount: z.coerce.number().positive().max(1e10),
  category_id: z.string().uuid(),
  spent_at: z.string().min(1),
  note: z.string().max(500).optional().nullable(),
});

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB

export function ExpenseDialog({
  open, onOpenChange, expense, categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expense: Expense | null;
  categories: Category[];
}) {
  const upsert = useUpsertExpense();
  const scanFn = useServerFn(scanReceipt);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [spentAt, setSpentAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rateLimit, setRateLimit] = useState<{ kind: "rate" | "credits"; until: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rateLimit) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [rateLimit]);
  const secondsLeft = rateLimit ? Math.max(0, Math.ceil((rateLimit.until - now) / 1000)) : 0;
  useEffect(() => {
    if (rateLimit && rateLimit.kind === "rate" && secondsLeft === 0) setRateLimit(null);
  }, [rateLimit, secondsLeft]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (open) {
      setAmount(expense ? String(expense.amount) : "");
      setCategoryId(expense?.category_id ?? categories[0]?.id ?? "");
      setSpentAt(expense?.spent_at ?? format(new Date(), "yyyy-MM-dd"));
      setNote(expense?.note ?? "");
      setReceiptFile(null);
      setRemoveReceipt(false);
      setRateLimit(null);
      setExistingUrl(null);
      if (expense?.receipt_path) {
        getReceiptSignedUrl(expense.receipt_path).then(setExistingUrl);
      }
    }
  }, [open, expense, categories]);

  const previewUrl = receiptFile ? URL.createObjectURL(receiptFile) : null;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_RECEIPT_BYTES) {
      toast.error("Receipt must be under 10 MB");
      return;
    }
    setReceiptFile(f);
    setRemoveReceipt(false);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result || "");
        resolve(s.includes(",") ? s.split(",")[1] : s);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const onScan = async () => {
    if (!receiptFile) {
      toast.error("Add a receipt image first");
      return;
    }
    if (!receiptFile.type.startsWith("image/")) {
      toast.error("Scan works on images (JPG/PNG)");
      return;
    }
    if (rateLimit && (rateLimit.kind === "credits" || secondsLeft > 0)) return;
    setScanning(true);
    try {
      const imageBase64 = await fileToBase64(receiptFile);
      const result = await scanFn({
        data: { imageBase64, mimeType: receiptFile.type || "image/jpeg" },
      });
      let filled = 0;
      if (result.amount != null) {
        setAmount(String(result.amount));
        filled++;
      }
      if (result.spent_at) {
        setSpentAt(result.spent_at);
        filled++;
      }
      if (result.note && !note) {
        setNote(result.note);
        filled++;
      }
      if (filled === 0) toast.error("Couldn't read that receipt");
      else toast.success("Receipt scanned");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      if (msg.includes("RATE_LIMIT") || /429|rate limit/i.test(msg)) {
        setRateLimit({ kind: "rate", until: Date.now() + 30_000 });
      } else if (msg.includes("AI_CREDITS") || /402|credits/i.test(msg)) {
        setRateLimit({ kind: "credits", until: 0 });
      } else {
        toast.error(msg);
      }
    } finally {
      setScanning(false);
    }
  };


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ amount, category_id: categoryId, spent_at: spentAt, note: note || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    await upsert.mutateAsync({
      id: expense?.id,
      ...parsed.data,
      note: parsed.data.note ?? null,
      receipt_path: expense?.receipt_path ?? null,
      receiptFile,
      removeReceipt,
    });
    onOpenChange(false);
  };

  const hasExisting = !!expense?.receipt_path && !removeReceipt && !receiptFile;
  const isImageFile = receiptFile?.type.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neon-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{expense ? "Edit expense" : "Add expense"}</DialogTitle>
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
            <Label htmlFor="spent_at">Date</Label>
            <Input
              id="spent_at"
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
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
              placeholder="What was it for?"
              className="rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt (optional)</Label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />

            {receiptFile ? (
              <div className="rounded-2xl border border-border/40 p-2 flex items-center gap-3">
                {isImageFile && previewUrl ? (
                  <img src={previewUrl} alt="Receipt preview" className="h-16 w-16 object-cover rounded-xl" />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-accent/40 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 text-sm truncate">{receiptFile.name}</div>
                <Button type="button" variant="ghost" size="icon" className="rounded-2xl"
                  onClick={() => setReceiptFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : hasExisting ? (
              <div className="rounded-2xl border border-border/40 p-2 flex items-center gap-3">
                {existingUrl ? (
                  <a href={existingUrl} target="_blank" rel="noreferrer" className="shrink-0">
                    <img src={existingUrl} alt="Current receipt"
                      className="h-16 w-16 object-cover rounded-xl"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </a>
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-accent/40" />
                )}
                <div className="flex-1 text-sm">
                  {existingUrl ? (
                    <a href={existingUrl} target="_blank" rel="noreferrer" className="underline">
                      View current receipt
                    </a>
                  ) : "Current receipt"}
                </div>
                <Button type="button" variant="ghost" size="icon" className="rounded-2xl text-destructive"
                  onClick={() => setRemoveReceipt(true)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="rounded-2xl flex-1"
                onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Camera
              </Button>
              <Button type="button" variant="outline" className="rounded-2xl flex-1"
                onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4 mr-1" /> Attach
              </Button>
            </div>
            {rateLimit && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs ${
                  rateLimit.kind === "credits"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-amber-400/40 bg-amber-400/10 text-amber-200"
                }`}
              >
                {rateLimit.kind === "credits" ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  {rateLimit.kind === "credits" ? (
                    <>AI credits are exhausted. Add credits to keep scanning receipts — you can still save this expense manually.</>
                  ) : (
                    <>Too many scans right now. Try again in {secondsLeft}s — meanwhile you can fill the fields manually.</>
                  )}
                </div>
              </div>
            )}
            {receiptFile && receiptFile.type.startsWith("image/") && (
              <Button
                type="button"
                variant="secondary"
                className="rounded-2xl w-full"
                onClick={onScan}
                disabled={scanning || (!!rateLimit && (rateLimit.kind === "credits" || secondsLeft > 0))}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {scanning
                  ? "Scanning receipt…"
                  : rateLimit?.kind === "rate" && secondsLeft > 0
                    ? `Try again in ${secondsLeft}s`
                    : rateLimit?.kind === "credits"
                      ? "Scanning unavailable"
                      : "Auto-fill from receipt (AI)"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG or PDF · up to 10 MB · scan works on images</p>

          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl">
              Cancel
            </Button>
            <Button type="submit" disabled={upsert.isPending} className="rounded-2xl">
              {upsert.isPending ? "Saving…" : expense ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
