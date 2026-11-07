// SPEC 5.1 step 4: the test is submitted here.
//
// Validate, find or create the participant, score, store, answer with the
// report path. The report email goes out after the answer has gone, under
// EdgeRuntime.waitUntil, so nobody waits on Brevo to see their own answers.
// The AI paragraph is written by get-report-ai, not here.
//
// This was a Next.js route handler until 30.10. It moved here with the rest of
// the back end, so that the only place holding a service role key is the
// Supabase project itself. See DECISIONS.md.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { isComplete, scoreTest } from "../_shared/scoring.ts";
import { newToken } from "../_shared/tokens.ts";
import { renderEmail, sendEmail, subscribeNewsletter } from "../_shared/email.ts";
import { cleanUtmSet } from "../_shared/utm.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const ITEMS_VERSION = "v1";
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Keeps background work alive past the response. Absent in local serve. */
function background(p: Promise<unknown>) {
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
  else p.catch((e) => console.error("[submit-test] taust:", String(e)));
}

serve(async (req) => {
  console.log("submit-test boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

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
    return json(400, { error: content.errors.badRequest });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email)) return json(400, { error: content.test.emailScreen.emailError });

  // Coerce before checking: the client sends numbers, but a hand-built request
  // may send the strings a form would, and "4" is a perfectly good answer.
  const answers: Record<string, number> = {};
  for (const [key, value] of Object.entries(body.answers ?? {})) {
    const n = Number(value);
    if (Number.isInteger(n)) answers[key] = n;
  }
  if (!isComplete(answers)) return json(400, { error: content.errors.incomplete });

  // An unknown time zone would make the daily engine send at the wrong hour in
  // stage B, so it is checked here, where the value arrives.
  let timezone = "Europe/Tallinn";
  const claimed = String(body.timezone ?? "").trim();
  if (claimed) {
    try {
      new Intl.DateTimeFormat("et", { timeZone: claimed });
      timezone = claimed;
    } catch {
      console.warn(`[submit-test] tundmatu ajavöönd: ${claimed.slice(0, 60)}`);
    }
  }

  const newsletter = body.newsletter === true;

  // Validated here as well as in the browser. The browser's check keeps
  // rubbish out of that visitor's storage; this one is what stands between a
  // stranger's POST and a value that ends up on a page.
  const utm = cleanUtmSet(body as Record<string, unknown>);
  const locale = content.locale;

  let scored;
  try {
    scored = scoreTest(answers, locale);
  } catch (e) {
    console.error("[submit-test] skoorimine:", String(e));
    return json(400, { error: content.errors.scoringFailed });
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("[submit-test] SUPABASE_URL või SUPABASE_SERVICE_ROLE_KEY puudub");
    return json(500, { error: content.errors.saveFailed });
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // SPEC 5.1: the same email means the same participant and a new tests row.
  const existing = await supabase
    .from("participants")
    .select("id, newsletter_consent")
    .eq("email", email)
    .maybeSingle();

  if (existing.error) {
    console.error("[submit-test] participant lookup:", existing.error.message);
    return json(500, { error: content.errors.saveFailed });
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
      console.error("[submit-test] participant insert:", created.error?.message);
      return json(500, { error: content.errors.saveFailed });
    }
    participantId = created.data.id;
  } else {
    // Keep the time zone current: a returning visitor may have moved or be
    // taking the test from another machine. Consent is only ever turned on
    // here. Unticking the box on a second test is not a withdrawal, and
    // withdrawal belongs to the unsubscribe link in the letters.
    const patch: Record<string, unknown> = { timezone };
    if (newsletter && !existing.data?.newsletter_consent) {
      patch.newsletter_consent = true;
      patch.newsletter_consent_at = new Date().toISOString();
    }
    const updated = await supabase.from("participants").update(patch).eq("id", participantId);
    if (updated.error) console.warn("[submit-test] participant update:", updated.error.message);
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
      // Absent keys stay absent, so the columns hold null rather than an
      // empty string. Null reads as "direct visit or a link without UTM";
      // "" would read as a channel whose name is blank.
      ...utm,
    })
    .select("id")
    .single();

  if (test.error || !test.data) {
    console.error("[submit-test] test insert:", test.error?.message);
    return json(500, { error: content.errors.saveFailed });
  }

  const testId = test.data.id as string;
  const reportPath = `/raport/${reportToken}`;

  // The paragraph is not written here. It takes about 36 seconds, and work that
  // long does not reliably survive past the response: four test runs gave two
  // finished, one failed and one stuck on pending for ever. get-report-ai
  // writes it instead, inside the request the report page already polls. See
  // DECISIONS.md.
  //
  // What stays is the email, which is a single Brevo call and returns in well
  // under a second. It also no longer waits on Anthropic to go out.
  background((async () => {
    const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
    if (site) {
      const mail = renderEmail(
        { subject: content.emails.report.subject, lines: content.emails.report.body },
        {
          links: { report: `${site}${reportPath}` },
          footer: content.emails.footer,
          siteName: content.meta.siteName,
        },
      );
      const sent = await sendEmail({ to: email, ...mail });
      if (!sent.ok) console.error("[submit-test] raporti kiri:", sent.error);
    } else {
      console.error("[submit-test] SITE_BASE_URL puudub, raporti kirja ei saadetud");
    }

    // The newsletter, if they asked for it. After the report mail, because the
    // report is what they came for and a slow list API must not delay it.
    //
    // A failure is logged and goes no further: the consent is already in the
    // database, so Raimo can see who was promised a list they did not reach.
    // The first version of this call reported success for every signup while
    // subscribing nobody, which is why the result is checked at all.

  })());

  // The newsletter goes before the response, not in the background block.
  //
  // That block runs under waitUntil, which this project has already watched
  // drop slow work on the floor. One list call is fast and its outcome
  // matters, so it waits here; the report mail stays behind, because it is
  // slower and the page must not sit on it.
  let newsletterError: string | null = null;
  if (newsletter) {
    const sub = await subscribeNewsletter(email);
    newsletterError = sub.ok ? null : sub.error.slice(0, 500);
    if (newsletterError) console.error("[submit-test] uudiskirja liitumine:", newsletterError);
    await supabase
      .from("participants")
      .update({ newsletter_error: newsletterError })
      .eq("id", participantId);
  }

  return json(200, { reportPath, ...(newsletterError ? { newsletterError } : {}) });
});
