import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Download, GraduationCap, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
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
  { id: "MPESA", label: "M-Pesa", logo: mpesaLogo.url },
  { id: "EMOLA", label: "e-Mola", logo: emolaLogo.url },
  { id: "MKESH", label: "mKesh", logo: null },
  { id: "CARD", label: "Cartão", logo: null },
] as const;

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 })
    .format(v)
    .replace("MTn", "MZN");

function Checkout() {
  const { slug } = Route.useParams();
  const start = useServerFn(startCheckout);
  const checkStatus = useServerFn(getPaymentStatus);
  const fetchProduct = useServerFn(getPublicProduct);
  const fetchDelivery = useServerFn(getDelivery);

  const [method, setMethod] = useState<(typeof methods)[number]["id"]>("MPESA");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("258");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");

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
        // Fallback: produtos activos são legíveis publicamente (sem imagem assinada).
        const { data, error } = await supabase
          .from("products")
          .select("name, description, price, currency, product_type")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        if (error) throw serverError;
        return data ? { ...data, image_url: null as string | null } : null;
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
      <main className="mx-auto max-w-3xl p-6">
        <Skeleton className="h-96 w-full rounded-2xl" />
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <div className="mb-6 flex items-center gap-2">
        <BrandMark />
        <span className="font-display text-lg font-semibold">DropPay Pro</span>
      </div>

      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="mb-6 aspect-[16/7] w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <section className="glass rounded-2xl p-6">
          {status === "paid" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="size-10 text-primary" />
              <h1 className="font-display text-2xl font-semibold">Pagamento confirmado</h1>
              <p className="text-muted-foreground">Referência {reference}</p>

              {delivery?.downloadUrl ? (
                <Button variant="hero" className="mt-2 gap-2" asChild>
                  <a href={delivery.downloadUrl} download>
                    <Download className="size-4" /> Baixar {delivery.name}
                  </a>
                </Button>
              ) : delivery?.accessUrl ? (
                <Button variant="hero" className="mt-2 gap-2" asChild>
                  <a href={delivery.accessUrl} target="_blank" rel="noreferrer">
                    <GraduationCap className="size-4" /> Aceder à área de membros
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">A preparar o seu acesso…</p>
              )}
            </div>
          ) : reference && status === "pending" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-10 animate-spin text-primary" />
              <h1 className="font-display text-xl font-semibold">A aguardar confirmação</h1>
              <p className="text-muted-foreground">
                Confirme o pagamento no seu telemóvel ({phone}). Referência {reference}.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <h1 className="font-display text-xl font-semibold">Finalizar compra</h1>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-sm transition-colors",
                      method === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="flex flex-col items-center gap-1.5">
                      {m.logo ? (
                        <img src={m.logo} alt={m.label} className="h-7 w-auto rounded-md bg-background object-contain" />
                      ) : null}
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cname">Nome completo</Label>
                <Input id="cname" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cemail">Email</Label>
                <Input
                  id="cemail"
                  type="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone">Telemóvel (258XXXXXXXXX)</Label>
                <Input
                  id="cphone"
                  inputMode="numeric"
                  value={phone}
                  maxLength={12}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  required
                />
              </div>

              <Button type="submit" variant="hero" className="w-full gap-2" disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
                Pagar {mzn(Number(product.price))}
              </Button>

              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> Pagamento processado com encriptação de ponta a ponta
              </p>
            </form>
          )}

          {status === "failed" || status === "cancelled" ? (
            <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
              Pagamento não concluído. Tente novamente.
            </p>
          ) : null}
        </section>

        <aside className="glass h-fit rounded-2xl p-6">
          <p className="text-sm text-muted-foreground">Resumo</p>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              className="mt-3 aspect-video w-full rounded-xl object-cover"
            />
          ) : null}
          <p className="mt-2 font-display text-lg font-semibold">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {product.product_type === "curso"
              ? "Acesso imediato à área de membros após o pagamento"
              : "Download imediato após o pagamento"}
          </p>
          {product.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-display text-xl font-semibold">{mzn(Number(product.price))}</span>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> Checkout seguro DropPay Pro
          </p>
        </aside>
      </div>
    </main>
  );
}
