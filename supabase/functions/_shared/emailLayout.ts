// Lifted from attfocus/supabase/functions/dispatch-daily-links/_shared/emailLayout.ts
//
// Raimo's point, and he was right: this already exists and already works, in a
// product of his that has been sending mail to real teams. Rewriting it here
// would have been a second thing to get wrong in Outlook.
//
// Changed on the way across, and only these:
//   the wordmark says COACHIVA JUHI TEST rather than ATTFOCUS
//   the palette is this product's (#00FA96, #EBEAE5) rather than AttFocus's
//   the display face is Bebas Neue rather than Fjalla One
//
// Everything structural is as it was there: a table inside a table because
// that is what Outlook understands, inline styles because Gmail strips a style
// block, and a drawn wordmark because a remote logo image is blocked by
// default in most clients.

export const BG = "#F3F2EF";
export const CARD = "#FFFFFF";
export const FG = "#0F0F0F";
export const MUTED = "#6A6862";
export const BORDER = "#2B2B2B";
export const GREEN = "#00FA96";
export const GREEN_INK = "#06281B"; // the green, darkened enough to read as text

export const HEAD = "'Bebas Neue', 'Arial Narrow', Impact, sans-serif";
export const BODY = "'DM Sans', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

/** The wordmark, drawn rather than fetched: a remote logo image would be blocked. */
export const logo = (name: string) => `
  <div style="margin-bottom:26px">
    <span style="display:inline-block;width:10px;height:10px;background:${GREEN};vertical-align:middle;border:2px solid ${BORDER}"></span>
    <span style="font-family:${HEAD};font-size:17px;letter-spacing:0.14em;color:${FG};vertical-align:middle;margin-left:8px">${esc(name.toUpperCase())}</span>
  </div>`;

export const p = (html: string) =>
  `<p style="font-family:${BODY};font-size:16px;line-height:1.6;color:${FG};margin:0 0 14px">${html}</p>`;

export const small = (html: string) =>
  `<p style="font-family:${BODY};font-size:13px;line-height:1.6;color:${MUTED};margin:0 0 12px">${html}</p>`;

/** The one green element per message. Dark text on green, never green on white. */
export const button = (url: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0">
     <tr><td style="background:${GREEN};border:2px solid ${BORDER}">
       <a href="${esc(url)}" style="display:inline-block;padding:14px 30px;font-family:${HEAD};
          font-size:18px;letter-spacing:0.06em;text-transform:uppercase;color:${FG};text-decoration:none">${esc(label)}</a>
     </td></tr>
   </table>`;

/**
 * A list of short lines, each with its own rule down the left.
 *
 * Six questions set as six ordinary paragraphs read as a wall: nothing tells
 * the eye where one ends and the next begins, and the trial letter is asking
 * someone to go through them one at a time. A table rather than a <ul>,
 * because Outlook's list indentation is its own argument.
 */
export const list = (items: readonly string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;width:100%">
     ${items.map((item) => `
     <tr><td style="padding:0 0 10px 0">
       <table role="presentation" cellpadding="0" cellspacing="0"><tr>
         <td style="width:3px;background:${GREEN};"></td>
         <td style="padding:2px 0 2px 12px;font-family:${BODY};font-size:16px;line-height:1.5;color:${FG}">${esc(item)}</td>
       </tr></table>
     </td></tr>`).join("")}
   </table>`;

/** A quieter second action, for when one message carries two. */
export const linkLine = (url: string, label: string) =>
  `<p style="font-family:${BODY};font-size:15px;margin:0 0 10px">
     <a href="${esc(url)}" style="color:${GREEN_INK};text-decoration:underline">${esc(label)}</a>
   </p>`;

export function layout(opts: {
  heading: string;
  bodyHtml: string;
  siteName: string;
  footer?: string;
}): string {
  return `<!doctype html>
<html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:${CARD};border:2px solid ${BORDER};">
        <tr><td style="padding:32px 34px">
          ${logo(opts.siteName)}
          <h1 style="font-family:${HEAD};font-size:28px;line-height:1.1;letter-spacing:0.02em;
                     color:${FG};margin:0 0 18px;font-weight:400;text-transform:uppercase">${esc(opts.heading)}</h1>
          ${opts.bodyHtml}
        </td></tr>
      </table>
      ${opts.footer
        ? `<table role="presentation" width="100%" style="max-width:560px"><tr><td style="padding:14px 34px">
             <p style="font-family:${BODY};font-size:12px;line-height:1.6;color:${MUTED};margin:0">${esc(opts.footer)}</p>
           </td></tr></table>`
        : ""}
    </td></tr>
  </table>
</body></html>`;
}
