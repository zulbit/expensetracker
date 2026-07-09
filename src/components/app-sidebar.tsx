import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, Tags, Settings as SettingsIcon, LogOut, Sparkles, Wallet, Target, BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, accent: "var(--neon-cyan)" },
  { title: "Ledger", url: "/ledger", icon: BookOpen, accent: "var(--neon-cyan)" },
  { title: "Income", url: "/income", icon: Wallet, accent: "var(--neon-lime)" },
  { title: "Expenses", url: "/expenses", icon: Receipt, accent: "var(--neon-magenta)" },
  { title: "Budgets", url: "/budgets", icon: Target, accent: "var(--neon-cyan)" },
  { title: "Categories", url: "/categories", icon: Tags, accent: "var(--neon-violet)" },
  { title: "Settings", url: "/settings", icon: SettingsIcon, accent: "var(--neon-violet)" },
] as const;


export function AppSidebar() {
  const { state, isMobile, setOpenMobile, setOpen } = useSidebar();
  const collapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setOpen(false);
    }
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <div className="flex items-center gap-2 px-2 py-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--neon-cyan)]/10 text-[color:var(--neon-cyan)] neon-text">
            <Sparkles className="h-4 w-4" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold leading-tight truncate">Neon Tracker</div>
              <div className="text-[10px] text-muted-foreground truncate">Personal finance</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="rounded-2xl data-[active=true]:bg-sidebar-accent"
                    >
                      <Link to={item.url} onClick={handleNavClick} className="flex items-center gap-3">
                        <item.icon
                          className="h-4 w-4"
                          style={{
                            color: active ? (item.accent as string) : undefined,
                            filter: active ? "drop-shadow(0 0 6px currentColor)" : undefined,
                          }}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        <div className="p-2 space-y-2">
          {!collapsed && (
            <div className="rounded-2xl bg-sidebar-accent/40 px-3 py-2 text-xs">
              <div className="text-muted-foreground">Signed in as</div>
              <div className="truncate font-medium">{user?.email}</div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start rounded-2xl text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
