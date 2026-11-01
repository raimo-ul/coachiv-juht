// Sending mail, and turning et.json into the shell AttFocus already uses.
//
// The HTML comes from _shared/emailLayout.ts, lifted from AttFocus rather than
// rewritten. What stays here is the one thing that could not come across: this
// product keeps every user-visible sentence in content/et.json, while AttFocus
// writes its letters in TypeScript. So the body is assembled from content keys
// and handed to AttFocus's layout primitives.
//
// sendEmail is AttFocus's sendEmailBrevo with two differences. It returns a
// result instead of throwing, because the callers here are crons working
// through a list and one bad address must not end the run. And the sender comes
// from BREVO_SENDER_EMAIL and BREVO_SENDER_NAME, which is what SPEC 4 names,
// rather than AttFocus's EMAIL_FROM.

import { emailDisabled, env } from "./env.ts";
import { button, esc, layout, linkLine, p, small } from "./emailLayout.ts";

export { emailDisabled, esc };

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
  opts: {
    links: Record<string, string>;
    footer: string;
    siteName: string;
    /** Defaults to the subject, which is what every letter here wants. */
    heading?: string;
  },
): { subject: string; html: string; text: string } {
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  let buttonsSoFar = 0;

  const lines = body.lines;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = BUTTON.exec(line.trim());

    if (match) {
      const [, name, label] = match;
      const url = opts.links[name];
      if (!url) {
        // A button with no URL is dropped rather than rendered dead. A letter
        // missing a button is recoverable; one with a button to nowhere is not.
        console.warn(`[email] nupul puudub link: ${name}`);
        continue;
      }
      // The first button in a letter is the action; a second one is quieter,
      // which is the distinction AttFocus's linkLine exists for.
      htmlParts.push(buttonsSoFar === 0 ? button(url, label) : linkLine(url, label));
      buttonsSoFar += 1;
      textParts.push(`${label}: ${url}`, "");
      continue;
    }

    // A short closing line, the signature, is set quieter than the body.
    const isLast = i === lines.length - 1;
    htmlParts.push(isLast && line.length < 40 ? small(esc(line)) : p(esc(line)));
    textParts.push(line, "");
  }

  return {
    subject: body.subject,
    html: layout({
      heading: opts.heading ?? body.subject,
      bodyHtml: htmlParts.join("\n"),
      siteName: opts.siteName,
      footer: opts.footer,
    }),
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

  const apiKey = env("BREVO_API_KEY");
  const senderEmail = env("BREVO_SENDER_EMAIL");
  const senderName = env("BREVO_SENDER_NAME");
  if (!apiKey || !senderEmail) return { ok: false, error: "BREVO_API_KEY või BREVO_SENDER_EMAIL puudub" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey, accept: "application/json" },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName || undefined },
        to: [{ email: params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
      }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `Brevo HTTP ${res.status} ${text.slice(0, 300)}` };
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
 * systems, so a send would reach half of them. Raimo chose Smaily and the same
 * list his current readers are in. Recorded in DECISIONS.md.
 *
 * This is a request to opt in, not a subscription. Smaily answers it by mailing
 * the person a confirmation; they join the list only when they click it.
 */
// subscribeNewsletter is gone, 01.11.
//
// It posted to Smaily's public opt-in form from the server. That form answers
// a server with a robot check page and HTTP 200, so every signup looked like a
// success and nobody was ever subscribed. Seven consents sat in the database
// having reached no list; all of them test addresses, found before launch.
//
// The newsletter is now a link on the report to Smaily's own page, where the
// robot check and the confirmation mail belong and where the person can see
// that it worked. Doing it from the server again would need Smaily's
// authenticated API (autoresponder.php, HTTP Basic) and a check on the
// response body rather than the status code.

