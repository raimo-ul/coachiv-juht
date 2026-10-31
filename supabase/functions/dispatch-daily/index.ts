// SPEC 10: the daily letter, once an hour.
//
// The cron fires every hour and this picks out the people for whom it is now
// 16:00 where they are. That is the only way one schedule can serve Tallinn and
// New York at the same local hour: ask each participant's own clock rather than
// computing a send time once.
//
// The guard against sending twice is the daily_answers row, which is created
// before the letter goes and is unique on (enrollment_id, day). A second run in
// the same hour finds it and sends nothing.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getContent, fill } from "../_shared/content.ts";
import { sign } from "../_shared/signing.ts";
import { renderEmail, sendEmail } from "../_shared/email.ts";
import { dayIndex, isWorkday, localDate, localHour } from "../_shared/workdays.ts";
import { env } from "../_shared/env.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  console.log("dispatch-daily boot OK");

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dry_run") === "1";
  const onlyEnrollment = url.searchParams.get("enrollment_id");

  // Pretend it is another moment. For testing, and for the morning after an
  // outage when a day's letters have to be caught up: without it the only way
  // to re-run a missed day is to wait a year. AttFocus carries the same
  // affordance for the same reason.
  const nowOverride = url.searchParams.get("now");

  // Called by pg_cron over the public internet, so it carries a shared secret.
  // Without it anyone could make the letters go out at any hour.
  const expected = env("CRON_SECRET");
  const given = req.headers.get("x-cron-secret") ?? url.searchParams.get("cron_secret");
  if (expected && given !== expected) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
  if (!supabaseUrl || !serviceKey || !site) return json(500, { error: "missing env" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sendHour = Number(env("DAILY_SEND_HOUR") ?? "16");
  const now = nowOverride ? new Date(nowOverride) : new Date();
  if (Number.isNaN(now.getTime())) return json(400, { error: "vigane now" });

  let query = supabase
    .from("enrollments")
    .select("id, participant_id, start_date, end_date, participants!inner(email, timezone, locale)")
    .eq("status", "active");
  if (onlyEnrollment) query = query.eq("id", onlyEnrollment);

  const { data: enrollments, error } = await query;
  if (error) {
    console.error("[dispatch-daily]", error.message);
    return json(500, { error: error.message });
  }

  const sent: string[] = [];
  const skipped: Array<{ id: string; why: string }> = [];

  for (const e of enrollments ?? []) {
    const p = (e as unknown as { participants: { email: string; timezone: string; locale: string } }).participants;
    const tz = p.timezone || "Europe/Tallinn";

    const today = localDate(now, tz);
    const hour = localHour(now, tz);

    if (!force && hour !== sendHour) { skipped.push({ id: e.id, why: `kell ${hour}` }); continue; }
    if (!isWorkday(today))           { skipped.push({ id: e.id, why: "nädalavahetus" }); continue; }
    if (today < e.start_date)        { skipped.push({ id: e.id, why: "pole alanud" }); continue; }
    if (today > e.end_date)          { skipped.push({ id: e.id, why: "läbi" }); continue; }

    const index = dayIndex(e.start_date, today);
    if (!index) { skipped.push({ id: e.id, why: "pole programmi päev" }); continue; }

    // Claim the day. Unique on (enrollment_id, day), so if the row is already
    // there this hour has been served and the letter is not sent again.
    const claim = await supabase
      .from("daily_answers")
      .insert({ enrollment_id: e.id, day: today, day_index: index })
      .select("id");

    if (claim.error) {
      if (claim.error.code === "23505") { skipped.push({ id: e.id, why: "juba saadetud" }); continue; }
      console.error(`[dispatch-daily] claim ${e.id}:`, claim.error.message);
      skipped.push({ id: e.id, why: "claim ebaõnnestus" });
      continue;
    }

    if (dryRun) { sent.push(`${e.id} (dry_run)`); continue; }

    const content = getContent(p.locale);
    const questions = content.daily.questions;

    // Twelve links, two per question. Each carries its own meaning and its own
    // signature, so none of them needs a row anywhere.
    const lines: Array<string | {
      question: string;
      yes: { label: string; url: string };
      no: { label: string; url: string };
    }> = [content.daily.intro];

    for (let q = 1; q <= 6; q++) {
      const yes = await sign({ e: e.id, d: today, q, v: 1 });
      const no = await sign({ e: e.id, d: today, q, v: 0 });
      lines.push({
        question: questions[`q${q}` as keyof typeof questions],
        yes: { label: content.daily.yes, url: `${site}/v/${yes}` },
        no: { label: content.daily.no, url: `${site}/v/${no}` },
      });
    }
    lines.push(content.daily.footer);

    const mail = renderEmail(
      { subject: fill(content.emails.daily.subject, { dayIndex: index }), lines },
      { links: {}, footer: content.emails.footer },
    );

    const res = await sendEmail({ to: p.email, ...mail });
    if (!res.ok) {
      console.error(`[dispatch-daily] kiri ${e.id}:`, res.error);
      // The claim stays. A letter that failed to send is better left unsent
      // than sent twice, and the person can still answer from any earlier link.
    }
    sent.push(e.id);
  }

  console.log(`[dispatch-daily] saadetud ${sent.length}, vahele ${skipped.length}`);
  return json(200, { sent: sent.length, skipped: skipped.length, detail: { sent, skipped } });
});
