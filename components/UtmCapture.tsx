"use client";

import { useEffect } from "react";
import { cleanUtmSet, storeUtmIfFirst } from "@/lib/utm";

/**
 * Takes utm_source, utm_medium and utm_campaign off the link and out of the
 * address bar, the same way PromoCapture handles ?kood=.
 *
 * Removing them from the URL is not only tidiness. A report link gets pasted
 * into Slack and forwarded by mail, and parameters left in the bar travel with
 * it: the next person to open that link would be counted as having arrived
 * from a campaign they never saw.
 *
 * Mounted on the home page alone. The start button goes to /test carrying no
 * parameters, so whatever the link arrived with has to be taken here or it is
 * lost. A campaign that points straight at /alus or /test goes uncounted, and
 * that is the price of keeping the capture in one place.
 */
export function UtmCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const keys = ["utm_source", "utm_medium", "utm_campaign"] as const;
    const present = keys.filter((k) => url.searchParams.has(k));
    if (present.length === 0) return;

    storeUtmIfFirst(
      cleanUtmSet(Object.fromEntries(keys.map((k) => [k, url.searchParams.get(k)]))),
    );

    // Taken out whether or not they were valid: a rejected value is still
    // someone else's text sitting in the visitor's address bar.
    for (const k of present) url.searchParams.delete(k);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}
