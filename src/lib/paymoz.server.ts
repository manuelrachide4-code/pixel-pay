// Server-only helpers for the PayMoz payment provider.
const PAYMOZ_BASE = "https://paymozapi.saphirat.co.mz/api/v1";

export type PaymozMethod = "MPESA" | "EMOLA" | "MKESH" | "CARD";

export function paymozKey(): string {
  const key = process.env["PAYMOZ_API_KEY"];
  if (!key) throw new Error("PAYMOZ_API_KEY em falta");
  return key;
}

export function makeReference(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(11));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function paymozDirectPayment(input: {
  amount: number;
  reference: string;
  method: PaymozMethod;
  customerPhone: string;
  callbackUrl: string;
  description: string;
}): Promise<{ ok: boolean; status: number; body: unknown; timedOut?: boolean }> {
  // O provedor mantém a ligação aberta enquanto o cliente confirma no telemóvel
  // (pode passar de 60s). Se estourar, o pagamento continua pendente e é
  // resolvido por webhook/polling — nunca marcar como falhado.
  try {
    const response = await fetch(`${PAYMOZ_BASE}/payments/direct`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paymozKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(100_000),
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* provider returned non-JSON */
    }
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    console.error("[PayMoz] direct payment network error", error);
    return { ok: false, status: 0, body: null, timedOut: true };
  }
}

export function readProviderMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested = (record["data"] ?? record["payment"]) as Record<string, unknown> | undefined;
  const raw = record["message"] ?? nested?.["failureReason"] ?? record["error"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function paymozGetPayment(reference: string): Promise<unknown | null> {
  try {
    const response = await fetch(`${PAYMOZ_BASE}/payments/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${paymozKey()}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function readProviderStatus(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested = (record["data"] ?? record["payment"]) as Record<string, unknown> | undefined;
  const raw = (record["status"] ?? nested?.["status"]) as unknown;
  if (typeof raw !== "string") return null;
  const value = raw.toUpperCase();
  if (["SUCCESS", "COMPLETED", "PAID", "APPROVED"].includes(value)) return "paid";
  if (["FAILED", "ERROR", "REJECTED", "DECLINED"].includes(value)) return "failed";
  if (["CANCELLED", "CANCELED"].includes(value)) return "cancelled";
  return "pending";
}

export function readProviderId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nested = (record["data"] ?? record["payment"]) as Record<string, unknown> | undefined;
  const raw = record["id"] ?? record["transactionId"] ?? nested?.["id"] ?? nested?.["transactionId"];
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : null;
}
