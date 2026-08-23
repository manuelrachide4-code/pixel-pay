import { BrandMark } from "@/components/brand-logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | DropPay Pro" },
      {
        name: "description",
        content:
          "Aceda à sua conta DropPay Pro ou registe-se para começar a vender produtos digitais em Moçambique.",
      },
      { property: "og:title", content: "Entrar ou criar conta | DropPay Pro" },
      {
        property: "og:description",
        content: "Aceda à sua conta DropPay Pro e comece a receber pagamentos hoje.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "Indique o seu nome completo").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(9, "Telefone inválido").max(20),
  country: z.string().min(2),
  document: z.string().trim().min(5, "Documento inválido").max(40),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(1, "Introduza a palavra-passe").max(72),
});

const countries = [
  { code: "MZ", label: "Moçambique" },
  { code: "PT", label: "Portugal" },
  { code: "AO", label: "Angola" },
  { code: "ZA", label: "África do Sul" },
  { code: "BR", label: "Brasil" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("MZ");
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "Email ou palavra-passe incorretos."
          : error.message,
      );
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      phone: form.get("phone"),
      country,
      document: form.get("document"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          country: parsed.data.country,
          document: parsed.data.document,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Já existe uma conta com este email."
          : error.message,
      );
      return;
    }
    if (data.session) {
      navigate({ to: "/dashboard" });
      return;
    }
    setEmailSent(true);
    toast.success("Conta criada! Confirme o email para entrar.");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Voltar ao site
        </Link>

        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark className="size-10 rounded-xl" />
            <div>
              <p className="font-display text-lg font-semibold">DropPay Pro</p>
              <p className="text-xs text-muted-foreground">Conta de vendedor</p>
            </div>
          </div>

          {emailSent ? (
            <div className="space-y-4 text-center">
              <h1 className="font-display text-xl font-semibold">Confirme o seu email</h1>
              <p className="text-sm text-muted-foreground">
                Enviámos um link de confirmação. Clique nele para activar a conta e aceder ao
                dashboard.
              </p>
              <Button variant="glass" className="w-full" onClick={() => setEmailSent(false)}>
                Voltar
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="mb-6 grid w-full grid-cols-2 bg-secondary">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Field label="Email" name="email" type="email" placeholder="voce@email.com" />
                  <Field
                    label="Palavra-passe"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                  />
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />} Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Field label="Nome completo" name="fullName" placeholder="Bernardo Torkk" />
                  <Field label="Email" name="email" type="email" placeholder="voce@email.com" />
                  <Field label="Telefone" name="phone" placeholder="+258 84 000 0000" />
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="bg-secondary/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Field label="Documento (BI / NUIT)" name="document" placeholder="1234567890A" />
                  <Field
                    label="Palavra-passe"
                    name="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />} Criar conta grátis
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!emailSent && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="glass"
                size="lg"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continuar com Google
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : "on"}
        className="bg-secondary/60"
      />
    </div>
  );
}
