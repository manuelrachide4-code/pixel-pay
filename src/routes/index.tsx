import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Code2,
  CreditCard,
  Globe2,
  Lock,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
  Webhook,
  Zap,
} from "lucide-react";

import heroBg from "@/assets/hero-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Landing,
});

const methods = ["M-Pesa", "e-Mola", "mKesh", "Visa", "Mastercard", "PayPal"];

const steps = [
  { icon: Users, title: "Cria a tua conta", text: "Registo em 2 minutos com verificação de email, telefone e KYC." },
  { icon: Rocket, title: "Publica o produto", text: "Ebooks, cursos, licenças ou serviços — com entrega automática." },
  { icon: CreditCard, title: "Recebe pagamentos", text: "Checkout optimizado com M-Pesa, e-Mola, mKesh e cartão." },
  { icon: Wallet, title: "Levanta o dinheiro", text: "Saques para M-Pesa, e-Mola ou banco com aprovação automática." },
];

const benefits = [
  { icon: Zap, title: "Checkout de alta conversão", text: "Order bump, upsell, downsell, cupões e timer de escassez incluídos." },
  { icon: Wallet, title: "Carteira multi-moeda", text: "Saldos em MZN, USD e ZAR com histórico completo de movimentos." },
  { icon: Webhook, title: "Webhooks fiáveis", text: "Eventos assinados com HMAC SHA256 e logs de reentrega." },
  { icon: Code2, title: "API REST completa", text: "Chaves sandbox e produção com permissões granulares por escopo." },
  { icon: BarChart3, title: "Relatórios em tempo real", text: "Vendas, receita, métodos de pagamento e origem do tráfego." },
  { icon: Users, title: "Programa de afiliados", text: "Links, cliques, conversões e comissões pagas automaticamente." },
];

const security = [
  { icon: Lock, title: "Criptografia ponta a ponta", text: "Dados sensíveis cifrados em trânsito e em repouso." },
  { icon: ShieldCheck, title: "Anti-fraude e 2FA", text: "Análise de risco por transacção e autenticação em dois passos." },
  { icon: Activity, title: "Logs e auditoria", text: "Registo imutável de acessos, saques e alterações de conta." },
];

const testimonials = [
  { name: "Aline Machava", role: "Infoprodutora", text: "Passei a receber por M-Pesa sem stress. Os saques caem no mesmo dia." },
  { name: "Nuno Cossa", role: "Agência digital", text: "A API e os webhooks pouparam-nos semanas de integração." },
  { name: "Telma Bila", role: "Mentoria online", text: "O order bump aumentou o meu ticket médio em 34% no primeiro mês." },
];

const plans = [
  { name: "Start", price: "0 MZN", fee: "6,9% por venda", features: ["Checkout completo", "Carteira digital", "1 produto activo", "Suporte por email"] },
  { name: "Pro", price: "1.500 MZN/mês", fee: "4,9% por venda", features: ["Produtos ilimitados", "Order bump e upsell", "API + Webhooks", "Afiliados"], highlight: true },
  { name: "Scale", price: "Sob consulta", fee: "3,9% por venda", features: ["Taxas negociadas", "Gestor dedicado", "SLA e sandbox", "Relatórios avançados"] },
];

const faqs = [
  { q: "Quanto tempo demora um saque?", a: "Saques para M-Pesa e e-Mola são processados automaticamente, normalmente em minutos. Transferências bancárias podem levar até 24 horas úteis." },
  { q: "Preciso de empresa registada?", a: "Não. Pode começar como pessoa singular com BI ou NUIT e completar o KYC dentro da plataforma." },
  { q: "Que produtos posso vender?", a: "Produtos e serviços digitais: ebooks, cursos, mentorias, licenças de software, templates e assinaturas." },
  { q: "Existe integração com pixels?", a: "Sim. Pode ligar Facebook Pixel, TikTok Pixel, Google Analytics e UTMify em cada checkout." },
];

function Landing() {
  const [sales, setSales] = useState(18432);

  useEffect(() => {
    const id = setInterval(() => setSales((v) => v + Math.floor(Math.random() * 3)), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroBg}
            alt="Cartão de pagamento futurista sobre fundo escuro"
            width={1600}
            height={1008}
            className="absolute inset-0 size-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-background/60" aria-hidden />
          <div className="hero-glow absolute inset-0" aria-hidden />

          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-28 sm:pt-36">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" /> O gateway feito para vendedores digitais
              de Moçambique
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
              Receba por <span className="text-gradient">M-Pesa, e-Mola e cartão</span> num só
              checkout
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              DropPay Pro reúne checkout de alta conversão, carteira digital, saques instantâneos,
              API REST e afiliados numa plataforma única.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/auth">
                  Criar conta grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat value={sales.toLocaleString("pt-MZ")} label="Vendas processadas" live />
              <Stat value="12.400+" label="Vendedores" />
              <Stat value="99,98%" label="Uptime" />
              <Stat value="< 3 min" label="Saque médio" />
            </div>

            <div className="mt-12 overflow-hidden">
              <div className="flex w-max animate-marquee gap-3">
                {[...methods, ...methods].map((m, i) => (
                  <span
                    key={`${m}-${i}`}
                    className="glass rounded-xl px-5 py-2.5 text-sm text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <Section id="como-funciona" eyebrow="Como funciona" title="Da ideia ao dinheiro na conta">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-primary/10 p-3">
                    <s.icon className="size-5 text-primary" />
                  </div>
                  <span className="font-display text-3xl font-bold text-muted-foreground/30">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Benefícios */}
        <Section id="beneficios" eyebrow="Benefícios" title="Tudo o que uma operação digital precisa">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="glass rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 w-fit rounded-xl bg-accent/10 p-3">
                  <b.icon className="size-5 text-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Segurança */}
        <Section id="seguranca" eyebrow="Segurança" title="Confiança em cada transacção">
          <div className="grid gap-4 md:grid-cols-3">
            {security.map((s) => (
              <div key={s.title} className="glass rounded-2xl p-6">
                <s.icon className="mb-4 size-6 text-primary" />
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Integrações */}
        <Section id="integracoes" eyebrow="Integrações" title="Ligue o seu stack em minutos">
          <div className="glass flex flex-wrap gap-3 rounded-2xl p-6">
            {[
              "M-Pesa API",
              "e-Mola API",
              "mKesh",
              "PayPal",
              "Stripe",
              "Facebook Pixel",
              "TikTok Pixel",
              "Google Analytics",
              "UTMify",
              "Zapier",
            ].map((i) => (
              <span
                key={i}
                className="rounded-xl border border-border bg-secondary/60 px-4 py-2 text-sm text-muted-foreground"
              >
                {i}
              </span>
            ))}
          </div>
        </Section>

        {/* Depoimentos */}
        <Section id="depoimentos" eyebrow="Depoimentos" title="Quem já vende com a DropPay Pro">
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="glass rounded-2xl p-6">
                <blockquote className="text-sm text-muted-foreground">“{t.text}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <div className="gradient-brand flex size-9 items-center justify-center rounded-full font-semibold text-primary-foreground">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* Planos */}
        <Section id="planos" eyebrow="Planos" title="Comece grátis, escale sem surpresas">
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`glass rounded-2xl p-6 ${p.highlight ? "glow border-primary/40" : ""}`}
              >
                {p.highlight && (
                  <span className="gradient-brand mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                <p className="mt-2 font-display text-3xl font-bold">{p.price}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.fee}</p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={p.highlight ? "hero" : "glass"}
                  className="mt-6 w-full"
                  size="lg"
                >
                  <Link to="/auth">Começar</Link>
                </Button>
              </div>
            ))}
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" eyebrow="FAQ" title="Perguntas frequentes">
          <div className="glass rounded-2xl px-6">
            <Accordion type="single" collapsible>
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="glass glow relative overflow-hidden rounded-3xl p-10 text-center">
            <div className="hero-glow absolute inset-0" aria-hidden />
            <div className="relative">
              <Smartphone className="mx-auto mb-4 size-8 text-primary" />
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Comece a receber hoje mesmo
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                Sem mensalidade para começar. Crie a conta, publique o produto e receba o primeiro
                pagamento ainda hoje.
              </p>
              <Button asChild variant="hero" size="xl" className="mt-7">
                <Link to="/auth">
                  Criar conta grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="gradient-brand size-8 rounded-lg" />
          <span className="font-display text-lg font-semibold">DropPay Pro</span>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="transition-colors hover:text-primary">Como funciona</a>
          <a href="#beneficios" className="transition-colors hover:text-primary">Benefícios</a>
          <a href="#planos" className="transition-colors hover:text-primary">Planos</a>
          <a href="#faq" className="transition-colors hover:text-primary">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild variant="hero" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth">Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({ value, label, live }: { value: string; label: string; live?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {live && <span className="size-1.5 animate-pulse rounded-full bg-primary" />}
        {label}
      </p>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="gradient-brand size-6 rounded-md" />
          <span className="font-display font-semibold text-foreground">DropPay Pro</span>
        </div>
        <p className="flex items-center gap-2">
          <Globe2 className="size-4" /> Maputo, Moçambique · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
