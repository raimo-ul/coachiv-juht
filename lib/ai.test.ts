import { describe, expect, it } from "vitest";
import { stripDashes, validateParagraph } from "@/lib/ai";

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
