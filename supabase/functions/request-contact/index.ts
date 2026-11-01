// "Tahan, et Raimo võtaks minuga ühendust."
//
// The report token is the authority, as everywhere else in this product. A
// caller holding it can already read the whole report, so being able to set a
// flag on the same person adds no reach.
//
// Setting only, never clearing. Unticking the box is not a withdrawal of a
// request already sent, and a person who changes their mind writes to Raimo.
// That also makes the call idempotent: ticking twice is one request.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { looksLikeToken } from "../_shared/tokens.ts";
import { fill, getContent } from "../_shared/content.ts";
import { renderEmail, sendEmail } from "../_shared/email.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  console.log("request-contact boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? "").trim();
  if (!looksLikeToken(token)) return json(404, { ok: false });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const test = await supabase
    .from("tests")
    .select("participant_id")
    .eq("report_token", token)
    .maybeSingle();

  if (test.error || !test.data) return json(404, { ok: false });

  const at = new Date();
  const upd = await supabase
    .from("participants")
    .update({ contact_requested: true, contact_requested_at: at.toISOString() })
    .eq("id", test.data.participant_id)
    .eq("contact_requested", false)   // keeps the first request's timestamp
    .select("email");

  if (upd.error) {
    console.error("[request-contact]", upd.error.message);
    return json(500, { ok: false });
  }

  // Raimo hears about it, or nobody does.
  //
  // Until 01.11 this function set a column and stopped. The person ticking the
  // box believed the ball was in Raimo's court while the request sat in a
  // table nobody opens. Three of them had collected that way before anyone
  // noticed. The flag alone is not a feature.
  //
  // Only on the first tick: the update above is conditional on the flag still
  // being false, so a second press changes no row and sends no second letter.
  const person = upd.data?.[0]?.email;
  if (person) {
    const content = getContent();
    const site = (env("SITE_BASE_URL") ?? "").replace(/\/+$/, "");
    const mail = renderEmail(
      {
        subject: content.emails.contactRequest.subject,
        lines: content.emails.contactRequest.body.map((l) =>
          fill(l, { email: person, when: at.toISOString().slice(0, 16).replace("T", " ") })
        ),
      },
      {
        links: { report: `${site}/raport/${token}` },
        footer: content.emails.footer,
        siteName: content.meta.siteName,
      },
    );

    // The request is recorded either way. A letter that did not go is worth a
    // log line, not a 500 that would make the page tell the person it failed.
    const sent = await sendEmail({ to: content.about.companies.contact, ...mail });
    if (!sent.ok) console.error("[request-contact] teade Raimole:", sent.error);
    else console.log(`[request-contact] teade saadetud, ${person}`);
  }

  return json(200, { ok: true });
});
