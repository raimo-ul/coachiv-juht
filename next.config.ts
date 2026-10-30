import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is off, against the Next 16 scaffold default.
  //
  // Almost every page here is one person's private data read fresh per request:
  // a report behind a token, an answer page behind a signed link. Under
  // cacheComponents a page is cached unless something marks it dynamic, so the
  // failure mode of getting it wrong is one visitor served another visitor's
  // report. With it off the failure mode is a page rendered more often than it
  // had to be.
  //
  // It also forbids the `dynamic` and `runtime` route segment exports, which
  // are how this app states "never cache this" in the file that would be
  // harmed. Recorded in DECISIONS.md.
  cacheComponents: false,
  // partialPrefetching requires cacheComponents, so it goes with it.
};

export default nextConfig;
