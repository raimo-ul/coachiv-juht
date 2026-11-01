// What the self-assessment page needs before it can show the form.
//
// Lifted from AttFocus's get-self-assessment-by-token: check the token, hand
// back the period it belongs to, and say whether it has already been filled in
// so the page can show the thank-you instead of an empty form on a second
// visit.
//
// The service role, like every other token endpoint here. The caller's
// authority is the token in the query string, which is checked against
// enrollments on the next few lines. AttFocus learned this the hard way: that
// handler built its client from the anon key and leaned on anon's table
// grants, and the day those grants were removed members could open the form
// and not submit it. The anon key never gated anything.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { looksLikeToken } from "../_shared/tokens.ts";
import { env } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

serve(async (req) => {
  console.log("get-self-assessment-by-token boot OK");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!looksLikeToken(token)) return json(404, { error: "not_found" });

  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(500, { error: "missing_env" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, start_date, end_date, sa_submitted_at")
    .eq("sa_token", token)
    .maybeSingle();

  if (error) {
    console.error("[get-sa]", error.message);
    return json(500, { error: "lookup_failed" });
  }
  if (!data) return json(404, { error: "not_found" });

  return json(200, {
    ok: true,
    period: { start: data.start_date, end: data.end_date },
    submitted: Boolean(data.sa_submitted_at),
  });
});
