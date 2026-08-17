import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  Wallet,
  Webhook,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const },
  { label: "Produtos", icon: Package, to: "/produtos" as const },
  { label: "Vendas", icon: BarChart3, to: "/vendas" as const },
  { label: "Carteira", icon: Wallet },
  { label: "Saques", icon: CreditCard },
  { label: "Afiliados", icon: Users },
  { label: "API & Webhooks", icon: Webhook },
];


export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-sidebar transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="gradient-brand size-8 rounded-lg" />
          <span className="font-display text-lg font-semibold">DropPay Pro</span>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {nav.map((item) => {
            const isActive = item.to ? pathname === item.to : false;
            const inner = (
              <>
                <item.icon className="size-4" />
                {item.label}
              </>
            );
            const base = cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "bg-sidebar-accent text-primary"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
            );
            return item.to ? (
              <Link key={item.label} to={item.to} className={base} onClick={() => setOpen(false)}>
                {inner}
              </Link>
            ) : (
              <span
                key={item.label}
                className={cn(base, "cursor-not-allowed opacity-50")}
                title="Em breve"
              >
                {inner}
              </span>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <Button variant="glass" className="w-full justify-start gap-3" onClick={signOut}>
            <LogOut className="size-4" /> Terminar sessão
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
