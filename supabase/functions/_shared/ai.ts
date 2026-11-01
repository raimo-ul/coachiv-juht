// The paragraph at the foot of the test report.
//
// SPEC 12: only scores and answers are sent to Anthropic. No email address, no
// name, no token, nothing that identifies the person whose report this is.
//
// Every failure path returns null and the report is shown without the
// paragraph. SPEC 15 requires exactly that: a wrong API key must not cost the
// visitor their report.


import { env } from "./env.ts";

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

/**
 * The paragraph, out of a reply that may not begin with it.
 *
 * `content` is a list of blocks and the first one is not necessarily the text:
 * Sonnet 5 puts a `thinking` block in front, whose `.text` is undefined. Taking
 * content[0].text gave an empty string on every call, which this module then
 * correctly reported as a failed paragraph. Picking the first block that is
 * actually text works whether or not the model thinks first.
 */
export function firstText(body: unknown): string {
  const blocks = (body as { content?: Array<{ type?: string; text?: string }> })?.content;
  if (!Array.isArray(blocks)) return "";
  const block = blocks.find((b) => b?.type === "text" && typeof b.text === "string");
  return String(block?.text ?? "");
}

export async function writeReportParagraph(input: {
  scores: Record<string, number>;
  levels: Record<string, string>;
  answers: Record<string, number>;
  items: Record<string, string>;
}): Promise<AiResult> {
  const key = env("ANTHROPIC_API_KEY");
  const model = env("ANTHROPIC_MODEL");
  if (!key || !model) return { status: "failed", reason: "ANTHROPIC_API_KEY või ANTHROPIC_MODEL puudub" };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      // SPEC 12 asks for temperature 0,3 and max_tokens 400. Neither survives
      // contact with the model this product runs on.
      //
      // `temperature` is deprecated for Sonnet 5 and the API answers 400
      // "temperature is deprecated for this model", so sending it fails every
      // single call. It is gone rather than pinned to a value.
      //
      // max_tokens has to cover the model's own thinking as well as the
      // paragraph, and a 400 ceiling can be spent entirely on thinking and
      // return no text at all. The paragraph is still four or five sentences,
      // because the prompt says so and validateParagraph enforces it; the
      // budget simply has room now. Both recorded in DECISIONS.md.
      body: JSON.stringify({
        model,
        max_tokens: 4000,
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

    // A paragraph that ran out of room is not a short paragraph, it is half a
    // sentence. The first run after raising max_tokens still ended on "kus
    // ülesanne on ju", and validateParagraph passed it, because three complete
    // sentences plus a fragment counts as three sentences. The budget is
    // generous now and this should not fire, which is exactly why it is here:
    // nothing else would have caught it.
    if (body?.stop_reason === "max_tokens") {
      console.warn(`[ai] tagasi lükatud (katkes): ${firstText(body).slice(0, 400)}`);
      return { status: "failed", reason: "katkes max_tokens peal" };
    }

    const raw = firstText(body);
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

// ── The final report's reflection ────────────────────────────────────────────
//
// Two paragraphs and a question:
//
//   pattern    what reached the day often, what rarely, what came together
//   ownWords   what the leader wrote in the self-assessment, against the counts
//   question   one thing to carry on with
//
// SPEC 12.2 originally asked for three paragraphs: pattern, change, and
// comparison-with-the-test. The last two are the comparisons SPEC 11.1
// forbids, so on 01.11 they were replaced with ownWords and a third called
// "attention", about where three weeks of attention went.
//
// That third one was then cut, because it could not be written. Run against
// real data it restated the first paragraph with different adjectives: same
// three groups of questions, same order, nothing new. The cause was the data
// rather than the prompt. This report holds two things worth saying, the
// counts and the leader's own sentence, and a model asked for a third view
// where no third view exists will rephrase the first. Padding reads as filler
// in a reflection, so there are two.
//
// ownWords exists only when there is something to write from. A leader who
// skipped the self-assessment gets one paragraph and the question, and the
// prompt is built without that section so the model is never asked to write
// about words it does not have.
//
// Underneath it is still AttFocus's rule, which is the whole point: describe,
// do not rate. A model asked to comment on someone's three weeks will write
// "you did well" unless told plainly not to, and "you did well" is a rating.

export type FinalReflection = {
  pattern: string;
  /** Null when the self-assessment was not filled in. */
  ownWords: string | null;
  question: string;
};

export type FinalAiResult =
  | { status: "done"; parts: FinalReflection }
  | { status: "failed"; reason: string };

const RULES = `Kolm reeglit:
1. Kirjelda, ära hinda. Ei mingit skoori, hinnangut ega võrdlust teistega.
   „Sul läks hästi" on hinnang, ära kirjuta nii.
2. Räägi tegevustest, mitte inimesest. Mitte „sa oled järjepidev", vaid
   „vastasid 12 päeval 15-st".
3. „Ei" vastus ütleb, mis päeva ei jõudnud. See ei ole ebaõnnestumine.
   Olukorda võis ka mitte tekkida.

Ära võrdle esimest ja viimast nädalat. Ära ütle, kas midagi paranes või halvenes.
Kolm nädalat juhtisid tähelepanu, need ei mõõda arengut.

Iga lõik on 2-3 lauset, otse juhile, sina-vormis. Ilma pealkirjata, ilma loeteluta.
Kui vastatud päevi on alla viie, ütle esimeses lõigus, et pilt on ligikaudne.
Ära kasuta mõttekriipsu. Ära kasuta vastandust kujul „ei …, vaid …".
Ära pane koma sõna „ja" ette. Ära korda numbreid, juht näeb neid raportis.
Ära nimeta tüüpe ega isiksuseomadusi.

Küsimus on selle kohta, mida juht tahab alles hoida. See ei ole soovitus ega
ülesanne. Ära küsi, kuidas midagi sagedamini teha, ära küsi, mida parandada,
ja ära ehita küsimust kõige harvemini täidetud tegevuse ümber. Kõige harvem
„ei" tähendab, et olukorda tuli ette harva, mitte et seal on viga.`;

/**
 * Built per call, because the second paragraph only exists when the leader
 * wrote something. Asking for a paragraph about their own words when there are
 * none invites the model to invent them.
 */
function systemFinal(hasOwnWords: boolean): string {
  const sections = hasOwnWords
    ? `1. "pattern": mis jõudis päeva sageli, mis harva, mis tulid sageli samal päeval koos.
2. "ownWords": mida juht viimasel päeval enesehinnangus ise kirjutas, kõrvutatuna
   sellega, mis numbrites näha. See on tema enda sõna ja kaalub rohkem kui numbrid.
   Ära tsiteeri teda sõna-sõnalt ega paranda tema sõnastust.
3. "question": üks küsimus selle kohta, mida juht tahab edasi hoida.`
    : `1. "pattern": mis jõudis päeva sageli, mis harva, mis tulid sageli samal päeval koos.
2. "question": üks küsimus selle kohta, mida juht tahab edasi hoida.

Juht ei täitnud enesehinnangut, nii et "ownWords" jäta tühjaks stringiks.
Ära kirjuta sinna midagi, mida ta ei öelnud.`;

  return `Sa kirjutad eesti keeles juhi kolme nädala lõpuraporti tekstiosa.
Juht vastas igal tööpäeval kuuele jah/ei küsimusele selle kohta, mis tema päeva jõudis.
Teksti loeb ainult see juht ise.

${sections}

${RULES}

Vasta ainult JSON-ina kujul {"pattern":"…","ownWords":"…","question":"…"}`;
}

/** Up to four sentences per paragraph: the prompt asks for two or three. */
const MAX_SENTENCES_PER_PART = 4;

/**
 * The JSON out of a reply that may be wrapped in a fence.
 *
 * The model is asked for bare JSON and usually gives it, but a ```json fence
 * appears often enough that failing on it would throw away good text.
 */
export function parseJsonReply(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * Every part held to the same bar as the single paragraph was: present, not
 * runaway, no types named. One bad part fails the whole reflection rather than
 * leaving a gap in the middle of it, because a report missing its second
 * paragraph reads as broken while a report missing all of them reads as a
 * report without a reflection, which is what SPEC 11 allows.
 */
export function validateReflection(
  parsed: Record<string, unknown> | null,
  expectOwnWords: boolean,
): FinalAiResult {
  if (!parsed) return { status: "failed", reason: "vastus ei olnud JSON" };

  const clean = (v: unknown) => (typeof v === "string" ? stripDashes(v) : "");
  const pattern = clean(parsed.pattern);
  const ownWords = clean(parsed.ownWords);
  const question = clean(parsed.question);

  for (const [name, text] of [["pattern", pattern], ["question", question]] as const) {
    if (!text) return { status: "failed", reason: `${name} puudub` };
    if (sentenceCount(text) > MAX_SENTENCES_PER_PART) {
      return { status: "failed", reason: `${name} liiga pikk (${sentenceCount(text)} lauset)` };
    }
  }

  // Asked for, so it has to be there. Not asked for, so it must not be: a
  // paragraph about words the leader never wrote would be invented.
  if (expectOwnWords) {
    if (!ownWords) return { status: "failed", reason: "ownWords puudub" };
    if (sentenceCount(ownWords) > MAX_SENTENCES_PER_PART) {
      return { status: "failed", reason: `ownWords liiga pikk (${sentenceCount(ownWords)} lauset)` };
    }
  } else if (ownWords) {
    return { status: "failed", reason: "ownWords kirjutatud ilma enesehinnanguta" };
  }

  if (!question.includes("?")) return { status: "failed", reason: "küsimus ei ole küsimus" };

  const all = [pattern, ownWords, question].join(" ");
  if (/\barhetüüp|\btüüp/i.test(all)) return { status: "failed", reason: "nimetab tüüpi" };

  return {
    status: "done",
    parts: { pattern, ownWords: expectOwnWords ? ownWords : null, question },
  };
}

/**
 * SPEC 11: when this fails the report still goes out. The numbers above it are
 * the report; this is the part that can be missing.
 */
export async function writeFinalReflection(
  input: Record<string, unknown>,
): Promise<FinalAiResult> {
  const key = env("ANTHROPIC_API_KEY");
  const model = env("ANTHROPIC_MODEL");
  if (!key || !model) return { status: "failed", reason: "ANTHROPIC_API_KEY või ANTHROPIC_MODEL puudub" };

  const sa = input.selfAssessment as { kirjutasIse?: string | null } | null | undefined;
  const hasOwnWords = Boolean(sa?.kirjutasIse && String(sa.kirjutasIse).trim());

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      // Same two lessons as the test paragraph: temperature is deprecated for
      // this model and returns 400, and max_tokens has to cover the thinking
      // as well as the answer.
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        system: systemFinal(hasOwnWords),
        messages: [{ role: "user", content: JSON.stringify(input) }],
      }),
    });

    if (!res.ok) {
      console.error("[ai-final] anthropic", res.status, (await res.text()).slice(0, 300));
      return { status: "failed", reason: `HTTP ${res.status}` };
    }

    const body = await res.json();
    if (body?.stop_reason === "max_tokens") {
      console.warn("[ai-final] katkes max_tokens peal");
      return { status: "failed", reason: "katkes" };
    }

    const raw = firstText(body);
    const result = validateReflection(parseJsonReply(raw), hasOwnWords);
    if (result.status === "failed") {
      console.warn(`[ai-final] tagasi lükatud (${result.reason}): ${raw.slice(0, 300)}`);
    } else {
      console.info(`[ai-final] ok, lõike ${hasOwnWords ? 2 : 1}: ${result.parts.pattern.slice(0, 200)}`);
    }
    return result;
  } catch (e) {
    console.error("[ai-final] threw:", String(e));
    return { status: "failed", reason: "erind" };
  }
}
