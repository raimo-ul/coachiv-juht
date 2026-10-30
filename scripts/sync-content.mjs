#!/usr/bin/env node
// content/et.json -> supabase/functions/_shared/et.json
//
// The same sentences are needed in two runtimes: the Next.js pages render them,
// and the Edge Functions build the emails and the AI prompt from them. Two
// copies would drift, so there is one source and this copy step.
//
// A copy rather than an import across the tree: `supabase functions deploy`
// bundles what it can reach from the function directory, and reaching up past
// supabase/ into content/ is the kind of path that works until the day it does
// not. Run before every deploy.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const from = fileURLToPath(new URL("../content/et.json", import.meta.url));
const to = fileURLToPath(new URL("../supabase/functions/_shared/et.json", import.meta.url));

const raw = readFileSync(from, "utf8");
JSON.parse(raw); // fail here rather than at runtime inside Deno
writeFileSync(to, raw);

console.log(`  et.json -> _shared/et.json (${raw.length} baiti)`);
