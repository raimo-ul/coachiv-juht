// SPEC 8: Stripe tells us the money arrived, and the programme begins.
//
// Everything here has to survive being called twice. Stripe retries on any
// non-2xx and on its own schedule, so the question is never "did this run" but
// "has this already run". stripe_session_id is unique on enrollments, so the
// second attempt collides and is answered 200 rather than retried for ever.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyWebhook } from "../_shared/stripe.ts";
import { enrol } from "../_shared/enroll.ts";
import { env } from "../_shared/env.ts";

serve(async (req) => {
  console.log("stripe-webhook boot OK");

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // The raw text, not a parsed object. Stripe signs the bytes it sent, so
  // re-serialising the JSON would change them and the signature would fail.
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  try {
    if (!(await verifyWebhook(raw, sig))) {
      console.warn("[stripe-webhook] allkiri ei kehti");
      return new Response("Bad signature", { status: 400 });
    }
  } catch (e) {
    console.error("[stripe-webhook] allkirja kontroll:", String(e));
    return new Response("Bad signature", { status: 400 });
  }

  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ ignored: event.type }), { status: 200 });
  }

  const session = event.data?.object ?? {};
  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) {
    console.log(`[stripe-webhook] payment_status=${session.payment_status}, ei alusta`);
    return new Response(JSON.stringify({ ignored: "unpaid" }), { status: 200 });
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response("Missing env", { status: 500 });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const participantId = session.metadata?.participant_id ?? session.client_reference_id;
  const testId = session.metadata?.test_id;
  if (!participantId || !testId) {
    console.error("[stripe-webhook] metadata puudub", JSON.stringify(session.metadata));
    return new Response("Missing metadata", { status: 200 }); // 200: retrying will not fix it
  }

  // SPEC 8: the code comes off the session rather than being trusted from the
  // browser, so what is stored is what Stripe actually honoured.
  const d = session.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code;
  const promoCode = typeof d === "string" ? d : d?.code ?? null;

  // The dates, the token and the welcome letter are shared with the free-seat
  // door in create-checkout. One implementation, so the two cannot drift.
  const result = await enrol(supabase, {
    participantId,
    testId,
    idempotencyKey: session.id,
    amountTotal: session.amount_total ?? 0,
    promoCode,
  });

  if (!result.ok) {
    if (result.reason === "osaleja ei leitud") {
      console.error("[stripe-webhook] osaleja ei leitud:", participantId);
      return new Response("Unknown participant", { status: 200 });
    }
    console.error("[stripe-webhook] enrollment:", result.reason);
    return new Response("Insert failed", { status: 500 }); // worth a retry
  }

  if (result.duplicate) {
    console.log(`[stripe-webhook] juba loodud, session=${session.id}`);
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
  }

  return new Response(
    JSON.stringify({ ok: true, startDate: result.startDate, endDate: result.endDate }),
    { status: 200 },
  );
});
