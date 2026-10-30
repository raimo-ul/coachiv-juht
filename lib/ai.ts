// The paragraph at the foot of the test report.
//
// SPEC 12: only scores and answers are sent to Anthropic. No email address, no
// name, no token, nothing that identifies the person whose report this is.
//
// Every failure path returns null and the report is shown without the
// paragraph. SPEC 15 requires exactly that: a wrong API key must not cost the
// visitor their report.

import "server-only";

const SYSTEM = `Sa kirjutad eesti keeles ühe lühikese lõigu juhi coachiva juhtimise testi raporti lõppu.
Sisend on kuue osa skoorid skaalal 1–6 ja 18 väite vastused.
Osad: kolm tegevust (juhendamine, võimestamine, inspireerimine; sagedus viimase nelja nädala jooksul) ja kolm uskumust (inimene, suhe, autonoomia; kui hästi väide kirjeldab juhi tegelikke valikuid).
Paarid: inimene–inspireerimine, suhe–juhendamine, autonoomia–võimestamine.

Reeglid:
1. Kirjuta 4–5 lauset sina-vormis.
2. Kirjelda ainult seda, mis andmetes on näha. Ära oleta juhi töökeskkonna, meeskonna ega põhjuste kohta.
3. Seo vähemalt kaks osa omavahel, näiteks uskumuse ja tegevuse paar või kahe tegevuse erinevus.
4. Kui ühe osa sees on väidete vastused väga erinevad (vahe 3 või rohkem), võid selle välja tuua, nimetades väite sisu oma sõnadega.
5. Kui osade erinevused on väikesed (kõik alla 0,5 punkti), ütle, et pilt on ühtlane. Ära loo mustrit, mida pole.
6. Ära nimeta tüüpe, isiksuseomadusi ega diagnoose. Kirjelda tegevusi ja valikuid.
7. Ära kiida ega hinda. Ära kasuta sõnu nagu hea, suurepärane, tugev, nõrk.
8. Viimane lause on üks küsimus, mille üle juht saab mõelda.
9. Ära kasuta mõttekriipsu. Ära kasuta vastandust kujul „ei …, vaid …“. Ära pane koma sõna „ja“ ette.
10. Ära korda numbreid, juht näeb neid raportis.
Vasta ainult lõigu tekstiga.`;

export type AiResult = { status: "done"; text: string } | { status: "failed"; reason: string };

/**
 * SPEC 12 post-processing: strip em and en dashes used as sentence punctuation.
 *
 * A dash between digits is a range (the 1-6 scale, a year span) and stays. One
 * surrounded by spaces, or sitting against letters, is the punctuation the
 * prompt already asked the model not to use, and it is removed here because a
 * prompt rule is a request while this is a guarantee.
 */
export function stripDashes(text: string): string {
  return text
    .replace(/\s+[—–]\s+/g, " ")          // spaced: a clause break
    .replace(/(?<=\p{L})[—–](?=\p{L})/gu, " ")  // tight between letters
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Rough sentence count, used only to catch a runaway answer. */
function sentenceCount(text: string): number {
  return text.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 0).length;
}

/**
 * SPEC 12: reject an empty answer, one over six sentences, or one that names a
 * type. The product's whole claim is that it describes actions rather than
 * sorting people into kinds, so "tüüp" and "arhetüüp" are a hard stop even when
 * the rest of the paragraph reads well.
 */
export function validateParagraph(raw: string): AiResult {
  const text = stripDashes(raw);
  if (!text) return { status: "failed", reason: "tühi" };
  if (sentenceCount(text) > 6) return { status: "failed", reason: `liiga pikk (${sentenceCount(text)} lauset)` };
  if (/\barhetüüp|\btüüp/i.test(text)) return { status: "failed", reason: "nimetab tüüpi" };
  return { status: "done", text };
}

export async function writeReportParagraph(input: {
  scores: Record<string, number>;
  levels: Record<string, string>;
  answers: Record<string, number>;
  items: Record<string, string>;
}): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!key || !model) return { status: "failed", reason: "ANTHROPIC_API_KEY või ANTHROPIC_MODEL puudub" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.3,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(input) }],
      }),
    });

    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      console.error("[ai] anthropic", res.status, body);
      return { status: "failed", reason: `HTTP ${res.status}` };
    }

    const body = await res.json();
    const raw = String(body?.content?.[0]?.text ?? "");
    const result = validateParagraph(raw);

    // SPEC 12: log every answer. Raimo reads the first 30 to 50, and a rejected
    // one is the most useful of all, so the text is logged with the reason.
    if (result.status === "failed") {
      console.warn(`[ai] tagasi lükatud (${result.reason}): ${raw.slice(0, 400)}`);
    } else {
      console.info(`[ai] ok: ${result.text.slice(0, 400)}`);
    }
    return result;
  } catch (e) {
    console.error("[ai] threw:", String(e));
    return { status: "failed", reason: "erind" };
  }
}
