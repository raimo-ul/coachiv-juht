// Building and sending the mail.
//
// SPEC 13 lets the letters be dark or light, "whichever works better in Gmail
// and Outlook". They are light with dark text. A dark email is the harder one
// to get right: Outlook on Windows drops body background colours, and Gmail's
// own dark mode re-colours text it thinks is too close to the background, which
// turns a carefully dark letter into grey on grey for some readers and not
// others. White with near-black text renders the same way everywhere, and the
// one green button still carries the brand. Recorded in DECISIONS.md.

import { emailDisabled, env } from "./env.ts";

export { emailDisabled };

const BG = "#FFFFFF";
const FG = "#15181A";
const DIM = "#6B7280";
const LINE = "#E5E7EB";
const ACCENT = "#00FC99";
const ACCENT_INK = "#06281B"; // the accent is a fill; text on it must be dark

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/**
 * A line in an email body array is either text or a button.
 *
 * Buttons are written in et.json as {nameButton:Label}, so Raimo can move the
 * button up or down the letter, or change its words, without touching code.
 */
const BUTTON = /^\{(\w+)Button:([^}]+)\}$/;

export type EmailBody = { subject: string; lines: readonly string[] };

export function renderEmail(
  body: EmailBody,
  opts: { links: Record<string, string>; footer: string },
): { subject: string; html: string; text: string } {
  const htmlParts: string[] = [];
  const textParts: string[] = [];

  for (const line of body.lines) {
    const button = BUTTON.exec(line.trim());
    if (button) {
      const [, name, label] = button;
      const url = opts.links[name];
      if (!url) {
        // A button with no URL is dropped rather than rendered dead. A letter
        // missing a button is recoverable; one with a button to nowhere is not.
        console.warn(`[email] nupul puudub link: ${name}`);
        continue;
      }
      htmlParts.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0">
           <tr><td style="background:${ACCENT};">
             <a href="${esc(url)}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;
                font-size:16px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;
                color:${ACCENT_INK};text-decoration:none">${esc(label)}</a>
           </td></tr>
         </table>`,
      );
      textParts.push(`${label}: ${url}`, "");
      continue;
    }

    htmlParts.push(
      `<p style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:${FG};margin:0 0 14px">${esc(line)}</p>`,
    );
    textParts.push(line, "");
  }

  const html = `<!doctype html>
<html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
        <tr><td style="padding:0 6px">
          ${htmlParts.join("\n")}
          <hr style="border:0;border-top:1px solid ${LINE};margin:28px 0 14px">
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${DIM};margin:0">${esc(opts.footer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return {
    subject: body.subject,
    html,
    text: [...textParts, opts.footer].join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export type SendResult = { ok: true; skipped?: true } | { ok: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  if (emailDisabled()) {
    console.info(`[email] EMAIL_DISABLED, ei saada: ${params.to}`);
    return { ok: true, skipped: true };
  }

  const key = env("BREVO_API_KEY");
  const senderEmail = env("BREVO_SENDER_EMAIL");
  const senderName = env("BREVO_SENDER_NAME");
  if (!key || !senderEmail) return { ok: false, error: "BREVO_API_KEY või BREVO_SENDER_EMAIL puudub" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName || undefined },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
      }),
    });

    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, error: `Brevo HTTP ${res.status} ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * Newsletter sign-up, into Smaily and not Brevo.
 *
 * SPEC 13 says a Brevo list with a Brevo double opt-in template. That line was
 * written before the newsletter moved: Raimo's readers live in Smaily, and
 * radicalsimplicity.eu signs people up there from both its newsletter form and
 * its contact form. A Brevo list here would split one readership across two
 * systems, so that a send would reach half of them. Raimo chose Smaily and the
 * same list his current readers are in. Recorded in DECISIONS.md.
 *
 * This is a request to opt in, not a subscription. Smaily answers it by mailing
 * the person a confirmation; they join the list only when they click it. Which
 * list, and what that confirmation says, is configured in Smaily rather than
 * here. `allikas` is the only thing this product adds, so Raimo can tell later
 * which readers arrived through the test.
 */
const SMAILY_OPT_IN = "https://9ndeed0t.sendsmaily.net/api/opt-in/";

export async function subscribeNewsletter(email: string): Promise<SendResult> {
  if (emailDisabled()) return { ok: true, skipped: true };

  try {
    const res = await fetch(SMAILY_OPT_IN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ email, allikas: "coachiv-test" }).toString(),
      // Without a success_url Smaily answers an accepted post with a redirect
      // of its own, so 3xx means yes just as much as 2xx does.
      redirect: "manual",
    });

    if (res.status >= 400) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, error: `Smaily HTTP ${res.status} ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
