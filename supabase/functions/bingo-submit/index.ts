// The year-end bingo campaign: Tally posts a response, this sends the summary.
//
// Skeleton from stripe-webhook, which is the other thing here that an outside
// service calls: raw body, signature first, nothing trusted before that.
//
// What is different, and it matters. Stripe's signature carries a timestamp and
// is only accepted inside a 300 second window. Tally's does not, so a captured
// request stays valid for ever. The primary key on bingo_submissions is
// therefore not a tidy-up, it is the only thing standing between a replay and a
// second summary in someone's inbox. It is taken before anything is sent.
//
// Tally allows 10 seconds for a 2xx and then retries at 5 min, 30 min, 1 h, 6 h
// and 1 day. Three short calls fit inside that comfortably, so everything
// happens before the response. EdgeRuntime.waitUntil is not used: it did not
// hold a long task reliably here (DECISIONS 2026-10-30) and there is no long
// task to hold.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyTallySignature } from "../_shared/tally.ts";
import { countMarked, isTicked, typeFor } from "../_shared/bingo.ts";
import { renderCard } from "../_shared/bingoCard.ts";
import type { CardContent } from "../_shared/bingoCard.ts";
import { sendEmail, subscribeNewsletter } from "../_shared/email.ts";
import { renderEmail } from "../_shared/email.ts";
import { fill, getContent } from "../_shared/content.ts";
import { env } from "../_shared/env.ts";

/** The question labels on form rDoLyR, read from the form on 27.11.2026. */
const LABEL = {
  firstName: "Eesnimi",
  email: "E-post",
  squares: "Sel aastal olen...",
  proud: "Mille üle oled sel aastal uhke, midagi, mida tegid ja mida keegi teine ei pannudki tähele?",
  endings: [
    "Sel aastal oli mul raske, kui...",
    "Ka teistel on aeg-ajalt raske, kui...",
    "Ma tegin sel hetkel parima, mida oskasin, ja ütlen endale:",
  ],
  newsletter: "Uudiskiri",
  contact: "Kontakt",
} as const;

type Field = { key: string; label: string; type: string; value: unknown };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * One field, by its question label.
 *
 * By label rather than by Tally's key, because the keys change when a question
 * is moved and the labels are Raimo's own sentences. A missing label is a
 * stopped request, never a silent empty string: it means the form was edited
 * and this file was not told.
 */
function field(fields: readonly Field[], label: string): Field {
  const f = fields.find((x) => x.label?.trim() === label);
  if (!f) throw new Error(`Tally väli puudub: ${label}`);
  return f;
}

/** A text answer, or "" when the question was left empty. */
function text(fields: readonly Field[], label: string): string {
  const v = field(fields, label).value;
  return typeof v === "string" ? v : "";
}

serve(async (req) => {
  console.log("bingo-submit boot OK");

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // The exact bytes Tally signed. Parsing and re-serialising would change the
  // whitespace and every signature would fail.
  const raw = await req.text();

  try {
    if (!(await verifyTallySignature(raw, req.headers.get("Tally-Signature")))) {
      console.warn("[bingo-submit] allkiri ei kehti");
      return new Response("Bad signature", { status: 401 });
    }
  } catch (e) {
    console.error("[bingo-submit] allkirja kontroll:", String(e));
    return new Response("Bad signature", { status: 401 });
  }

  const supabase = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!);
  const content = getContent();

  let responseId: string;
  let name: string, email: string, proud: string;
  let endings: string[];
  let markedIndexes: number[], marked: number;
  let wantsNewsletter: boolean, wantsContact: boolean;

  try {
    const event = JSON.parse(raw);
    responseId = event?.data?.responseId;
    if (!responseId) throw new Error("data.responseId puudub");

    const fields: Field[] = event?.data?.fields ?? [];
    name = text(fields, LABEL.firstName).trim();
    email = text(fields, LABEL.email).trim();
    if (!email) throw new Error("e-posti aadress puudub");

    const squares = field(fields, LABEL.squares);
    const chosen: string[] = Array.isArray(squares.value) ? squares.value as string[] : [];
    marked = countMarked(squares.value);

    // Which squares, not just how many: the grid on the card has to show the
    // same ones the person ticked. Tally gives the selected option ids and the
    // full option list in order, so the index comes from that list.
    const options: Array<{ id: string }> = (squares as { options?: Array<{ id: string }> }).options ?? [];
    markedIndexes = chosen
      .map((id) => options.findIndex((o) => o.id === id))
      .filter((i) => i >= 0);
    if (markedIndexes.length !== marked) {
      console.warn(`[bingo-submit] ${marked} valikut, neist ${markedIndexes.length} leidis ruudustikust`);
    }

    proud = text(fields, LABEL.proud);
    endings = LABEL.endings.map((l) => text(fields, l));
    wantsNewsletter = isTicked(field(fields, LABEL.newsletter).value);
    wantsContact = isTicked(field(fields, LABEL.contact).value);
  } catch (e) {
    console.error("[bingo-submit] vastuse lugemine:", String(e));
    return json(500, { error: "Vastust ei õnnestunud lugeda" });
  }

  const type = typeFor(marked);

  // The lock, before a single letter goes out. A duplicate key means Tally is
  // retrying or two deliveries arrived at once; either way the work is done or
  // being done, and this request stops here.
  const claim = await supabase
    .from("bingo_submissions")
    .insert({ tally_response_id: responseId, result_type: type, marked_count: marked });

  if (claim.error) {
    if (claim.error.code === "23505") {
      console.log(`[bingo-submit] ${responseId} on juba tehtud, ei korda`);
      return json(200, { ok: true, duplicate: true });
    }
    console.error("[bingo-submit] luku kirjutamine:", claim.error.message);
    return json(500, { error: "Andmebaas ei vastanud" });
  }

  // 1. The summary. Everything else is optional, this is not.
  console.log(`[bingo-submit] ${responseId} saadan kaardi, ${type}, ${marked} ruutu`);
  // The JSON gives literal string types; the renderer wants plain strings.
  const card = renderCard(content.bingo as unknown as CardContent, {
    markedIndexes, marked, type, proud, endings,
  });
  const sent = await sendEmail({
    to: email,
    subject: fill(content.bingo.emails.card.subject, { type }),
    html: card.html,
    text: card.text,
  });

  if (!sent.ok) {
    // Give the lock back, so Tally's retry can do the whole thing again.
    console.error("[bingo-submit] kaart ei läinud:", sent.error);
    const undo = await supabase.from("bingo_submissions").delete().eq("tally_response_id", responseId);
    if (undo.error) {
      console.error(
        `[bingo-submit] LUKK JÄI ALLES ja kaart on saatmata, ${responseId}: ${undo.error.message}`,
      );
    }
    return json(500, { error: "Kaarti ei õnnestunud saata" });
  }
  console.log(`[bingo-submit] ${responseId} kaart saadetud`);

  // From here on the person has their summary, so nothing below may fail the
  // request. A 500 now would only make Tally send a second copy.

  // 2. The newsletter, if they asked.
  if (wantsNewsletter) {
    const sub = await subscribeNewsletter(email, "aasta-juhi-bingo");
    if (!sub.ok) {
      console.error("[bingo-submit] uudiskirja liitumine:", sub.error);
      await supabase
        .from("bingo_submissions")
        .update({ newsletter_error: sub.error.slice(0, 500) })
        .eq("tally_response_id", responseId);
    }
  }

  // 3. The contact request, if they asked. Raimo writes back himself.
  if (wantsContact) {
    const values = { name: name || email, email, type, marked: String(marked) };
    const mail = renderEmail(
      {
        subject: fill(content.bingo.emails.contact.subject, values),
        lines: content.bingo.emails.contact.body.map((l) => fill(l, values)),
      },
      { links: {}, footer: content.emails.footer, siteName: content.meta.siteName },
    );
    const note = await sendEmail({ to: content.about.companies.contact, ...mail });
    if (!note.ok) console.error("[bingo-submit] kontaktisoovi teade:", note.error);
    else console.log(`[bingo-submit] kontaktisoovi teade saadetud, ${email}`);
  }

  return json(200, { ok: true, type, marked });
});
