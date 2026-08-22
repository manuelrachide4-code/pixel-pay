import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Gestão de produtos | DropPay Pro" },
      {
        name: "description",
        content: "Crie infoprodutos, defina preços em MZN e gere links de checkout com M-Pesa e e-Mola.",
      },
      { property: "og:title", content: "Gestão de produtos | DropPay Pro" },
      { property: "og:description", content: "Crie produtos e gere links de checkout num clique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const productSchema = z.object({
  name: z.string().trim().min(3, "Nome muito curto").max(120),
  description: z.string().trim().max(1000).optional(),
  price: z.number().positive("Preço deve ser maior que zero").max(10_000_000),
});

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

const mzn = (v: number) =>
  new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 })
    .format(v)
    .replace("MTn", "MZN");

function ProductThumb({ path, alt }: { path: string | null; alt: string }) {
  const { data: url } = useQuery({
    queryKey: ["product-image", path],
    enabled: !!path,
    queryFn: async () => {
      const { data } = await supabase.storage.from("product-images").createSignedUrl(path!, 3600);
      return data?.signedUrl ?? null;
    },
  });
  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" className="size-16 rounded-xl object-cover" />;
}

function ProductsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [productType, setProductType] = useState<"ebook" | "curso">("ebook");
  const [accessUrl, setAccessUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsed = productSchema.parse({
        name,
        description: description || undefined,
        price: Number(price),
      });
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      if (productType === "ebook" && !digitalFile) throw new Error("Envie o ficheiro do ebook");
      if (productType === "curso" && !accessUrl.trim()) throw new Error("Indique o link da área de membros");

      const uid = auth.user.id;
      const slug = `${slugify(parsed.name)}-${Math.random().toString(36).slice(2, 7)}`;

      let imagePath: string | null = null;
      if (imageFile) {
        const path = `${uid}/${slug}-${Date.now()}-${imageFile.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
        if (error) throw new Error("Falha ao enviar a imagem");
        imagePath = path;
      }

      let filePath: string | null = null;
      if (productType === "ebook" && digitalFile) {
        const path = `${uid}/${slug}-${Date.now()}-${digitalFile.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("product-files").upload(path, digitalFile, { upsert: true });
        if (error) throw new Error("Falha ao enviar o ficheiro");
        filePath = path;
      }

      const { error } = await supabase.from("products").insert({
        seller_id: uid,
        name: parsed.name,
        description: parsed.description ?? null,
        price: parsed.price,
        slug,
        product_type: productType,
        image_url: imagePath,
        file_path: filePath,
        access_url: productType === "curso" ? accessUrl.trim() : null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto criado");
      setName("");
      setDescription("");
      setPrice("");
      setAccessUrl("");
      setImageFile(null);
      setDigitalFile(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkoutUrl = (slug: string) =>
    typeof window === "undefined" ? `/c/${slug}` : `${window.location.origin}/c/${slug}`;

  return (
    <AppShell title="Produtos">
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <form
          className="glass h-fit space-y-4 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <p className="font-display font-semibold">Novo produto</p>
          <div className="space-y-2">
            <Label>Tipo de produto</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["ebook", "curso"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProductType(t)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm transition-colors",
                    productType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "ebook" ? "Ebook (download)" : "Curso (área de membros)"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço (MZN)</Label>
            <Input
              id="price"
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Imagem de capa</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {productType === "ebook" ? (
            <div className="space-y-2">
              <Label htmlFor="file">Ficheiro do ebook (PDF, ePub, ZIP)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.epub,.zip,application/pdf,application/epub+zip,application/zip"
                onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Após o pagamento confirmado, o comprador descarrega automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="access">Link da área de membros</Label>
              <Input
                id="access"
                type="url"
                placeholder="https://area-de-membros.com/curso"
                value={accessUrl}
                onChange={(e) => setAccessUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Após o pagamento, o comprador é encaminhado para a área de membros.
              </p>
            </div>
          )}

          <Button type="submit" variant="hero" className="w-full gap-2" disabled={create.isPending}>
            <Plus className="size-4" /> Criar produto
          </Button>
        </form>

        <div className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-2xl" />
          ) : !products?.length ? (
            <div className="glass flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
              <Package className="size-8 text-primary" />
              <p className="text-muted-foreground">Ainda não tem produtos. Crie o primeiro à esquerda.</p>
            </div>
          ) : (
            products.map((p) => (
              <div key={p.id} className="glass rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <ProductThumb path={p.image_url} alt={p.name} />
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">{p.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                      <Badge variant="outline" className="mt-2">
                        {p.product_type === "curso" ? "Curso" : "Ebook"}
                      </Badge>
                    </div>
                  </div>
                  <Badge className="bg-secondary text-secondary-foreground">{mzn(Number(p.price))}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(checkoutUrl(p.slug));
                      toast.success("Link de checkout copiado");
                    }}
                  >
                    <Copy className="size-4" /> Copiar link
                  </Button>
                  <Button variant="glass" size="sm" className="gap-2" asChild>
                    <a href={`/c/${p.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Abrir checkout
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive"
                    onClick={() => remove.mutate(p.id)}
                  >
                    <Trash2 className="size-4" /> Remover
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
