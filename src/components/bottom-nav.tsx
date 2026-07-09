import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, Wallet, BookOpen, Target } from "lucide-react";

const items = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard, accent: "var(--neon-cyan)" },
  { title: "Ledger", url: "/ledger", icon: BookOpen, accent: "var(--neon-cyan)" },
  { title: "Income", url: "/income", icon: Wallet, accent: "var(--neon-lime)" },
  { title: "Expenses", url: "/expenses", icon: Receipt, accent: "var(--neon-magenta)" },
  { title: "Budgets", url: "/budgets", icon: Target, accent: "var(--neon-cyan)" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "transparent",
        backdropFilter: "blur(16px)",
      }}
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around px-2 py-1.5">
        {items.map((item) => {
          const active = pathname === item.url || pathname.startsWith(item.url + "/");
          const Icon = item.icon;
          return (
            <li key={item.url} className="flex-1">
              <Link
                to={item.url}
                className="flex flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition"
                style={{
                  color: active ? (item.accent as string) : undefined,
                  textShadow: active ? "0 0 8px currentColor" : undefined,
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ filter: active ? "drop-shadow(0 0 6px currentColor)" : undefined }}
                />
                <span>{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
