// Starting someone's three weeks.
//
// Two doors lead here and they must arrive at the same place: a Stripe payment
// (stripe-webhook) and a company code worth 100% (create-checkout). The dates,
// the token, the welcome letter and the idempotency rule are identical, so
// they live here rather than in two copies that drift.
//
// Why the second door exists at all: Stripe refuses a Checkout Session whose
// total is zero in payment mode. Its own words, 01.11:
//
//   "The Checkout Session's total amount due cannot be zero in `payment` mode."
//
// So a seat a company already paid for cannot travel through Checkout. It is
// granted here instead, after the code has been checked against Stripe and the
// seats counted. SPEC 8 assumed Stripe's "no-cost orders" would carry this;
// measured, it does not.

import { fill, getContent } from "./content.ts";
import { renderEmail, sendEmail } from "./email.ts";
import { newToken } from "./tokens.ts";
import { localDate, nextWorkday, nthWorkdayFrom } from "./workdays.ts";
import { env } from "./env.ts";

export type EnrolResult =
  | { ok: true; startDate: string; endDate: string; duplicate: boolean }
  | { ok: false; reason: string };

/**
 * `stripe_session_id` is not null and unique, and it is what makes a repeated
 * delivery harmless. A free seat has no session, so it carries a key built
 * from the code and the person: pressing the button twice lands on the same
 * row rather than starting two programmes.
 */
export function freeKey(promoCode: string, participantId: string): string {
  return `free:${promoCode}:${participantId}`;
}

// deno-lint-ignore no-explicit-any
export async function enrol(supabase: any, input: {
  participantId: string;
  testId: string;
  /** Stripe session id, or freeKey() for a seat granted by a 100% code. */
  idempotencyKey: string;
  amountTotal: number;
  promoCode: string | null;
}): Promise<EnrolResult> {
  const participant = await supabase
    .from("participants")
    .select("email, timezone, locale")
    .eq("id", input.participantId)
    .maybeSingle();

  if (participant.error || !participant.data) {
    return { ok: false, reason: "osaleja ei leitud" };
  }

  const tz = participant.data.timezone || "Europe/Tallinn";
  const content = getContent(participant.data.locale);

  // SPEC 8: the first workday after this moment, in their own time zone.
  // Someone starting on Friday evening begins on Monday, not on Saturday.
  const startDate = nextWorkday(localDate(new Date(), tz));
  const endDate = nthWorkdayFrom(startDate, 15);

  const created = await supabase
    .from("enrollments")
    .insert({
      participant_id: input.participantId,
      test_id: input.testId,
      status: "active",
      start_date: startDate,
      end_date: endDate,
      stripe_session_id: input.idempotencyKey,
      amount_total: input.amountTotal,
      promo_code: input.promoCode,
      final_token: newToken(),
    })
    .select("id")
    .single();

  if (created.error) {
    // 23505 is the unique violation: this is a repeat and the programme
    // already exists. Nothing to do and nothing wrong. No second letter
    // either, because the first one already went.
    if (created.error.code === "23505") {
      return { ok: true, startDate, endDate, duplicate: true };
    }
    return { ok: false, reason: created.error.message };
  }

  const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
  const hour = env("DAILY_SEND_HOUR") ?? "16";
  const mail = renderEmail(
    {
      subject: fill(content.emails.welcome.subject, { startDate }),
      lines: content.emails.welcome.body.map((l) =>
        fill(l, { startDate, sendTime: `${hour}:00` })
      ),
    },
    {
      links: { report: `${site}/raport/` },
      footer: content.emails.footer,
      siteName: content.meta.siteName,
    },
  );

  const sent = await sendEmail({ to: participant.data.email, ...mail });
  // A letter that did not go is worth knowing about, but the programme is
  // started and the person can reach it from their report either way.
  if (!sent.ok) console.error("[enrol] tervituskiri:", sent.error);

  console.log(`[enrol] programm loodud ${startDate}..${endDate} tz=${tz} kood=${input.promoCode ?? "-"}`);
  return { ok: true, startDate, endDate, duplicate: false };
}
