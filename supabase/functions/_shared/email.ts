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
// The newsletter, through Smaily's authenticated API.
//
// Third attempt. The first posted from the server to Smaily's public opt-in
// form, which answers a server with a robot-check page and HTTP 200: every
// signup looked like a success and nobody was subscribed. The second was a
// link to Smaily's own page, which was honest but which almost nobody
// followed. This one uses the API the public form was standing in for.
//
// autoresponder.php rather than contact.php, because it fires Smaily's
// "subscriber opted-in" workflow rather than only writing a row.
//
// That workflow sends nothing unless an automation with a "form submitted"
// trigger exists in the Smaily account, and on 06.11 there was none: the
// three test addresses went straight to "Liitunud" with no confirmation mail.
// So this is single opt-in today. The consent evidence is the timestamp on
// participants and the sentence the person agreed to, and the copy beside the
// checkbox promises no confirmation mail. Adding that automation in Smaily
// would turn this into double opt-in without changing a line here.
//
// The response is read, not the status code. That is the whole lesson of the
// first attempt: a 200 from Smaily proved nothing, and a success here means
// the address came back in `addresses`.

const SMAILY_API = "https://9ndeed0t.sendsmaily.net/api/autoresponder.php";

export async function subscribeNewsletter(email: string): Promise<SendResult> {
  if (emailDisabled()) return { ok: true, skipped: true };

  const user = env("SMAILY_API_USER");
  const pass = env("SMAILY_API_PASS");
  if (!user || !pass) return { ok: false, error: "SMAILY_API_USER või SMAILY_API_PASS puudub" };

  try {
    const res = await fetch(SMAILY_API, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${user}:${pass}`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        addresses: [{ email, allikas: "coachiv-test" }],
      }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `Smaily HTTP ${res.status} ${text.slice(0, 200)}` };

    // Smaily answers {"code":101,"message":"OK","addresses":[...]} and filters
    // out addresses it would not take. An address missing from that list was
    // rejected, however cheerful the status line was.
    let body: { code?: number; message?: string; addresses?: string[] };
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, error: `Smaily vastas mitte-JSON-iga: ${text.slice(0, 200)}` };
    }

    const accepted = Array.isArray(body.addresses) &&
      body.addresses.some((a) => String(a).toLowerCase() === email.toLowerCase());

    if (!accepted) {
      return { ok: false, error: `Smaily ei võtnud aadressi: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

