// The year-end summary, as an email.
//
// Built from bingo-kaart-naidis.html, which is Raimo's design and the source
// for every measurement here. The palette, the drawn wordmark and the
// table-inside-a-table discipline come from emailLayout.ts, imported rather
// than copied so the greys cannot drift into a second set.
//
// Why its own shell instead of layout(): that one is a 560 px card with a 2 px
// border on a tinted ground, and this is a 600 px white page ruled with
// hairlines. The structure is the same idea, the proportions are not.
//
// Three parts emailLayout does not have: the 3x3 grid, the "all four" block
// with the SINA marker, and the quoted block with a left rule. All three are
// tables with inline styles, for the same Outlook reason as everything else.

import { BODY, BORDER, esc, FG, GREEN, HEAD, MUTED, logo } from "./emailLayout.ts";
import type { BingoType } from "./bingo.ts";
import { BINGO_TYPES } from "./bingo.ts";

/** Block fill, and the border of a square nobody ticked. */
const TINT = "#EBEAE5";

export type CardContent = {
  squares: ReadonlyArray<{ text: string; keyword: string }>;
  types: Record<BingoType, {
    name: string;
    range: string;
    tagline: string;
    body: readonly string[];
    gift: string;
  }>;
  card: {
    eyebrow: string;
    scoreSuffix: string;
    ownWords: string;
    wordsToSelf: string;
    gift: string;
    allTypes: string;
    you: string;
    starters: readonly string[];
    button: string;
    shareUrl: string;
    closing: readonly string[];
    signature: string;
    footer: readonly string[];
  };
};

export type CardAnswers = {
  /** Which of the nine squares were ticked, by index. */
  markedIndexes: readonly number[];
  marked: number;
  type: BingoType;
  /** The pride answer. Required on the form, but never trusted to be there. */
  proud: string;
  /** The three sentence endings, in order. Empty strings are left out. */
  endings: readonly string[];
};

const eyebrow = (text: string) =>
  `<div style="font-family:${HEAD};font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED};padding-bottom:10px">${esc(text)}</div>`;

const para = (text: string, last = false) =>
  `<p style="font-family:${BODY};font-size:16px;line-height:1.75;color:${FG};margin:0 0 ${last ? 0 : 16}px">${esc(text)}</p>`;

/**
 * One cell of the 3x3 grid.
 *
 * Marked is a tint with a hairline and a tick, unmarked is white with a dashed
 * rule in the same tint. Black cells were tried and rejected: Raimo said they
 * read as boxes rather than as a grid.
 *
 * Spacing is padding on the cell rather than cellspacing on the table. Word's
 * rendering engine, which is what Outlook on Windows uses, treats cellspacing
 * inconsistently and the grid is the one part of this card that cannot survive
 * being half-collapsed.
 */
const cell = (keyword: string, marked: boolean) =>
  `<td width="33%" align="center" valign="middle" height="64"
       style="padding:6px;background:${marked ? TINT : "#FFFFFF"};
              border:1px ${marked ? `solid ${BORDER}` : `dashed ${TINT}`};
              font-family:${HEAD};font-size:15px;letter-spacing:0.08em;text-transform:uppercase;
              color:${marked ? FG : MUTED}">${marked ? "&#10003; " : ""}${esc(keyword)}</td>`;

function grid(c: CardContent, markedIndexes: readonly number[]): string {
  const on = new Set(markedIndexes);
  const rows = [0, 1, 2].map((r) =>
    `<tr>${[0, 1, 2].map((col) => {
      const i = r * 3 + col;
      return cell(c.squares[i].keyword, on.has(i));
    }).join("")}</tr>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="4" border="0"
            style="border-collapse:separate;border-spacing:4px">${rows}</table>`;
}

function allTypes(c: CardContent, mine: BingoType): string {
  const rows = BINGO_TYPES.map((key) => {
    const t = c.types[key];
    const me = key === mine;
    const badge = me
      ? ` <span style="background:${FG};color:#FFFFFF;font-family:${HEAD};font-size:12px;letter-spacing:0.15em;padding:3px 8px">&nbsp;${esc(c.card.you)}&nbsp;</span>`
      : "";
    return `<tr><td style="padding:14px ${me ? "0 14px 16px" : "0"};border-bottom:1px solid ${BORDER};${
      me ? `border-left:3px solid ${FG};background:${TINT}` : ""
    }">
        <div style="font-family:${HEAD};font-size:24px;line-height:26px;color:${FG}">${esc(t.name.toUpperCase())}
          <span style="font-size:15px;letter-spacing:0.08em;color:${MUTED}">&nbsp;·&nbsp; ${esc(t.range.toUpperCase())}</span>${badge}</div>
        <div style="font-family:${BODY};font-size:14px;line-height:1.5;color:${me ? FG : MUTED}">${esc(t.tagline)}</div>
      </td></tr>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

/**
 * The share block.
 *
 * The button is a link, because an email cannot put anything on the clipboard.
 * The address is printed under it in full for exactly that reason: it is the
 * only part a reader can actually copy. The same pair, visible address plus a
 * real button, is on the report page in components/ShareBlock.tsx, where the
 * button does copy.
 */
function share(c: CardContent): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:${GREEN};border:2px solid ${BORDER}">
        <a href="${esc(c.card.shareUrl)}" style="display:inline-block;padding:14px 30px;font-family:${HEAD};
           font-size:18px;letter-spacing:0.05em;text-transform:uppercase;color:${FG};text-decoration:none">${esc(c.card.button)}</a>
      </td></tr>
      <tr><td style="padding-top:10px">
        <a href="${esc(c.card.shareUrl)}" style="font-family:${BODY};font-size:14px;color:${MUTED}">${esc(c.card.shareUrl)}</a>
      </td></tr>
    </table>`;
}

const section = (html: string, bottom = 32) => `<tr><td style="padding:0 0 ${bottom}px">${html}</td></tr>`;

export function renderCard(c: CardContent, a: CardAnswers): { html: string; text: string } {
  const t = c.types[a.type];

  // Hidden first line, so the inbox preview is the type rather than the
  // wordmark followed by a label.
  const preheader =
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(t.tagline)}</div>`;

  const blocks: string[] = [
    section(logo("Radical Simplicity"), 0),
    `<tr><td style="padding:24px 0 8px;border-top:1px solid ${BORDER}">${eyebrow(c.card.eyebrow)}</td></tr>`,
    section(`<div style="font-family:${HEAD};font-size:72px;line-height:72px;color:${FG}">${esc(t.name.toUpperCase())}</div>`, 12),
    section(`<div style="font-family:${BODY};font-size:19px;line-height:1.5;color:${FG}">${esc(t.tagline)}</div>`, 28),
    section(
      `<div style="font-family:${HEAD};font-size:48px;line-height:48px;color:${FG}">${a.marked}` +
      ` <span style="font-size:22px;letter-spacing:0.05em">${esc(c.card.scoreSuffix.toUpperCase())}</span></div>`,
      8,
    ),
    section(grid(c, a.markedIndexes)),
    section(t.body.map((p, i) => para(p, i === t.body.length - 1)).join("")),
  ];

  // Their own words, only when there are any. An empty quote block with a rule
  // beside it reads as something that failed to load.
  if (a.proud.trim()) {
    blocks.push(section(
      eyebrow(c.card.ownWords) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
         <tr><td style="border-left:3px solid ${FG};padding:4px 0 4px 18px">
           <div style="font-family:${BODY};font-size:16px;line-height:1.7;color:${FG};font-style:italic">${esc(a.proud.trim())}</div>
         </td></tr></table>`,
    ));
  }

  const endings = a.endings
    .map((text, i) => ({ text: text.trim(), starter: c.card.starters[i] }))
    .filter((e) => e.text);
  if (endings.length) {
    blocks.push(section(
      eyebrow(c.card.wordsToSelf) +
      endings.map((e, i) =>
        `<p style="font-family:${BODY};font-size:16px;line-height:1.75;color:${FG};margin:0 0 ${
          i === endings.length - 1 ? 0 : 8
        }px">${esc(e.starter)} <i>${esc(e.text)}</i></p>`
      ).join(""),
    ));
  }

  blocks.push(
    section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TINT}">
         <tr><td style="padding:24px">${eyebrow(c.card.gift)}
           <div style="font-family:${BODY};font-size:16px;line-height:1.7;color:${FG}">${esc(t.gift)}</div>
         </td></tr></table>`,
    ),
    `<tr><td style="padding:24px 0 12px;border-top:1px solid ${BORDER}">${eyebrow(c.card.allTypes)}</td></tr>`,
    section(allTypes(c, a.type)),
    section(share(c)),
    section(
      c.card.closing.map((l) =>
        `<div style="font-family:${BODY};font-size:18px;line-height:1.6;color:${FG};margin:0 0 6px">${esc(l)}</div>`
      ).join("") +
      `<div style="font-family:${HEAD};font-size:26px;letter-spacing:0.05em;color:${FG};padding-top:8px">${esc(c.card.signature)}</div>`,
    ),
    `<tr><td style="padding:24px 0 0;border-top:1px solid ${BORDER}">
       <div style="font-family:${BODY};font-size:12px;line-height:1.6;color:${MUTED}">${
         c.card.footer.map(esc).join("<br>")
       }</div></td></tr>`,
  );

  const html = `<!doctype html>
<html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#FFFFFF">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%">
      ${blocks.join("\n      ")}
    </table>
  </td></tr>
</table>
</body></html>`;

  const lines = [
    c.card.eyebrow,
    t.name.toUpperCase(),
    t.tagline,
    `${a.marked} ${c.card.scoreSuffix}`,
    "",
    ...t.body,
    "",
    ...(a.proud.trim() ? [c.card.ownWords, a.proud.trim(), ""] : []),
    ...(endings.length
      ? [c.card.wordsToSelf, ...endings.map((e) => `${e.starter} ${e.text}`), ""]
      : []),
    c.card.gift,
    t.gift,
    "",
    `${c.card.button}: ${c.card.shareUrl}`,
    "",
    ...c.card.closing,
    c.card.signature,
    "",
    ...c.card.footer,
  ];

  return { html, text: lines.join("\n") };
}
