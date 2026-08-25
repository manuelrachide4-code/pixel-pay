import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Download,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { startCheckout, getPaymentStatus, getPublicProduct, getDelivery } from "@/lib/checkout.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-logo";
import mpesaLogo from "@/assets/mpesa.png.asset.json";
import emolaLogo from "@/assets/emola.png.asset.json";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "Checkout seguro | DropPay Pro" },
      {
        name: "description",
        content: "Pague em segundos com M-Pesa, e-Mola, mKesh ou cartão. Checkout seguro DropPay Pro.",
      },
      { property: "og:title", content: "Checkout seguro | DropPay Pro" },
      { property: "og:description", content: "Pagamento rápido com M-Pesa, e-Mola, mKesh ou cartão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Checkout,
});

const methods = [
  { id: "EMOLA", label: "e-Mola", logo: emolaLogo.url, hint: "86 123 4567" },
  { id: "MPESA", label: "M-Pesa", logo: mpesaLogo.url, hint: "84 123 4567" },
  { id: "MKESH", label: "mKesh", logo: null, hint: "82 123 4567" },
  { id: "CARD", label: "Cartão", logo: null, hint: "84 123 4567" },
] as const;

const mzn = (v: number) =>
  `Mt ${new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} MZN`;

function Checkout() {
  const { slug } = Route.useParams();
  const start = useServerFn(startCheckout);
  const checkStatus = useServerFn(getPaymentStatus);
  const fetchProduct = useServerFn(getPublicProduct);
  const fetchDelivery = useServerFn(getDelivery);

  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("MPESA");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");

  const activeMethod = methods.find((m) => m.id === method)!;
  const phone = `258${localPhone}`;

  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["public-product", slug],
    retry: 1,
    queryFn: async () => {
      try {
        return await fetchProduct({ data: { slug } });
      } catch (serverError) {
        // Fallback to client-side select. Include image_url so the UI can still
        // show the image when the bucket is public or the path is a public URL.
        const { data, error } = await supabase
          .from("products")
          .select("name, description, price, currency, product_type, image_url")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        if (error) throw serverError;
        return data ? { ...data, image_url: data.image_url ?? null } : null;
      }
    },
  });

  const { data: delivery } = useQuery({
    queryKey: ["delivery", reference],
    enabled: !!reference && status === "paid",
    queryFn: () => fetchDelivery({ data: { reference: reference! } }),
  });

  useEffect(() => {
    if (!reference || status !== "pending") return;
    const timer = setInterval(async () => {
      const result = await checkStatus({ data: { reference } });
      if (result?.status && result.status !== "pending") setStatus(result.status);
    }, 5000);
    return () => clearInterval(timer);
  }, [reference, status, checkStatus]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (localPhone.length !== 9) {
      toast.error("Introduza um número válido com 9 dígitos.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await start({
        data: {
          slug,
          method,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          origin: window.location.origin,
        },
      });
      setReference(result.reference);
      setStatus(result.status);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao iniciar pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <Skeleton className="h-[32rem] w-full rounded-2xl" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl font-semibold">Falha ao carregar</h1>
        <p className="text-muted-foreground">Houve um problema de ligação. Tente novamente.</p>
        <Button variant="hero" onClick={() => void refetch()}>
          Tentar de novo
        </Button>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl font-semibold">Produto indisponível</h1>
        <p className="text-muted-foreground">Este link de checkout não existe ou foi desactivado.</p>
      </main>
    );
  }

  const price = Number(product.price);

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center justify-center gap-2">
        <BrandMark />
        <span className="font-display text-base font-semibold">DropPay Pro</span>
      </div>

      {/* Resumo do produto */}
      <section className="glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="size-20 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
              <BrandMark />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold leading-snug">{product.name}</h1>
            <p className="mt-1 font-display text-xl font-bold text-primary">{mzn(price)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.product_type === "curso"
                ? "Acesso imediato à área de membros após o pagamento"
                : "Download imediato após o pagamento"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{mzn(price)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Taxas:</span>
            <span className="text-primary">Grátis</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 font-display text-lg font-semibold">
            <span>Total:</span>
            <span className="text-primary">{mzn(price)}</span>
          </div>
        </div>
      </section>

      {/* Estados */}
      {status === "paid" ? (
        <section className="glass mt-4 flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <h2 className="font-display text-xl font-semibold">Pagamento confirmado</h2>
          <p className="text-sm text-muted-foreground">Referência {reference}</p>
          {delivery?.downloadUrl ? (
            <Button variant="hero" className="mt-2 w-full gap-2" asChild>
              <a href={delivery.downloadUrl} download>
                <Download className="size-4" /> Baixar {delivery.name}
              </a>
            </Button>
          ) : delivery?.accessUrl ? (
            <Button variant="hero" className="mt-2 w-full gap-2" asChild>
              <a href={delivery.accessUrl} target="_blank" rel="noreferrer">
                <GraduationCap className="size-4" /> Aceder à área de membros
              </a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">A preparar o seu acesso…</p>
          )}
        </section>
      ) : reference && status === "pending" ? (
        <section className="glass mt-4 flex flex-col items-center gap-3 rounded-2xl p-6 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <h2 className="font-display text-lg font-semibold">A aguardar confirmação</h2>
          <p className="text-sm text-muted-foreground">
            Confirme o pagamento no seu telemóvel ({phone}). Referência {reference}.
          </p>
        </section>
      ) : (
        <form className="mt-4 space-y-5" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="cname">
              Nome completo <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cname"
                className="h-12 pl-9"
                placeholder="Nome completo"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cemail">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cemail"
                type="email"
                className="h-12 pl-9"
                placeholder="seu@email.com"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" /> Selecione o método de pagamento {" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                    method === m.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      method === m.id ? "border-primary" : "border-border",
                    )}
                  >
                    {method === m.id ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  {m.logo ? (
                    <img src={m.logo} alt={m.label} className="size-9 rounded-lg bg-background object-contain p-0.5" />
                  ) : null}
                  <span className="font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cphone">
              Número {activeMethod.label} <span className="text-destructive">*</span>
            </Label>
            <div className="flex h-12 items-center rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
              <span className="flex h-full items-center border-r border-input px-3 text-sm text-muted-foreground">
                +258
              </span>
              <input
                id="cphone"
                inputMode="numeric"
                placeholder={activeMethod.hint}
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="hero" className="h-12 w-full gap-2 text-base" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            Pagar {mzn(price)}
          </Button>

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> Pagamento seguro com encriptação de ponta a ponta
          </p>
        </form>
      )}

      {status === "failed" || status === "cancelled" ? (
        <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
          Pagamento não concluído. Confirme o número e tente novamente.
        </p>
      ) : null}
    </main>
  );
}

export default Checkout;
