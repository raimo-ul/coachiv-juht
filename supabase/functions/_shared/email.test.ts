import { describe, expect, it } from "vitest";
import { esc, renderEmail } from "./email.ts";
import { getContent } from "./content.ts";

const t = getContent("et");

describe("esc", () => {
  it("escapes the characters that would break out of an attribute or a tag", () => {
    expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#039;");
  });

  it("renders null and undefined as nothing", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("renderEmail", () => {
  const footer = t.emails.footer;

  it("turns {reportButton:Label} into a link in both versions", () => {
    const out = renderEmail(
      { subject: "S", lines: ["Tere!", "{reportButton:Ava raport}"] },
      { links: { report: "https://example.test/raport/abc" }, footer },
    );

    expect(out.html).toContain("https://example.test/raport/abc");
    expect(out.html).toContain("Ava raport");
    expect(out.text).toContain("Ava raport: https://example.test/raport/abc");
  });

  it("drops a button whose link was not supplied rather than linking nowhere", () => {
    const out = renderEmail(
      { subject: "S", lines: ["Tere!", "{reportButton:Ava raport}"] },
      { links: {}, footer },
    );

    expect(out.html).not.toContain("Ava raport");
    expect(out.html).toContain("Tere!");
  });

  it("escapes text coming from content", () => {
    const out = renderEmail(
      { subject: "S", lines: ["5 < 6 & nii edasi"] },
      { links: {}, footer },
    );
    expect(out.html).toContain("5 &lt; 6 &amp; nii edasi");
    // The plain-text version is not HTML and keeps the characters as written.
    expect(out.text).toContain("5 < 6 & nii edasi");
  });

  it("carries the real report letter end to end", () => {
    const out = renderEmail(
      { subject: t.emails.report.subject, lines: t.emails.report.body },
      { links: { report: "https://example.test/raport/tok" }, footer },
    );

    expect(out.subject).toBe("Sinu coachiva juhi test");
    expect(out.html).toContain("Tere!");
    expect(out.html).toContain("Raimo");
    expect(out.html).toContain(footer);
    expect(out.text).toContain(footer);
    // The button placeholder itself must never reach a reader.
    expect(out.html).not.toContain("{reportButton");
    expect(out.text).not.toContain("{reportButton");
  });
});
