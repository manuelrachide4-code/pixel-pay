import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas e pagamentos | DropPay Pro" },
      {
        name: "description",
        content: "Acompanhe cada pagamento PayMoz: método, cliente, referência e estado da transação.",
      },
      { property: "og:title", content: "Vendas e pagamentos | DropPay Pro" },
      { property: "og:description", content: "Todas as transações M-Pesa, e-Mola, mKesh e cartão num só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 })
    .format(v)
    .replace("MTn", "MZN");

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function SalesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, reference, amount, currency, method, status, customer_name, customer_phone, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  return (
    <AppShell title="Vendas">
      <div className="glass overflow-hidden rounded-2xl">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <BarChart3 className="size-8 text-primary" />
            <p className="text-muted-foreground">Ainda não há pagamentos registados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Referência</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                    <td className="px-4 py-3">
                      <span className="block">{p.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{p.customer_phone}</span>
                    </td>
                    <td className="px-4 py-3">{p.method}</td>
                    <td className="px-4 py-3">{mzn(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          p.status === "paid"
                            ? "bg-primary/15 text-primary"
                            : p.status === "pending"
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-destructive/15 text-destructive"
                        }
                      >
                        {statusLabel[p.status] ?? p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-MZ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
