import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { statusClass, statusLabel } from "./saques";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração | DropPay Pro" },
      {
        name: "description",
        content: "Painel do administrador: vendedores, vendas, pedidos de saque e receita de comissões da plataforma.",
      },
      { property: "og:title", content: "Administração | DropPay Pro" },
      { property: "og:description", content: "Aprove saques e acompanhe a receita de 12% da DropPay Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 2 })
    .format(v)
    .replace("MTn", "MZN");

function AdminPage() {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: checking } = useIsAdmin();

  const withdrawals = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, seller_id, amount, fee_amount, net_amount, method, destination, account_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  const sellers = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, kyc_status, available_balance, total_revenue, total_withdrawn, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const payments = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, reference, amount, method, status, customer_name, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  const earnings = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-earnings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_earnings").select("amount, created_at");
      if (error) throw error;
      return data;
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: "paid" | "rejected"; note?: string }) => {
      const { error } = await supabase.rpc("resolve_withdrawal", {
        _id: id,
        _status: status,
        _note: note ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saque atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-earnings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (checking) {
    return (
      <AppShell title="Administração">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Administração">
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <ShieldAlert className="size-8 text-destructive" />
          <p className="text-muted-foreground">Área restrita à administração da plataforma.</p>
        </div>
      </AppShell>
    );
  }

  const totalFees = (earnings.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const paidVolume = (payments.data ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const pending = (withdrawals.data ?? []).filter((w) => w.status === "pending");
  const sellerName = (id: string) =>
    sellers.data?.find((s) => s.id === id)?.full_name || sellers.data?.find((s) => s.id === id)?.email || id.slice(0, 8);

  return (
    <AppShell title="Administração">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Receita da plataforma (12%)", value: mzn(totalFees) },
          { label: "Volume pago", value: mzn(paidVolume) },
          { label: "Saques pendentes", value: String(pending.length) },
          { label: "Vendedores", value: String(sellers.data?.length ?? 0) },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Pedidos de saque</h2>
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Taxa 12%</th>
                <th className="px-4 py-3 font-medium">A pagar</th>
                <th className="px-4 py-3 font-medium">Destino</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {(withdrawals.data ?? []).map((w) => (
                <tr key={w.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">{sellerName(w.seller_id)}</td>
                  <td className="px-4 py-3">{mzn(Number(w.amount))}</td>
                  <td className="px-4 py-3 text-primary">{mzn(Number(w.fee_amount))}</td>
                  <td className="px-4 py-3 font-medium">{mzn(Number(w.net_amount))}</td>
                  <td className="px-4 py-3">
                    <span className="block uppercase">{w.method}</span>
                    <span className="text-xs text-muted-foreground">{w.destination}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusClass(w.status)}>{statusLabel[w.status] ?? w.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {w.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={resolve.isPending}
                          onClick={() => resolve.mutate({ id: w.id, status: "paid" })}
                        >
                          Marcar pago
                        </Button>
                        <Button
                          size="sm"
                          variant="glass"
                          disabled={resolve.isPending}
                          onClick={() =>
                            resolve.mutate({ id: w.id, status: "rejected", note: "Rejeitado pela administração" })
                          }
                        >
                          Rejeitar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!withdrawals.data?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum pedido de saque.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Vendedores</h2>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {(sellers.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="block">{s.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">KYC: {s.kyc_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{s.email}</span>
                      <span className="text-xs text-muted-foreground">{s.phone}</span>
                    </td>
                    <td className="px-4 py-3">{mzn(Number(s.available_balance))}</td>
                    <td className="px-4 py-3">{mzn(Number(s.total_revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">Últimas transações</h2>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Referência</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(payments.data ?? []).slice(0, 30).map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                    <td className="px-4 py-3">{p.customer_name}</td>
                    <td className="px-4 py-3">{mzn(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusClass(p.status === "paid" ? "paid" : p.status === "pending" ? "pending" : "rejected")}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
