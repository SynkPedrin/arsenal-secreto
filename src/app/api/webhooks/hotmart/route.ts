import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { productSlugFromHotmart } from "@/lib/commerce/catalog";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook da Hotmart (Postback 2.0).
 *
 * A Hotmart reenvia o mesmo evento em caso de falha, então tudo aqui é
 * idempotente por `transaction`. E um retry atrasado de aprovação nunca
 * pode ressuscitar um acesso já reembolsado — ver `TERMINAL_NEGATIVE`.
 */

type PurchaseStatus = "approved" | "refunded" | "chargeback" | "canceled" | "expired";

const EVENT_STATUS: Record<string, PurchaseStatus> = {
  PURCHASE_APPROVED: "approved",
  PURCHASE_COMPLETE: "approved",
  PURCHASE_REFUNDED: "refunded",
  PURCHASE_CHARGEBACK: "chargeback",
  PURCHASE_PROTEST: "chargeback",
  PURCHASE_CANCELED: "canceled",
  PURCHASE_EXPIRED: "expired",
  SUBSCRIPTION_CANCELLATION: "canceled",
};

/** Estados dos quais não se volta para "aprovado" por um retry fora de ordem. */
const TERMINAL_NEGATIVE: readonly PurchaseStatus[] = ["refunded", "chargeback"];

const payloadSchema = z.object({
  event: z.string(),
  data: z.object({
    product: z
      .object({ id: z.union([z.string(), z.number()]).optional(), name: z.string().optional() })
      .optional(),
    buyer: z.object({ email: z.string().email(), name: z.string().optional() }).optional(),
    purchase: z
      .object({
        transaction: z.string().optional(),
        price: z
          .object({ value: z.number().optional(), currency_value: z.string().optional() })
          .optional(),
      })
      .optional(),
  }),
});

/** Comparação de tempo constante: um `===` aqui vaza o token por timing. */
function tokenMatches(received: string | null, expected: string): boolean {
  if (!received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.HOTMART_HOTTOK;
  if (!expected) {
    console.error("[hotmart] HOTMART_HOTTOK ausente — webhook recusado.");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  if (!tokenMatches(request.headers.get("x-hotmart-hottok"), expected)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let parsed;
  try {
    parsed = payloadSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload fora do formato." }, { status: 400 });
  }

  const { event, data } = parsed.data;
  const status = EVENT_STATUS[event];

  // Evento que não muda acesso (boleto gerado, disputa aberta…): aceita e ignora.
  if (!status) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const transaction = data.purchase?.transaction;
  const email = data.buyer?.email;

  if (!transaction || !email) {
    return NextResponse.json({ error: "Compra sem transaction ou e-mail." }, { status: 400 });
  }

  const hotmartProductId = data.product?.id != null ? String(data.product.id) : null;
  const productSlug = productSlugFromHotmart(hotmartProductId);

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (error) {
    console.error("[hotmart] Supabase indisponível:", error);
    // 503 faz a Hotmart tentar de novo em vez de dar a entrega por perdida.
    return NextResponse.json({ error: "Persistência indisponível." }, { status: 503 });
  }

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("transaction", transaction)
    .maybeSingle();

  if (
    existing &&
    status === "approved" &&
    TERMINAL_NEGATIVE.includes(existing.status as PurchaseStatus)
  ) {
    return NextResponse.json({ ok: true, ignored: "aprovação após reembolso" });
  }

  const row = {
    transaction,
    event,
    product_slug: productSlug,
    hotmart_product_id: hotmartProductId,
    buyer_email: email.toLowerCase(),
    buyer_name: data.buyer?.name ?? null,
    status,
    amount: data.purchase?.price?.value ?? null,
    currency: data.purchase?.price?.currency_value ?? null,
    payload: parsed.data,
  };

  const { data: saved, error } = await supabase
    .from("purchases")
    .upsert(row, { onConflict: "transaction" })
    .select("id")
    .single();

  if (error) {
    console.error("[hotmart] Falha ao gravar compra:", error.message);
    return NextResponse.json({ error: "Falha ao gravar." }, { status: 500 });
  }

  // Reembolso derruba o acesso na hora, sem esperar o próximo login.
  if (status !== "approved" && saved) {
    await supabase
      .from("entitlements")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("purchase_id", saved.id);
  }

  return NextResponse.json({ ok: true, transaction, status });
}
