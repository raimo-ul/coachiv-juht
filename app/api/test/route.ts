// SPEC 5.1 step 4.
//
// Validate, find or create the participant, score, store, then redirect the
// visitor to their report. The AI paragraph and the report email are started
// after the response is sent: the report stands on its own without either, and
// a visitor should not wait on Anthropic to see their own answers.

import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { getContent } from "@/lib/content";
import { isComplete, scoreTest } from "@/lib/scoring";
import { writeReportParagraph } from "@/lib/ai";
import { renderEmail, sendEmail, subscribeDoubleOptIn } from "@/lib/email";

export const runtime = "nodejs";

const ITEMS_VERSION = "v1";
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const content = getContent();

  let body: {
    answers?: Record<string, unknown>;
    email?: string;
    newsletter?: boolean;
    timezone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return bad(content.errors.badRequest);
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email)) return bad(content.test.emailScreen.emailError);

  // Coerce before checking: the client sends numbers, but a hand-built request
  // may send the strings a form would, and "4" is a perfectly good answer.
  const answers: Record<string, number> = {};
  for (const [key, value] of Object.entries(body.answers ?? {})) {
    const n = Number(value);
    if (Number.isInteger(n)) answers[key] = n;
  }
  if (!isComplete(answers)) return bad(content.errors.incomplete);

  // An unknown time zone would make the daily engine send at the wrong hour in
  // stage B, so it is checked here, where the value arrives.
  let timezone = "Europe/Tallinn";
  const claimed = String(body.timezone ?? "").trim();
  if (claimed) {
    try {
      new Intl.DateTimeFormat("et", { timeZone: claimed });
      timezone = claimed;
    } catch {
      console.warn(`[test] tundmatu ajavöönd, jääb vaikimisi: ${claimed.slice(0, 60)}`);
    }
  }

  const newsletter = body.newsletter === true;
  const locale = content.locale;

  let scored;
  try {
    scored = scoreTest(answers, locale);
  } catch (e) {
    console.error("[test] skoorimine:", String(e));
    return bad(content.errors.scoringFailed);
  }

  // A missing environment variable throws here. Caught so a misconfigured
  // deployment answers with JSON the client can show, rather than an empty 500
  // that leaves the visitor staring at a button that did nothing.
  let supabase;
  try {
    supabase = db();
  } catch (e) {
    console.error("[test] db:", String(e));
    return bad(content.errors.saveFailed, 500);
  }

  // SPEC 5.1: same email means the same participant and a new tests row.
  const existing = await supabase
    .from("participants")
    .select("id, newsletter_consent")
    .eq("email", email)
    .maybeSingle();

  if (existing.error) {
    console.error("[test] participant lookup:", existing.error.message);
    return bad(content.errors.saveFailed, 500);
  }

  let participantId = existing.data?.id as string | undefined;

  if (!participantId) {
    const created = await supabase
      .from("participants")
      .insert({
        email,
        locale,
        timezone,
        newsletter_consent: newsletter,
        newsletter_consent_at: newsletter ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (created.error || !created.data) {
      console.error("[test] participant insert:", created.error?.message);
      return bad(content.errors.saveFailed, 500);
    }
    participantId = created.data.id;
  } else {
    // Keep the time zone current, since a returning visitor may have moved or
    // be taking the test from a different machine. Consent is only ever turned
    // on here: unticking the box on a second test is not a withdrawal, and
    // withdrawal belongs to the unsubscribe link in the letters.
    const patch: Record<string, unknown> = { timezone };
    if (newsletter && !existing.data?.newsletter_consent) {
      patch.newsletter_consent = true;
      patch.newsletter_consent_at = new Date().toISOString();
    }
    const updated = await supabase.from("participants").update(patch).eq("id", participantId);
    if (updated.error) console.warn("[test] participant update:", updated.error.message);
  }

  const reportToken = newToken();

  const test = await supabase
    .from("tests")
    .insert({
      participant_id: participantId,
      items_version: ITEMS_VERSION,
      locale,
      answers,
      scores: scored.scores,
      report_token: reportToken,
      ai_status: "pending",
    })
    .select("id")
    .single();

  if (test.error || !test.data) {
    console.error("[test] test insert:", test.error?.message);
    return bad(content.errors.saveFailed, 500);
  }

  const reportPath = `/raport/${reportToken}`;

  // after() keeps the serverless function alive past the response, which is the
  // only reason this work survives on Vercel: without it the function freezes
  // the moment the visitor is redirected and the email is never sent. Errors
  // are caught inside so none of it can escape as an unhandled rejection.
  after(async () => {
    const ai = await writeReportParagraph({
      scores: scored.scores,
      levels: scored.levels,
      answers,
      items: content.test.items,
    });

    await supabase
      .from("tests")
      .update(
        ai.status === "done"
          ? { ai_paragraph: ai.text, ai_status: "done" }
          : { ai_status: "failed" },
      )
      .eq("id", test.data.id);

    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    if (site) {
      const mail = renderEmail(
        { subject: content.emails.report.subject, lines: content.emails.report.body },
        { links: { report: `${site}${reportPath}` }, footer: content.emails.footer },
      );
      const sent = await sendEmail({ to: email, ...mail });
      if (!sent.ok) console.error("[test] raporti kiri:", sent.error);
    } else {
      console.error("[test] NEXT_PUBLIC_SITE_URL puudub, raporti kirja ei saadetud");
    }

    if (newsletter) {
      const doi = await subscribeDoubleOptIn(email);
      if (!doi.ok) console.error("[test] uudiskirja DOI:", doi.error);
    }
  });

  return NextResponse.json({ reportPath });
}
