// The only way into Supabase.
//
// Server side, service role, every time. SPEC 3: RLS is on with no policies, so
// nothing else can read these tables anyway, and there is no browser client to
// leak. Importing this file from a client component is a build error by way of
// server-only.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL või SUPABASE_SERVICE_ROLE_KEY puudub");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
