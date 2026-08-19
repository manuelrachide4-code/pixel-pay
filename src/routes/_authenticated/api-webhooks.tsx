import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/api-webhooks")({
  head: () => ({
    meta: [
      { title: "API & Webhooks | DropPay Pro" },
      {
        name: "description",
        content:
          "Gere chaves de API, configure endpoints de webhook e integre a DropPay Pro no seu site ou sistema de vendas.",
      },
      { property: "og:title", content: "API & Webhooks | DropPay Pro" },
      {
        property: "og:description",
        content: "Chaves de API seguras, endpoints de webhook e documentação de integração da DropPay Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiPage,
});

function copy(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Copiado.");
}

function ApiPage() {
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, last_used_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const hooks = useQuery({
    queryKey: ["webhook-endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("id, url, secret, active, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_api_key", { _name: keyName.trim() });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (key) => {
      setNewKey(key);
      setKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chave revogada.");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addHook = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const { error } = await supabase.from("webhook_endpoints").insert({ seller_id: uid, url: url.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Endpoint adicionado.");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleHook = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("webhook_endpoints").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeHook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Endpoint removido.");
      queryClient.invalidateQueries({ queryKey: ["webhook-endpoints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "https://droppay.pro";

  return (
    <AppShell title="API & Webhooks">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <KeyRound className="size-4 text-primary" /> Chaves de API
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A chave completa só é mostrada uma vez. Guarde-a num local seguro.
          </p>

          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createKey.mutate();
            }}
          >
            <Input
              className="min-w-40 flex-1"
              placeholder="Nome da chave (ex.: Loja principal)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
            <Button type="submit" disabled={createKey.isPending}>
              {createKey.isPending ? "A gerar…" : "Gerar chave"}
            </Button>
          </form>

          {newKey && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-4">
              <p className="text-sm font-medium text-primary">Copie a sua nova chave agora</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-background/60 px-3 py-2 text-xs">{newKey}</code>
                <Button type="button" variant="glass" size="sm" onClick={() => copy(newKey)}>
                  <Copy className="size-4" /> Copiar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {keys.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (keys.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não gerou nenhuma chave.</p>
            ) : (
              (keys.data ?? []).map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}••••••••</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => revokeKey.mutate(k.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Webhook className="size-4 text-primary" /> Endpoints de webhook
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviamos um POST em cada mudança de estado de pagamento, assinado com o segredo do endpoint.
          </p>

          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addHook.mutate();
            }}
          >
            <Input
              className="min-w-40 flex-1"
              type="url"
              placeholder="https://o-seu-site.com/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Button type="submit" disabled={addHook.isPending}>
              Adicionar
            </Button>
          </form>

          <div className="mt-4 space-y-2">
            {hooks.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (hooks.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum endpoint configurado.</p>
            ) : (
              (hooks.data ?? []).map((h) => (
                <div key={h.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm">{h.url}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        h.active ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {h.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 text-xs">
                      segredo: {h.secret}
                    </code>
                    <Button type="button" variant="glass" size="sm" onClick={() => copy(h.secret)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHook.mutate({ id: h.id, active: h.active })}
                    >
                      {h.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeHook.mutate(h.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-5 xl:col-span-2">
          <h2 className="font-display text-lg font-semibold">Como integrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Autentique cada pedido com o cabeçalho <code className="font-mono">Authorization: Bearer</code> e a sua
            chave.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-secondary p-4 text-xs leading-relaxed">
            <code>{`POST ${origin}/api/public/checkout
Authorization: Bearer dpp_live_xxx
Content-Type: application/json

{
  "productSlug": "meu-ebook",
  "method": "MPESA",
  "customerPhone": "258841234567",
  "customerName": "Cliente Exemplo"
}`}</code>
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Payload recebido no seu webhook quando um pagamento muda de estado:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-secondary p-4 text-xs leading-relaxed">
            <code>{`{
  "event": "payment.paid",
  "reference": "aB3x9pQ2z7K",
  "amount": 1000,
  "currency": "MZN",
  "method": "MPESA",
  "product": { "slug": "meu-ebook", "name": "Meu Ebook" },
  "createdAt": "2026-01-01T10:00:00Z"
}`}</code>
          </pre>
        </section>
      </div>
    </AppShell>
  );
}
