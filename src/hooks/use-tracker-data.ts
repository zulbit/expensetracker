import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export type CategoryKind = "expense" | "income";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  kind: CategoryKind;
};

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  spent_at: string;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
};


export type Income = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  received_at: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  currency: string;
  opening_balance: number;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
};


export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...(data as Profile), opening_balance: Number((data as { opening_balance?: number }).opening_balance ?? 0) };
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "display_name" | "currency" | "opening_balance">>) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["categories", user?.id],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useExpenses() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["expenses", user?.id],
    queryFn: async (): Promise<Expense[]> => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("spent_at", twoYearsAgo.toISOString().slice(0, 10))
        .order("spent_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Expense[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    },
  });
}

export function useUpsertExpense() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      category_id: string;
      amount: number;
      note: string | null;
      spent_at: string;
      receipt_path?: string | null;
      receiptFile?: File | null;
      removeReceipt?: boolean;
    }) => {
      if (!user) throw new Error("Not signed in");

      let receiptPath: string | null | undefined = input.receipt_path;

      if (input.receiptFile) {
        const ext = input.receiptFile.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("receipts")
          .upload(path, input.receiptFile, { contentType: input.receiptFile.type || undefined });
        if (upErr) throw upErr;
        // Delete previous file when replacing
        if (input.receipt_path) {
          await supabase.storage.from("receipts").remove([input.receipt_path]);
        }
        receiptPath = path;
      } else if (input.removeReceipt) {
        if (input.receipt_path) {
          await supabase.storage.from("receipts").remove([input.receipt_path]);
        }
        receiptPath = null;
      }

      if (input.id) {
        const { error } = await supabase
          .from("expenses")
          .update({
            category_id: input.category_id,
            amount: input.amount,
            note: input.note,
            spent_at: input.spent_at,
            ...(receiptPath !== undefined ? { receipt_path: receiptPath } : {}),
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          user_id: user.id,
          category_id: input.category_id,
          amount: input.amount,
          note: input.note,
          spent_at: input.spent_at,
          receipt_path: receiptPath ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(v.id ? "Expense updated" : "Expense added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { id: string; receipt_path?: string | null }) => {
      const id = typeof input === "string" ? input : input.id;
      const path = typeof input === "string" ? null : input.receipt_path;
      if (path) {
        await supabase.storage.from("receipts").remove([path]);
      }
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data?.signedUrl ?? null;
}


export function useUpsertCategory() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; color: string; icon: string; kind?: CategoryKind }) => {
      if (!user) throw new Error("Not signed in");
      if (input.id) {
        const { error } = await supabase
          .from("categories")
          .update({ name: input.name, color: input.color, icon: input.icon })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({
          user_id: user.id,
          name: input.name,
          color: input.color,
          icon: input.icon,
          kind: input.kind ?? "expense",
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(v.id ? "Category updated" : "Category added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useIncomes() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["incomes", user?.id],
    queryFn: async (): Promise<Income[]> => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const { data, error } = await supabase
        .from("incomes")
        .select("*")
        .gte("received_at", twoYearsAgo.toISOString().slice(0, 10))
        .order("received_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Income[]).map((e) => ({ ...e, amount: Number(e.amount) }));
    },
  });
}

export function useUpsertIncome() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      category_id: string;
      amount: number;
      note: string | null;
      received_at: string;
    }) => {
      if (!user) throw new Error("Not signed in");
      if (input.id) {
        const { error } = await supabase
          .from("incomes")
          .update({
            category_id: input.category_id,
            amount: input.amount,
            note: input.note,
            received_at: input.received_at,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("incomes").insert({
          user_id: user.id,
          category_id: input.category_id,
          amount: input.amount,
          note: input.note,
          received_at: input.received_at,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["incomes"] });
      toast.success(v.id ? "Income updated" : "Income added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incomes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomes"] });
      toast.success("Income deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBudgets() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["budgets", user?.id],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await (supabase.from as any)("budgets").select("*");
      if (error) throw error;
      return ((data ?? []) as Budget[]).map((b) => ({ ...b, amount: Number(b.amount) }));
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; category_id: string | null; amount: number }) => {
      if (!user) throw new Error("Not signed in");
      if (input.id) {
        const { error } = await (supabase.from as any)("budgets")
          .update({ amount: input.amount, category_id: input.category_id })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("budgets").insert({
          user_id: user.id,
          category_id: input.category_id,
          amount: input.amount,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("violates foreign key")
          ? "This category still has entries. Move or delete them first."
          : e.message,
      ),
  });
}

export function formatCurrency(amount: number, currency = "PKR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
