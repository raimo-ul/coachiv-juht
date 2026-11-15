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
import { dayIndex, isWorkday, localDate, localHour, nextWorkday } from "../_shared/workdays.ts";
import { readPattern } from "../_shared/pattern.ts";
import { scoreTest, type ScoringVersion } from "../_shared/scoring.ts";
import { newToken } from "../_shared/tokens.ts";
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
    .select("id, participant_id, start_date, end_date, sa_token, participants!inner(email, timezone, locale)")
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

    // One link, not twelve. The questions are answered on the page the link
    // opens, the same way AttFocus does it. Putting six yes/no pairs in the
    // letter meant twelve signed URLs, each four wrapped lines of base64, and
    // a letter nobody could read. It also meant a mail scanner opening links
    // could answer somebody's day for them.
    const dayLink = `${site}/v/${await sign({ e: e.id, d: today })}`;

    // On the last workday the letter carries a second link, the way AttFocus's
    // dispatch-daily-links does: the self-assessment, due before the final
    // report goes out the next workday. Three questions, and the open one is
    // the only sentence the final paragraph gets in the person's own words.
    //
    // The token is minted here and only here, so it exists from the moment the
    // link is sent and never before. Minted once: a re-run on the same day
    // reuses it, because a second token would leave the first link dead in an
    // inbox someone had already opened.
    const lastDay = today === e.end_date;
    let saLink: string | null = null;

    if (lastDay) {
      let token = e.sa_token;
      if (!token) {
        token = newToken();
        const minted = await supabase
          .from("enrollments")
          .update({ sa_token: token })
          .eq("id", e.id)
          .is("sa_token", null)
          .select("sa_token");

        // Lost the race, or could not write. Read back what is actually there,
        // because sending a link built from a token the row does not hold would
        // give a 404 to the one person who clicked it.
        if (minted.error || !minted.data?.length) {
          const back = await supabase
            .from("enrollments").select("sa_token").eq("id", e.id).maybeSingle();
          token = back.data?.sa_token ?? null;
        }
      }
      if (token) saLink = `${site}/hinnang/${token}`;
      else console.error(`[dispatch-daily] sa_token puudub ${e.id}, kiri läheb ilma lingita`);
    }

    const mail = renderEmail(
      {
        subject: fill(content.emails.daily.subject, { dayIndex: index }),
        lines: [
          content.emails.daily.lead,
          `{dayButton:${content.emails.daily.button}}`,
          ...(saLink
            ? [
                content.emails.daily.saTitle,
                content.emails.daily.saBody,
                `{saButton:${content.emails.daily.saButton}}`,
              ]
            : []),
          content.daily.footer,
        ],
      },
      {
        links: saLink ? { day: dayLink, sa: saLink } : { day: dayLink },
        footer: content.emails.footer,
        siteName: content.meta.siteName,
      },
    );

    const res = await sendEmail({ to: p.email, ...mail });
    if (!res.ok) {
      console.error(`[dispatch-daily] kiri ${e.id}:`, res.error);
      // The claim stays. A letter that failed to send is better left unsent
      // than sent twice, and the person can still answer from any earlier link.
    }
    sent.push(e.id);
  }


  // ── The trial-day letter ──────────────────────────────────────────────
  //
  // One letter, the workday after the test, at the same hour the programme's
  // own letters go out. It carries the six questions as a plain list with no
  // links to answer: the point is to feel what a daily question is like, not
  // to collect anything. Nobody gets two, and nobody who already bought the
  // programme gets one.
  //
  // It rides the hourly dispatch rather than a cron of its own, because the
  // hour has to be read off each person's clock and this function already
  // does that for the daily letters.
  const trialSent: string[] = [];
  const trialSkipped: Array<{ id: string; why: string }> = [];

  // Only addresses on the list, while the letter is still being tried out. An
  // empty or absent list means everyone, which is what going live looks like.
  const backfillDate = (env("COACHIV_TRIAL_BACKFILL_DATE") ?? "").trim();
  const allowRaw = env("COACHIV_TEST_EMAIL_ALLOWLIST") ?? "";
  const allowList = allowRaw.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

  const { data: pending, error: pendingErr } = await supabase
    .from("tests")
    .select("id, created_at, answers, locale, scoring_version, report_token, participant_id, participants!inner(email, timezone, locale)")
    .is("trial_sent_at", null);

  if (pendingErr) {
    console.error("[dispatch-daily] proovipäev:", pendingErr.message);
  } else {
    for (const row of pending ?? []) {
      const t = row as unknown as {
        id: string; created_at: string; answers: Record<string, number>;
        locale: string; scoring_version: string; report_token: string; participant_id: string;
        participants: { email: string; timezone: string; locale: string };
      };
      const p = t.participants;
      const tz = p.timezone || "Europe/Tallinn";
      const today = localDate(now, tz);

      // On the backfill day the hour is a floor rather than a match: 127 letters
      // will not all leave inside one run, and the hourly cron has to be able
      // to pick up whatever the previous run did not reach.
      const hourNow = localHour(now, tz);
      const hourOk = today === backfillDate ? hourNow >= sendHour : hourNow === sendHour;
      if (!force && !hourOk) { trialSkipped.push({ id: t.id, why: "vale tund" }); continue; }
      if (!isWorkday(today)) { trialSkipped.push({ id: t.id, why: "nädalavahetus" }); continue; }

      // Due on the first workday after the test, not on a fixed "tomorrow":
      // a Friday test waits until Monday rather than landing on a Saturday.
      //
      // COACHIV_TRIAL_BACKFILL_DATE suspends that for one named day, so the
      // people who took the test before this letter existed get it once. The
      // variable is the whole control: it names a single date, so the exception
      // ends by itself rather than needing to be remembered and turned off.
      const due = nextWorkday(localDate(new Date(t.created_at), tz));
      if (today !== due && today !== backfillDate) {
        trialSkipped.push({ id: t.id, why: `tähtaeg ${due}` });
        continue;
      }

      if (allowList.length && !allowList.includes(p.email.toLowerCase())) {
        trialSkipped.push({ id: t.id, why: "pole nimekirjas" });
        continue;
      }

      // Someone who already bought it is not a prospect.
      const active = await supabase
        .from("enrollments").select("id")
        .eq("participant_id", t.participant_id).eq("status", "active").limit(1);
      if (active.data?.length) { trialSkipped.push({ id: t.id, why: "programm käib" }); continue; }

      // Once per person, not once per test. Somebody who takes the test twice
      // has already had this letter and does not need it again — which the
      // first run of this code proved by sending two to the same address.
      const already = await supabase
        .from("tests").select("id")
        .eq("participant_id", t.participant_id)
        .not("trial_sent_at", "is", null)
        .limit(1);
      if (already.data?.length) { trialSkipped.push({ id: t.id, why: "inimene sai juba" }); continue; }

      // Claim before sending. The column is the lock, so two overlapping runs
      // cannot both send: the second update matches nothing.
      const claim = await supabase
        .from("tests")
        .update({ trial_sent_at: new Date().toISOString() })
        .eq("id", t.id)
        .is("trial_sent_at", null)
        .select("id");
      if (claim.error || !claim.data?.length) { trialSkipped.push({ id: t.id, why: "juba võetud" }); continue; }

      const content = getContent(p.locale ?? t.locale);
      const tr = content.emails.trial;
      let pattern;
      try {
        pattern = readPattern(scoreTest(t.answers, t.locale, (t.scoring_version as ScoringVersion) ?? "v1"));
      } catch (e) {
        console.error(`[dispatch-daily] proovipäev skoorimine ${t.id}:`, String(e));
        trialSkipped.push({ id: t.id, why: "skoorimine ebaõnnestus" });
        continue;
      }

      const names = tr.names as Record<string, string>;
      const intro = pattern.allEqual
        ? tr.introEqual
        : tr.intro
            .replace("{strongest}", names[pattern.strongest])
            .replace("{weakest}", names[pattern.weakest]);

      const qs = content.daily.questions as Record<string, string>;

      const mail = renderEmail(
        { subject: tr.subject, lines: tr.body },
        {
          links: { report: `${site}/raport/${t.report_token}#programm` },
          footer: content.emails.footer,
          siteName: content.meta.siteName,
          values: { intro },
          lists: { questions: Object.keys(qs).map((k) => qs[k]) },
        },
      );

      const res = await sendEmail({ to: p.email, ...mail });
      if (!res.ok) console.error(`[dispatch-daily] proovipäeva kiri ${t.id}:`, res.error);
      trialSent.push(t.id);
    }
  }

  console.log(`[dispatch-daily] proovipäev: saadetud ${trialSent.length}, vahele ${trialSkipped.length}`);

  console.log(`[dispatch-daily] saadetud ${sent.length}, vahele ${skipped.length}`);
  return json(200, {
    sent: sent.length, skipped: skipped.length, detail: { sent, skipped },
    trial: { sent: trialSent.length, skipped: trialSkipped.length, detail: { sent: trialSent, skipped: trialSkipped } },
  });
});
