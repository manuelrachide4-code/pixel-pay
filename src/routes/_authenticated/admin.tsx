import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { statusClass, statusLabel } from "./saques";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administração | DropPay Pro" },
      {
        name: "description",
        content:
          "Painel do administrador: vendedores, KYC, produtos, vendas, pedidos de saque e receita de comissões da plataforma.",
      },
      { property: "og:title", content: "Administração | DropPay Pro" },
      { property: "og:description", content: "Aprove saques e KYC e acompanhe a receita de 12% da DropPay Pro." },
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

const kycClass: Record<string, string> = {
  approved: "bg-primary/15 text-primary",
  pending: "bg-amber-500/15 text-amber-400",
  rejected: "bg-destructive/15 text-destructive",
};

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AdminPage() {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: checking } = useIsAdmin();
  const [q, setQ] = useState("");

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
        .select("id, full_name, email, phone, document, country, kyc_status, available_balance, blocked_balance, total_revenue, total_withdrawn, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
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
        .select("id, reference, amount, method, status, customer_name, customer_phone, seller_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  const products = useQuery({
    enabled: !!isAdmin,
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, product_type, is_active, seller_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
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
      const { error } = await supabase.rpc("resolve_withdrawal", { _id: id, _status: status, _note: note ?? "" });
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

  const setKyc = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "approved" | "rejected" | "pending" }) => {
      const { error } = await supabase.rpc("admin_set_kyc", { _user_id: userId, _status: status });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KYC atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.rpc("admin_set_product_active", { _product_id: id, _active: active });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sellerName = useMemo(() => {
    const map = new Map((sellers.data ?? []).map((s) => [s.id, s.full_name || s.email || s.id.slice(0, 8)]));
    return (id: string | null) => (id ? map.get(id) ?? id.slice(0, 8) : "—");
  }, [sellers.data]);

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

  const term = q.trim().toLowerCase();
  const match = (...vals: (string | null | undefined)[]) =>
    !term || vals.some((v) => (v ?? "").toLowerCase().includes(term));

  const totalFees = (earnings.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const paidPayments = (payments.data ?? []).filter((p) => p.status === "paid");
  const paidVolume = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
  const pending = (withdrawals.data ?? []).filter((w) => w.status === "pending");
  const pendingKyc = (sellers.data ?? []).filter((s) => s.kyc_status === "pending");
  const owedBalance = (sellers.data ?? []).reduce(
    (s, x) => s + Number(x.available_balance) + Number(x.blocked_balance),
    0,
  );

  const filteredWithdrawals = (withdrawals.data ?? []).filter((w) =>
    match(sellerName(w.seller_id), w.destination, w.method, w.status),
  );
  const filteredSellers = (sellers.data ?? []).filter((s) => match(s.full_name, s.email, s.phone, s.document));
  const filteredPayments = (payments.data ?? []).filter((p) =>
    match(p.reference, p.customer_name, p.customer_phone, p.status, sellerName(p.seller_id)),
  );
  const filteredProducts = (products.data ?? []).filter((p) =>
    match(p.name, p.slug, p.product_type, sellerName(p.seller_id)),
  );

  return (
    <AppShell title="Administração">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Receita da plataforma (12%)", value: mzn(totalFees) },
          { label: "Volume pago", value: mzn(paidVolume) },
          { label: "Saldo dos vendedores", value: mzn(owedBalance) },
          { label: "Saques pendentes", value: String(pending.length) },
          { label: "KYC por rever", value: String(pendingKyc.length) },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por vendedor, email, referência, produto…"
          className="max-w-md"
        />
      </div>

      <Tabs defaultValue="saques" className="mt-4">
        <TabsList className="grid w-full grid-cols-2 bg-secondary sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="saques">Saques</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
        </TabsList>

        <TabsContent value="saques" className="mt-4">
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
                {filteredWithdrawals.map((w) => (
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
                          <Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: w.id, status: "paid" })}>
                            Marcar pago
                          </Button>
                          <Button
                            size="sm"
                            variant="glass"
                            disabled={resolve.isPending}
                            onClick={() => resolve.mutate({ id: w.id, status: "rejected", note: "Rejeitado pela administração" })}
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
                {!filteredWithdrawals.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum pedido de saque.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="vendedores" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button
              variant="glass"
              size="sm"
              onClick={() =>
                downloadCsv("vendedores", [
                  ["Nome", "Email", "Telefone", "Documento", "KYC", "Saldo", "Bloqueado", "Receita"],
                  ...filteredSellers.map((s) => [
                    s.full_name,
                    s.email ?? "",
                    s.phone ?? "",
                    s.document ?? "",
                    s.kyc_status,
                    Number(s.available_balance),
                    Number(s.blocked_balance),
                    Number(s.total_revenue),
                  ]),
                ])
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Receita</th>
                  <th className="px-4 py-3 font-medium">KYC</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="block">{s.full_name || "—"}</span>
                      <span className="text-xs text-muted-foreground">Doc: {s.document || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{s.email}</span>
                      <span className="text-xs text-muted-foreground">{s.phone}</span>
                    </td>
                    <td className="px-4 py-3">{mzn(Number(s.available_balance))}</td>
                    <td className="px-4 py-3">{mzn(Number(s.total_revenue))}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={kycClass[s.kyc_status] ?? ""}>{s.kyc_status}</Badge>
                        {s.kyc_status !== "approved" && (
                          <Button size="sm" disabled={setKyc.isPending} onClick={() => setKyc.mutate({ userId: s.id, status: "approved" })}>
                            Aprovar
                          </Button>
                        )}
                        {s.kyc_status !== "rejected" && (
                          <Button
                            size="sm"
                            variant="glass"
                            disabled={setKyc.isPending}
                            onClick={() => setKyc.mutate({ userId: s.id, status: "rejected" })}
                          >
                            Rejeitar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredSellers.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum vendedor encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="mt-4">
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="block">{p.name}</span>
                      <span className="text-xs text-muted-foreground">/c/{p.slug}</span>
                    </td>
                    <td className="px-4 py-3">{sellerName(p.seller_id)}</td>
                    <td className="px-4 py-3 capitalize">{p.product_type}</td>
                    <td className="px-4 py-3">{mzn(Number(p.price))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge className={p.is_active ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="glass"
                          disabled={toggleProduct.isPending}
                          onClick={() => toggleProduct.mutate({ id: p.id, active: !p.is_active })}
                        >
                          {p.is_active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredProducts.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="transacoes" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button
              variant="glass"
              size="sm"
              onClick={() =>
                downloadCsv("transacoes", [
                  ["Referência", "Vendedor", "Cliente", "Telefone", "Método", "Valor", "Estado", "Data"],
                  ...filteredPayments.map((p) => [
                    p.reference,
                    sellerName(p.seller_id),
                    p.customer_name ?? "",
                    p.customer_phone ?? "",
                    p.method,
                    Number(p.amount),
                    p.status,
                    new Date(p.created_at).toISOString(),
                  ]),
                ])
              }
            >
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium">Referência</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.slice(0, 100).map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                    <td className="px-4 py-3">{sellerName(p.seller_id)}</td>
                    <td className="px-4 py-3">
                      <span className="block">{p.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{p.customer_phone}</span>
                    </td>
                    <td className="px-4 py-3">{mzn(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusClass(p.status === "paid" ? "paid" : p.status === "pending" ? "pending" : "rejected")}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {!filteredPayments.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
