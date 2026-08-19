import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/afiliados")({
  head: () => ({
    meta: [
      { title: "Afiliados | DropPay Pro" },
      {
        name: "description",
        content:
          "Crie parceiros afiliados, defina a comissão por produto e acompanhe as vendas geradas por cada link de divulgação.",
      },
      { property: "og:title", content: "Afiliados | DropPay Pro" },
      {
        property: "og:description",
        content: "Programa de afiliados com códigos únicos, comissões personalizadas e acompanhamento de vendas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AffiliatesPage,
});

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 2 })
    .format(v)
    .replace("MTn", "MZN");

function randomCode() {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function AffiliatesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [commission, setCommission] = useState("20");

  const products = useQuery({
    queryKey: ["affiliate-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const affiliates = useQuery({
    queryKey: ["affiliates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("id, name, email, code, commission_percent, status, product_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sales = useQuery({
    queryKey: ["affiliate-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("affiliate_id, affiliate_commission, amount, status")
        .eq("status", "paid");
      if (error) throw error;
      return data;
    },
  });

  const statsFor = (id: string) => {
    const rows = (sales.data ?? []).filter((p) => p.affiliate_id === id);
    return {
      count: rows.length,
      commission: rows.reduce((acc, r) => acc + Number(r.affiliate_commission ?? 0), 0),
      volume: rows.reduce((acc, r) => acc + Number(r.amount ?? 0), 0),
    };
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const { error } = await supabase.from("affiliates").insert({
        seller_id: uid,
        name: name.trim(),
        email: email.trim() || null,
        product_id: productId || null,
        commission_percent: Number(commission || 0),
        code: randomCode(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Afiliado criado.");
      setName("");
      setEmail("");
      setCommission("20");
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("affiliates")
        .update({ status: status === "active" ? "paused" : "active" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["affiliates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("affiliates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Afiliado removido.");
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function linkFor(a: { code: string; product_id: string | null }) {
    const product = (products.data ?? []).find((p) => p.id === a.product_id);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return product ? `${origin}/c/${product.slug}?ref=${a.code}` : `${origin}/?ref=${a.code}`;
  }

  return (
    <AppShell title="Afiliados">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="glass h-fit space-y-4 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Users className="size-4 text-primary" /> Novo afiliado
          </h2>

          <div className="space-y-2">
            <Label htmlFor="aff-name">Nome</Label>
            <Input id="aff-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aff-email">E-mail (opcional)</Label>
            <Input id="aff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aff-product">Produto</Label>
            <select
              id="aff-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">Todos os produtos</option>
              {(products.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aff-commission">Comissão (%)</Label>
            <Input
              id="aff-commission"
              type="number"
              min={0}
              max={90}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "A criar…" : "Criar afiliado"}
          </Button>
        </form>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Os seus afiliados</h2>

          {affiliates.isLoading ? (
            <div className="mt-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : (affiliates.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Ainda não tem afiliados. Crie o primeiro parceiro e partilhe o link de divulgação.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {(affiliates.data ?? []).map((a) => {
                const s = statsFor(a.id);
                const link = linkFor(a);
                return (
                  <div key={a.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.email ?? "sem e-mail"} · código <span className="font-mono">{a.code}</span> ·{" "}
                          {Number(a.commission_percent)}% de comissão
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          a.status === "active"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {a.status === "active" ? "Ativo" : "Pausado"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Vendas</p>
                        <p className="font-medium">{s.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="font-medium">{mzn(s.volume)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Comissões</p>
                        <p className="font-medium">{mzn(s.commission)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-xs">{link}</code>
                      <Button
                        type="button"
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          toast.success("Link copiado.");
                        }}
                      >
                        <Copy className="size-4" /> Copiar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle.mutate({ id: a.id, status: a.status })}
                      >
                        {a.status === "active" ? "Pausar" : "Ativar"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove.mutate(a.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
