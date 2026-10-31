// SPEC 8: Stripe tells us the money arrived, and the programme begins.
//
// Everything here has to survive being called twice. Stripe retries on any
// non-2xx and on its own schedule, so the question is never "did this run" but
// "has this already run". stripe_session_id is unique on enrollments, so the
// second attempt collides and is answered 200 rather than retried for ever.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent, fill } from "../_shared/content.ts";
import { newToken } from "../_shared/tokens.ts";
import { verifyWebhook } from "../_shared/stripe.ts";
import { renderEmail, sendEmail } from "../_shared/email.ts";
import { localDate, nextWorkday, nthWorkdayFrom } from "../_shared/workdays.ts";
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

  const participant = await supabase
    .from("participants")
    .select("email, timezone, locale")
    .eq("id", participantId)
    .maybeSingle();

  if (participant.error || !participant.data) {
    console.error("[stripe-webhook] osaleja ei leitud:", participantId);
    return new Response("Unknown participant", { status: 200 });
  }

  const tz = participant.data.timezone || "Europe/Tallinn";
  const content = getContent(participant.data.locale);

  // SPEC 8: the first workday after the money arrived, in their own time zone.
  // Someone paying on Friday evening starts on Monday, not on Saturday.
  const today = localDate(new Date(), tz);
  const startDate = nextWorkday(today);
  const endDate = nthWorkdayFrom(startDate, 15);

  // SPEC 8: the code comes off the session rather than being trusted from the
  // browser, so what is stored is what Stripe actually honoured.
  const promoCode =
    session.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code?.code ??
    (typeof session.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code === "string"
      ? session.total_details.breakdown.discounts[0].discount.promotion_code
      : null);

  const finalToken = newToken();

  const created = await supabase
    .from("enrollments")
    .insert({
      participant_id: participantId,
      test_id: testId,
      status: "active",
      start_date: startDate,
      end_date: endDate,
      stripe_session_id: session.id,
      amount_total: session.amount_total ?? 0,
      promo_code: promoCode,
      final_token: finalToken,
    })
    .select("id")
    .single();

  if (created.error) {
    // 23505 is the unique violation on stripe_session_id: this delivery is a
    // repeat and the programme already exists. Nothing to do and nothing wrong.
    if (created.error.code === "23505") {
      console.log(`[stripe-webhook] juba loodud, session=${session.id}`);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
    }
    console.error("[stripe-webhook] enrollment insert:", created.error.message);
    return new Response("Insert failed", { status: 500 }); // worth a retry
  }

  const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
  const hour = env("DAILY_SEND_HOUR") ?? "16";
  const mail = renderEmail(
    {
      subject: fill(content.emails.welcome.subject, { startDate }),
      lines: content.emails.welcome.body.map((l) => fill(l, { startDate, sendTime: `${hour}:00` })),
    },
    {
      links: { report: `${site}/raport/` },
      footer: content.emails.footer,
      siteName: content.meta.siteName,
    },
  );

  const sent = await sendEmail({ to: participant.data.email, ...mail });
  if (!sent.ok) console.error("[stripe-webhook] tervituskiri:", sent.error);

  console.log(`[stripe-webhook] programm loodud ${startDate}..${endDate} tz=${tz}`);
  return new Response(JSON.stringify({ ok: true, startDate, endDate }), { status: 200 });
});
