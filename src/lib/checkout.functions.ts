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
    if (!product || !product.is_active) throw new Error("Produto indisponível");

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

    const status = result.ok ? (paymoz.readProviderStatus(result.body) ?? "pending") : "failed";

    await supabaseAdmin
      .from("payments")
      .update({
        status,
        provider_payment_id: paymoz.readProviderId(result.body),
        provider_response: result.body as never,
      })
      .eq("reference", reference);

    if (!result.ok) {
      console.error("[PayMoz] direct payment failed", result.status, result.body);
      return { ok: false as const, reference, status, message: "O provedor recusou o pagamento. Tente novamente." };
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
