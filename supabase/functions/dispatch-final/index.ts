// SPEC 11: the final report, once an hour.
//
// Picks out the programmes whose last day has passed, where it is now the
// sending hour where the participant is, and which have not had one yet.
// Computes the numbers, stores them on the enrolment and mails the link. The
// three written paragraphs are left to get-final-by-token; see below.
//
// final_sent_at is both the guard against doing it twice and the thing that
// closes answering: once a report exists, the answers behind it must not move.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent } from "../_shared/content.ts";
import { computeFinal, type DayRow } from "../_shared/finalReport.ts";
import { renderEmail, sendEmail } from "../_shared/email.ts";
import { localDate, localHour, nextWorkday } from "../_shared/workdays.ts";
import { env } from "../_shared/env.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  console.log("dispatch-final boot OK");

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const onlyEnrollment = url.searchParams.get("enrollment_id");

  const expected = env("CRON_SECRET");
  const given = req.headers.get("x-cron-secret") ?? url.searchParams.get("cron_secret");
  if (expected && given !== expected) return json(401, { error: "unauthorized" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
  if (!supabaseUrl || !serviceKey || !site) return json(500, { error: "missing env" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sendHour = Number(env("DAILY_SEND_HOUR") ?? "16");
  const now = new Date();

  let query = supabase
    .from("enrollments")
    .select("id, participant_id, test_id, start_date, end_date, final_token, sa_attention, sa_behaviour, sa_open_text, sa_submitted_at, participants!inner(email, timezone, locale)")
    .eq("status", "active")
    .is("final_sent_at", null);
  if (onlyEnrollment) query = query.eq("id", onlyEnrollment);

  const { data: enrollments, error } = await query;
  if (error) {
    console.error("[dispatch-final]", error.message);
    return json(500, { error: error.message });
  }

  const done: string[] = [];
  const skipped: Array<{ id: string; why: string }> = [];

  for (const e of enrollments ?? []) {
    const p = (e as unknown as { participants: { email: string; timezone: string; locale: string } }).participants;
    const tz = p.timezone || "Europe/Tallinn";
    const today = localDate(now, tz);

    // The next workday after the last day, which is what AttFocus's
    // dispatch-program-reports does: report_day = nextWorkday(period_end).
    //
    // This used to be "any day after end_date", and since the fifteenth workday
    // is always a workday, every programme ending on a Friday had its report
    // land on the Saturday. It also left no room for the self-assessment, which
    // the last day's letter asks for by noon tomorrow.
    const reportDay = nextWorkday(e.end_date);
    if (today < reportDay)  { skipped.push({ id: e.id, why: "pole veel raporti päev" }); continue; }
    if (!force && localHour(now, tz) !== sendHour) {
      skipped.push({ id: e.id, why: `kell ${localHour(now, tz)}` });
      continue;
    }

    // Claim first. Two overlapping runs would otherwise both compute and both
    // send, and the second letter would be the one the person remembers.
    const claim = await supabase
      .from("enrollments")
      .update({ final_sent_at: new Date().toISOString() })
      .eq("id", e.id)
      .is("final_sent_at", null)
      .select("id");

    if (claim.error || !claim.data?.length) {
      skipped.push({ id: e.id, why: "juba käsil" });
      continue;
    }

    try {
      const days = await supabase
        .from("daily_answers")
        .select("day, day_index, q1, q2, q3, q4, q5, q6")
        .eq("enrollment_id", e.id)
        .order("day_index");

      const rows = (days.data ?? []) as DayRow[];
      const numbers = computeFinal(rows);
      const content = getContent(p.locale);

      // The self-assessment, as filled in from the last day's letter. Stored
      // with the numbers so the page a month later shows what the report was
      // built from. Null when nobody filled it in, and the report still goes.
      const change = e.sa_submitted_at
        ? { attention: e.sa_attention, behaviour: e.sa_behaviour, openText: e.sa_open_text }
        : null;

      // No comparison with the test and no first-week-against-last. The sprint
      // directs attention; it does not measure development, and a number that
      // moved would be read as progress or as failure. See finalReport.ts.
      const report = {
        numbers,
        change,
        ai: null,
        aiStatus: "pending",
        generatedAt: new Date().toISOString(),
      };

      const stored = await supabase
        .from("enrollments")
        .update({ final_report: report, status: "finished" })
        .eq("id", e.id);

      if (stored.error) throw new Error(`final_report salvestamine: ${stored.error.message}`);

      const mail = renderEmail(
        { subject: content.emails.final.subject, lines: content.emails.final.body },
        {
          links: {
            final: `${site}/lopp/${e.final_token}`,
            // Smaily's own page: the robot check and the confirmation mail
            // belong there, not in a server-side post that subscribes nobody.
            newsletter: content.emails.final.newsletterUrl,
          },
          footer: content.emails.footer,
          siteName: content.meta.siteName,
        },
      );
      const sent = await sendEmail({ to: p.email, ...mail });
      if (!sent.ok) console.error(`[dispatch-final] kiri ${e.id}:`, sent.error);

      console.log(`[dispatch-final] valmis ${e.id}, vastatud päevi ${numbers.answeredDays}, enesehinnang ${e.sa_submitted_at ? "jah" : "ei"}, lõigud kirjutatakse esimesel vaatamisel`);
      done.push(e.id);
    } catch (err) {
      // Give the claim back so the next hour tries again, rather than leaving
      // someone with a programme that silently never ends.
      await supabase.from("enrollments").update({ final_sent_at: null }).eq("id", e.id);
      console.error(`[dispatch-final] ${e.id}:`, String(err));
      skipped.push({ id: e.id, why: "viga, proovitakse uuesti" });
    }
  }

  console.log(`[dispatch-final] tehtud ${done.length}, vahele ${skipped.length}`);
  return json(200, { done: done.length, skipped: skipped.length, detail: { done, skipped } });
});
