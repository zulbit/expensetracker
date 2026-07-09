import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/use-tracker-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Neon Expense Tracker" }] }),
  component: SettingsPage,
});

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "INR", "AED", "SAR", "CAD", "AUD", "JPY"];

function SettingsPage() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const update = useUpdateProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [opening, setOpening] = useState("0");

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCurrency(profile.currency);
      setOpening(String(profile.opening_balance ?? 0));
    }
  }, [profile]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const ob = Number(opening);
    update.mutate({
      display_name: name || null,
      currency,
      opening_balance: Number.isFinite(ob) ? ob : 0,
    });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <form onSubmit={save} className="neon-panel p-6 space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Your name"
            className="rounded-2xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opening">Opening balance</Label>
          <Input
            id="opening"
            type="number"
            step="0.01"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            className="rounded-2xl"
          />
          <p className="text-xs text-muted-foreground">
            Cash on hand before your first entry. The Ledger's running balance starts here.
          </p>
        </div>
        <Button type="submit" disabled={update.isPending} className="rounded-2xl">
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="neon-panel p-6 flex items-center justify-between">
        <div>
          <div className="font-medium">Sign out</div>
          <div className="text-sm text-muted-foreground">End your session on this device.</div>
        </div>
        <Button variant="destructive" onClick={signOut} className="rounded-2xl">
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </div>
    </div>
  );
}
