import { describe, expect, it } from "vitest";
import { firstText, parseJsonReply, stripDashes, validateParagraph, validateReflection } from "./ai.ts";

describe("stripDashes", () => {
  it("removes a dash used as punctuation between clauses", () => {
    expect(stripDashes("Küsid tihti — kuulad harvem.")).toBe("Küsid tihti kuulad harvem.");
    expect(stripDashes("Küsid tihti – kuulad harvem.")).toBe("Küsid tihti kuulad harvem.");
  });

  it("removes a dash sitting tight between words", () => {
    expect(stripDashes("inimene—inspireerimine")).toBe("inimene inspireerimine");
  });

  it("leaves a range between numbers alone", () => {
    // The scale itself is written 1-6 and must survive.
    expect(stripDashes("skaalal 1–6")).toContain("1–6");
    expect(stripDashes("aastatel 2006–2008")).toContain("2006–2008");
  });

  it("leaves an ordinary hyphen alone", () => {
    expect(stripDashes("jah/ei-küsimused")).toBe("jah/ei-küsimused");
  });
});

describe("validateParagraph", () => {
  const good = "Küsid inimeste mõtteid sageli. Ootuste sõnastamine jõuab päeva harvemini. "
    + "Sinu valikud toetavad arengut. Mis hoiab ootuste välja ütlemist tagasi?";

  it("accepts a paragraph within the rules", () => {
    const r = validateParagraph(good);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.text).toBe(good);
  });

  it("strips dashes on the way through", () => {
    const r = validateParagraph("Küsid sageli — ootusi harvem. Mis seda hoiab?");
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.text).not.toMatch(/[—–]/);
  });

  it("rejects an empty answer", () => {
    expect(validateParagraph("").status).toBe("failed");
    expect(validateParagraph("   \n  ").status).toBe("failed");
  });

  it("rejects more than six sentences", () => {
    const long = Array.from({ length: 7 }, (_, i) => `Lause number ${i + 1}.`).join(" ");
    const r = validateParagraph(long);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.reason).toContain("pikk");
  });

  it("rejects a paragraph that names a type", () => {
    // The product describes actions. Sorting the reader into a kind is the one
    // thing the prompt forbids outright, so it is checked rather than trusted.
    const typed = validateParagraph("Sinu tüüp on juhendaja. Mis edasi?");
    expect(typed.status).toBe("failed");

    const arch = validateParagraph("See on klassikaline arhetüüp. Mis edasi?");
    expect(arch.status).toBe("failed");
  });

  it("keeps a word that merely contains the letters", () => {
    // "tüüpiline" is not "tüüp" as a label, but the check is deliberately
    // blunt: a false rejection costs one missing paragraph, a false pass puts a
    // type on the reader's screen.
    expect(validateParagraph("See on tüüpiline muster. Mis edasi?").status).toBe("failed");
  });
});

describe("firstText", () => {
  it("takes the text block even when a thinking block comes first", () => {
    // Sonnet 5 answers this way. Reading content[0].text gave "" every time.
    expect(firstText({ content: [
      { type: "thinking", thinking: "…" },
      { type: "text", text: "Küsid sageli." },
    ] })).toBe("Küsid sageli.");
  });

  it("takes the text block when it is first", () => {
    expect(firstText({ content: [{ type: "text", text: "Tere." }] })).toBe("Tere.");
  });

  it("returns nothing when there is no text block at all", () => {
    expect(firstText({ content: [{ type: "thinking", thinking: "…" }] })).toBe("");
    expect(firstText({})).toBe("");
    expect(firstText(null)).toBe("");
  });
});

// The final report's reflection: two paragraphs and a question, or one and the
// question when the self-assessment was skipped. Each test names the failure it
// is guarding against, because every one of these has a plausible-looking wrong
// answer that would reach a real reader.
describe("parseJsonReply", () => {
  it("reads bare JSON", () => {
    expect(parseJsonReply('{"a":1}')).toEqual({ a: 1 });
  });

  it("reads JSON the model wrapped in a fence", () => {
    // Asked for bare JSON, the model fences it often enough that throwing the
    // answer away over three backticks would waste good text.
    expect(parseJsonReply('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonReply('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("reads JSON with a sentence in front of it", () => {
    expect(parseJsonReply('Siin on vastus:\n{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null rather than throwing on something that is not JSON", () => {
    expect(parseJsonReply("Vabandust, ma ei saa seda teha.")).toBeNull();
    expect(parseJsonReply("")).toBeNull();
    expect(parseJsonReply("{ katki")).toBeNull();
  });
});

describe("validateReflection", () => {
  const full = {
    pattern: "Kuulamine jõudis päeva peaaegu alati. Suuremad ülesanded jõudsid harva.",
    ownWords: "Kirjutasid, et hakkasid hommikul mõtlema, kellele midagi öelda on.",
    question: "Mida sa tahad neist edasi hoida?",
  };

  it("accepts two paragraphs and a question", () => {
    const r = validateReflection(full, true);
    expect(r.status).toBe("done");
    if (r.status === "done") {
      expect(r.parts.ownWords).toContain("hommikul");
      expect(r.parts.question).toContain("?");
    }
  });

  it("accepts one paragraph and the question when there was no self-assessment", () => {
    const r = validateReflection({ ...full, ownWords: "" }, false);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.parts.ownWords).toBeNull();
  });

  it("refuses words the leader never wrote", () => {
    // The guard that matters most. Without a self-assessment there is nothing
    // to write that paragraph from, so anything there was invented.
    const r = validateReflection(full, false);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.reason).toContain("ownWords");
  });

  it("refuses a missing own-words paragraph when one was asked for", () => {
    const r = validateReflection({ ...full, ownWords: "" }, true);
    expect(r.status).toBe("failed");
  });

  it("fails the whole reflection when one part is missing", () => {
    // A report missing its middle paragraph reads as broken. A report with no
    // reflection at all reads as a report, which SPEC 11 allows.
    expect(validateReflection({ ...full, pattern: "" }, true).status).toBe("failed");
    expect(validateReflection({ ...full, pattern: "   " }, true).status).toBe("failed");
  });

  it("refuses a question that is not a question", () => {
    const r = validateReflection({ ...full, question: "Hoia seda edasi." }, true);
    expect(r.status).toBe("failed");
  });

  it("refuses a runaway paragraph", () => {
    const long = "Üks lause. Teine lause. Kolmas lause. Neljas lause. Viies lause.";
    expect(validateReflection({ ...full, pattern: long }, true).status).toBe("failed");
  });

  it("refuses a type named anywhere, including inside the question", () => {
    expect(validateReflection({ ...full, pattern: "Sinu tüüp on selge." }, true).status).toBe("failed");
    expect(validateReflection({ ...full, question: "Kas see arhetüüp sobib?" }, true).status).toBe("failed");
  });

  it("strips dashes from every part, not only the first", () => {
    const r = validateReflection({
      ...full,
      ownWords: "Kirjutasid ise — et miski muutus.",
    }, true);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.parts.ownWords).not.toContain("—");
  });

  it("treats a non-JSON reply as a failure rather than throwing", () => {
    expect(validateReflection(null, true).status).toBe("failed");
  });
});
