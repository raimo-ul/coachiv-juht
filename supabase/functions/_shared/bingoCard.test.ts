import { describe, expect, it } from "vitest";
import { renderCard, type CardAnswers, type CardContent } from "./bingoCard.ts";
import { BINGO_TYPES } from "./bingo.ts";
import { getContent } from "./content.ts";

const c = getContent().bingo as unknown as CardContent;

const base: CardAnswers = {
  markedIndexes: [0, 1, 4, 5, 6, 8],
  marked: 6,
  type: "POHJAPODER",
  proud: "Sain projekti lõpuni.",
  endings: ["ma olin väsinud", "", "see läheb mööda"],
};

describe("renderCard", () => {
  it("renders every type without throwing", () => {
    for (const type of BINGO_TYPES) {
      const out = renderCard(c, { ...base, type });
      expect(out.html).toContain(c.types[type].tagline);
      expect(out.text).toContain(c.types[type].gift);
    }
  });

  it("marks exactly the squares that were ticked", () => {
    const out = renderCard(c, base);
    // Six ticks for six squares, and the three untouched ones carry none.
    expect(out.html.split("&#10003;").length - 1).toBe(6);
    for (const i of base.markedIndexes) expect(out.html).toContain(c.squares[i].keyword);
  });

  it("leaves out the quote block when the pride answer is empty", () => {
    const out = renderCard(c, { ...base, proud: "   " });
    expect(out.html).not.toContain(c.card.ownWords);
    // The rest of the card is still there.
    expect(out.html).toContain(c.card.gift);
  });

  it("prints only the sentence endings that were filled in", () => {
    const out = renderCard(c, base);
    expect(out.html).toContain("ma olin väsinud");
    expect(out.html).toContain("see läheb mööda");
    expect(out.html).toContain(c.card.starters[0]);
    expect(out.html).not.toContain(c.card.starters[1]);
  });

  it("leaves out the whole block when no ending was filled in", () => {
    const out = renderCard(c, { ...base, endings: ["", "", ""] });
    expect(out.html).not.toContain(c.card.wordsToSelf);
  });

  it("escapes what the respondent wrote", () => {
    // Their words go into HTML. A stray tag must not become markup.
    const out = renderCard(c, { ...base, proud: '<script>alert(1)</script> & <b>paks</b>' });
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
    expect(out.html).toContain("&amp;");
  });

  it("shows the share address as text, because an email cannot copy", () => {
    const out = renderCard(c, base);
    const url = c.card.shareUrl;
    // Once in the button href, once as readable text, once in the plain part.
    expect(out.html.split(url).length - 1).toBeGreaterThanOrEqual(3);
    expect(out.text).toContain(url);
  });

  it("marks the reader's own type in the list of four", () => {
    const out = renderCard(c, base);
    expect(out.html).toContain(c.card.you);
    expect(out.html.split(c.card.you).length - 1).toBe(1);
  });

  it("puts the score in words next to the number", () => {
    expect(renderCard(c, base).html).toContain(c.card.scoreSuffix.toUpperCase());
    expect(renderCard(c, { ...base, marked: 0, markedIndexes: [], type: "LUMEHELVES" }).text)
      .toContain(`0 ${c.card.scoreSuffix}`);
  });
});
