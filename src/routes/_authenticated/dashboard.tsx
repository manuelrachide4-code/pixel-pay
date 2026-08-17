import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  
  Percent,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard do vendedor | DropPay Pro" },
      {
        name: "description",
        content: "Acompanhe vendas, receita, saldo e conversão da sua operação digital em tempo real.",
      },
      { property: "og:title", content: "Dashboard do vendedor | DropPay Pro" },
      {
        property: "og:description",
        content: "Vendas, receita, saldo disponível e conversão num só painel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 })
    .format(v)
    .replace("MTn", "MZN");

const salesSeries = [
  { d: "Seg", vendas: 12, receita: 18400 },
  { d: "Ter", vendas: 19, receita: 27300 },
  { d: "Qua", vendas: 15, receita: 21100 },
  { d: "Qui", vendas: 28, receita: 39800 },
  { d: "Sex", vendas: 34, receita: 51200 },
  { d: "Sáb", vendas: 41, receita: 62450 },
  { d: "Dom", vendas: 26, receita: 37600 },
];

const methods = [
  { name: "M-Pesa", value: 54 },
  { name: "e-Mola", value: 22 },
  { name: "mKesh", value: 11 },
  { name: "Cartão", value: 13 },
];

const traffic = [
  { canal: "Instagram", visitas: 4200 },
  { canal: "TikTok", visitas: 3100 },
  { canal: "Facebook", visitas: 2400 },
  { canal: "Direto", visitas: 1500 },
  { canal: "Afiliados", visitas: 980 },
];

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

function Dashboard() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["payments", "summary"],
    queryFn: async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("payments")
        .select("amount, status, created_at")
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const paidToday = (payments ?? []).filter((p) => p.status === "paid");
  const pendingToday = (payments ?? []).filter((p) => p.status === "pending");
  const revenueToday = paidToday.reduce((sum, p) => sum + Number(p.amount), 0);

  const cards = [
    { label: "Vendas hoje", value: String(paidToday.length), delta: `${pendingToday.length} pendentes`, icon: ShoppingCart },
    { label: "Receita hoje", value: mzn(revenueToday), delta: "PayMoz", icon: TrendingUp },
    { label: "Receita total", value: mzn(Number(profile?.total_revenue ?? 0)), delta: "Acumulado", icon: TrendingUp },
    {
      label: "Saldo disponível",
      value: mzn(Number(profile?.available_balance ?? 0)),
      delta: "Liquidação D+1",
      icon: Wallet,
    },
    { label: "Saldo bloqueado", value: mzn(Number(profile?.blocked_balance ?? 0)), delta: "Em retenção", icon: Banknote },
    { label: "Conversão", value: "6,4%", delta: "+0,8 p.p.", icon: Percent },
  ];


  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div className="glass flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-48" />
            ) : (
              <h2 className="font-display text-2xl font-semibold">
                {profile?.full_name?.trim() || "Vendedor DropPay"}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-secondary text-secondary-foreground">
              <BadgeCheck className="size-3.5 text-primary" />
              KYC: {profile?.kyc_status === "approved" ? "Aprovado" : "Pendente"}
            </Badge>
            <Badge className="bg-secondary text-secondary-foreground">
              {profile?.preferred_currency ?? "MZN"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="glass rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-2 font-display text-2xl font-semibold">{c.value}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <c.icon className="size-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                <ArrowUpRight className="size-3.5" /> {c.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <p className="mb-4 font-display font-semibold">Receita dos últimos 7 dias</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={60} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <p className="mb-4 font-display font-semibold">Métodos de pagamento</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={methods} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4}>
                    {methods.map((m, i) => (
                      <Cell key={m.name} fill={pieColors[i % pieColors.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {methods.map((m, i) => (
                <span key={m.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: pieColors[i % pieColors.length] }}
                  />
                  {m.name} · {m.value}%
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <p className="mb-4 font-display font-semibold">Vendas por dia</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesSeries}>
                  <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-secondary)" }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Bar dataKey="vendas" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <p className="mb-4 font-display font-semibold">Origem do tráfego</p>
            <ul className="space-y-3">
              {traffic.map((t) => (
                <li key={t.canal}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{t.canal}</span>
                    <span className="text-muted-foreground">{t.visitas.toLocaleString("pt-MZ")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="gradient-brand h-full rounded-full"
                      style={{ width: `${(t.visitas / 4200) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
