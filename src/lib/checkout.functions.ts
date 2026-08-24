import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const startSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  method: z.enum(["MPESA", "EMOLA", "MKESH", "CARD"]),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(255),
  customerPhone: z
    .string()
    .trim()
    .regex(/^258[0-9]{9}$/, "Telefone deve estar no formato 258XXXXXXXXX"),
  origin: z.string().trim().url().max(300),
});

const refSchema = z.object({ reference: z.string().trim().min(4).max(64) });
const slugSchema = z.object({ slug: z.string().trim().min(1).max(120) });

export const getPublicProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("name, description, price, currency, image_url, product_type, is_active")
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) {
      console.error("[checkout] getPublicProduct failed", error);
      throw new Error("Não foi possível carregar o produto. Tente novamente.");
    }

    if (!product || !product.is_active) return null;

    let imageUrl: string | null = null;
    if (product.image_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("product-images")
        .createSignedUrl(product.image_url, 60 * 60);
      imageUrl = signed?.signedUrl ?? null;
    }

    return { ...product, image_url: imageUrl };
  });

export const getDelivery = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => refSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("status, product_id")
      .eq("reference", data.reference)
      .maybeSingle();

    if (!payment || payment.status !== "paid" || !payment.product_id) return null;

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("name, product_type, file_path, access_url")
      .eq("id", payment.product_id)
      .maybeSingle();

    if (!product) return null;

    let downloadUrl: string | null = null;
    if (product.file_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("product-files")
        .createSignedUrl(product.file_path, 60 * 60 * 24, { download: true });
      downloadUrl = signed?.signedUrl ?? null;
    }

    return {
      name: product.name,
      productType: product.product_type,
      downloadUrl,
      accessUrl: product.access_url,
    };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paymoz = await import("./paymoz.server");

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, currency, seller_id, is_active")
      .eq("slug", data.slug)
      .maybeSingle();

    if (productError) throw new Error("Falha ao carregar o produto");
    if (!product) throw new Error("Produto indisponível");
    if (!product.is_active) throw new Error("Produto foi desativado. Contacte o vendedor.");

    const reference = paymoz.makeReference();
    const amount = Number(product.price);

    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      product_id: product.id,
      seller_id: product.seller_id,
      reference,
      amount,
      currency: product.currency,
      method: data.method,
      status: "pending",
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      description: `Pagamento — ${product.name}`,
    });
    if (insertError) throw new Error("Falha ao registar o pagamento");

    const result = await paymoz.paymozDirectPayment({
      amount,
      reference,
      method: data.method,
      customerPhone: data.customerPhone,
      callbackUrl: `${data.origin.replace(/\/$/, "")}/api/public/paymoz-webhook`,
      description: `Pagamento — ${product.name}`,
    });

    const status = result.timedOut
      ? "pending"
      : result.ok
        ? (paymoz.readProviderStatus(result.body) ?? "pending")
        : (paymoz.readProviderStatus(result.body) ?? "failed");

    await supabaseAdmin
      .from("payments")
      .update({
        status,
        provider_payment_id: paymoz.readProviderId(result.body),
        provider_response: (result.body ?? { timeout: true }) as never,
      })
      .eq("reference", reference);

    if (result.timedOut) {
      return {
        ok: true as const,
        reference,
        status,
        message: "Confirme o pagamento no seu telemóvel. Vamos verificar o estado automaticamente.",
      };
    }

    if (!result.ok || status === "failed") {
      console.error("[PayMoz] direct payment failed", result.status, result.body);
      return {
        ok: false as const,
        reference,
        status: "failed",
        message:
          paymoz.readProviderMessage(result.body) ??
          "O provedor recusou o pagamento. Verifique o número e tente novamente.",
      };
    }

    return { ok: true as const, reference, status, message: "Confirme o pagamento no seu telemóvel." };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => refSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const paymoz = await import("./paymoz.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("reference, status, amount, currency, method")
      .eq("reference", data.reference)
      .maybeSingle();

    if (!payment) return null;

    if (payment.status === "pending") {
      const remote = await paymoz.paymozGetPayment(data.reference);
      const remoteStatus = paymoz.readProviderStatus(remote);
      if (remoteStatus && remoteStatus !== "pending") {
        await supabaseAdmin
          .from("payments")
          .update({ status: remoteStatus, provider_response: remote as never })
          .eq("reference", data.reference);
        return { ...payment, status: remoteStatus };
      }
    }

    return payment;
  });
