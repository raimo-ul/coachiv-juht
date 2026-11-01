"use client";

import { useId, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";

/**
 * The checkbox at the foot of the report: "Tahan, et Raimo võtaks minuga
 * ühendust." Raimo's addition, from the Lovable design.
 *
 * It saves the moment it is ticked rather than waiting for a submit, because
 * there is no form around it and nothing else on the page to press. Ticking is
 * the whole interaction, so it has to be the whole commitment.
 *
 * Unticking does not undo it. A request already sent is not withdrawn by a
 * second click, and pretending otherwise would be the lie: Raimo may already
 * have read it. The box simply stays ticked and says so.
 */
export function ContactOptIn({ token, content }: { token: string; content: Content }) {
  const id = useId();
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onChange(next: boolean) {
    setChecked(next);
    if (!next || saved) return;

    try {
      const res = await fetch(functionUrl("request-contact"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ token }),
      });
      if (res.ok) setSaved(true);
      else setChecked(false);
    } catch (e) {
      console.error("[kontakt] ebaõnnestus:", e);
      // Nothing was recorded, so the box goes back to how it was rather than
      // telling someone their request is in when it is not.
      setChecked(false);
    }
  }

  return (
    <div className="mt-8 border-t-2 border-rule pt-6">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={saved}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 border-2 border-rule accent-[var(--ink)]"
        />
        <span className="text-base leading-relaxed">{content.report.contact.label}</span>
      </label>
      {saved && <p className="mt-2 pl-8 text-sm font-medium">{content.report.contact.saved}</p>}
    </div>
  );
}
