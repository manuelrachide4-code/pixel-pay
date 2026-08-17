import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  reference: z.string().trim().min(4).max(64),
});

export const Route = createFileRoute("/api/public/paymoz-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        let parsedBody: unknown;
        try {
          parsedBody = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = payloadSchema.safeParse(parsedBody);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        const paymoz = await import("@/lib/paymoz.server");
        // Never trust the webhook body: confirm the real status with PayMoz.
        const remote = await paymoz.paymozGetPayment(parsed.data.reference);
        const status = paymoz.readProviderStatus(remote);
        if (!status) return new Response("Unverified", { status: 202 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("payments")
          .update({ status, provider_response: remote as never })
          .eq("reference", parsed.data.reference)
          .eq("status", "pending");

        return new Response("ok");
      },
    },
  },
});
