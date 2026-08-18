import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/saques")({
  head: () => ({
    meta: [
      { title: "Carteira e saques | DropPay Pro" },
      {
        name: "description",
        content: "Consulte o saldo disponível, peça saques para M-Pesa, e-Mola, mKesh ou banco e acompanhe cada pedido.",
      },
      { property: "og:title", content: "Carteira e saques | DropPay Pro" },
      { property: "og:description", content: "Levantamentos rápidos com taxa transparente de 12% da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawalsPage,
});

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 2 })
    .format(v)
    .replace("MTn", "MZN");

const methods = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "emola", label: "e-Mola" },
  { value: "mkesh", label: "mKesh" },
  { value: "bank", label: "Banco (NIB)" },
] as const;

export const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  rejected: "Rejeitado",
};

export function statusClass(status: string) {
  return status === "paid"
    ? "bg-primary/15 text-primary"
    : status === "pending"
      ? "bg-secondary text-secondary-foreground"
      : "bg-destructive/15 text-destructive";
}

function WithdrawalsPage() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("mpesa");
  const [destination, setDestination] = useState("");
  const [accountName, setAccountName] = useState("");

  const profile = useQuery({
    queryKey: ["wallet-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("available_balance, blocked_balance, total_revenue, total_withdrawn")
        .eq("id", auth.user?.id ?? "")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const list = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount, fee_amount, net_amount, method, destination, status, admin_note, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 20000,
  });

  const value = Number(amount || 0);
  const fee = Math.round(value * 0.12 * 100) / 100;

  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("request_withdrawal", {
        _amount: value,
        _method: method,
        _destination: destination.trim(),
        _account_name: accountName.trim() || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido de saque enviado. Será processado pela administração.");
      setAmount("");
      setDestination("");
      setAccountName("");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balance = Number(profile.data?.available_balance ?? 0);

  return (
    <AppShell title="Carteira e saques">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Saldo disponível", value: balance },
          { label: "Bloqueado em saques", value: Number(profile.data?.blocked_balance ?? 0) },
          { label: "Receita total", value: Number(profile.data?.total_revenue ?? 0) },
          { label: "Já levantado", value: Number(profile.data?.total_withdrawn ?? 0) },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-2xl font-semibold">{mzn(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="glass space-y-4 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            request.mutate();
          }}
        >
          <h2 className="font-display text-lg font-semibold">Pedir saque</h2>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (MZN)</Label>
            <Input
              id="amount"
              type="number"
              min={100}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 100 MZN. Taxa da plataforma: 12%.</p>
          </div>

          <div className="space-y-2">
            <Label>Método</Label>
            <div className="grid grid-cols-2 gap-2">
              {methods.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    method === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">{method === "bank" ? "NIB / IBAN" : "Número de telemóvel"}</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === "bank" ? "000100000000000000000" : "258841234567"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Nome do titular (opcional)</Label>
            <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </div>

          <div className="rounded-xl border border-border p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Taxa (12%)</span>
              <span>{mzn(fee)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span>Recebe</span>
              <span>{mzn(Math.max(value - fee, 0))}</span>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={request.isPending || value <= 0 || value > balance}>
            {value > balance ? "Saldo insuficiente" : request.isPending ? "A enviar..." : "Pedir saque"}
          </Button>
        </form>

        <div className="glass overflow-hidden rounded-2xl">
          {list.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !list.data?.length ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Wallet className="size-8 text-primary" />
              <p className="text-muted-foreground">Ainda não pediu nenhum saque.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Valor</th>
                    <th className="px-4 py-3 font-medium">Taxa</th>
                    <th className="px-4 py-3 font-medium">Líquido</th>
                    <th className="px-4 py-3 font-medium">Destino</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((w) => (
                    <tr key={w.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(w.created_at).toLocaleString("pt-MZ")}
                      </td>
                      <td className="px-4 py-3">{mzn(Number(w.amount))}</td>
                      <td className="px-4 py-3 text-muted-foreground">{mzn(Number(w.fee_amount))}</td>
                      <td className="px-4 py-3 font-medium">{mzn(Number(w.net_amount))}</td>
                      <td className="px-4 py-3">
                        <span className="block uppercase">{w.method}</span>
                        <span className="text-xs text-muted-foreground">{w.destination}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusClass(w.status)}>{statusLabel[w.status] ?? w.status}</Badge>
                        {w.admin_note ? (
                          <span className="mt-1 block text-xs text-muted-foreground">{w.admin_note}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
