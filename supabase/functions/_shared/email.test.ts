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
      { links: { report: "https://example.test/raport/abc" }, footer, siteName: "Coachiva juhi test" },
    );

    expect(out.html).toContain("https://example.test/raport/abc");
    expect(out.html).toContain("Ava raport");
    expect(out.text).toContain("Ava raport: https://example.test/raport/abc");
  });

  it("drops a button whose link was not supplied rather than linking nowhere", () => {
    const out = renderEmail(
      { subject: "S", lines: ["Tere!", "{reportButton:Ava raport}"] },
      { links: {}, footer, siteName: "Coachiva juhi test" },
    );

    expect(out.html).not.toContain("Ava raport");
    expect(out.html).toContain("Tere!");
  });

  it("escapes text coming from content", () => {
    const out = renderEmail(
      { subject: "S", lines: ["5 < 6 & nii edasi"] },
      { links: {}, footer, siteName: "Coachiva juhi test" },
    );
    expect(out.html).toContain("5 &lt; 6 &amp; nii edasi");
    // The plain-text version is not HTML and keeps the characters as written.
    expect(out.text).toContain("5 < 6 & nii edasi");
  });

  it("carries the real report letter end to end", () => {
    const out = renderEmail(
      { subject: t.emails.report.subject, lines: t.emails.report.body },
      { links: { report: "https://example.test/raport/tok" }, footer, siteName: "Coachiva juhi test" },
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

// The last day's letter, which is the only one that carries two links. Lifted
// from AttFocus's dispatch-daily-links, where the self-assessment goes out
// alongside the normal daily link on the final workday of a period.
describe("the last day's letter", () => {
  const footer = t.emails.footer;
  const d = t.emails.daily;

  const lastDay = (links: Record<string, string>) =>
    renderEmail(
      {
        subject: "S",
        lines: [d.lead, `{dayButton:${d.button}}`, d.saTitle, d.saBody, `{saButton:${d.saButton}}`],
      },
      { links, footer, siteName: "Coachiva juhi test" },
    );

  it("carries both the day link and the self-assessment link", () => {
    const out = lastDay({
      day: "https://example.test/v/signed",
      sa: "https://example.test/hinnang/tok",
    });

    expect(out.html).toContain("https://example.test/v/signed");
    expect(out.html).toContain("https://example.test/hinnang/tok");
    expect(out.html).toContain("Täida enesehindamine");
    expect(out.html).toContain("viimane päev");
    // Both reachable without HTML, because some people read the text part.
    expect(out.text).toContain("https://example.test/hinnang/tok");
  });

  it("puts the day's own button first", () => {
    const out = lastDay({
      day: "https://example.test/v/signed",
      sa: "https://example.test/hinnang/tok",
    });

    expect(out.html.indexOf("/v/signed")).toBeLessThan(out.html.indexOf("/hinnang/tok"));
  });

  it("drops the self-assessment line rather than linking nowhere when the token is missing", () => {
    // dispatch-daily logs and sends without the link if the token could not be
    // minted. The letter has to stay readable and the day still answerable.
    const out = lastDay({ day: "https://example.test/v/signed" });

    expect(out.html).toContain("https://example.test/v/signed");
    expect(out.html).not.toContain("Täida enesehindamine");
  });
});

// The newsletter in the final letter. It sits after the existing invitation to
// write back, which means one short letter now carries two different asks; the
// order matters and is Raimo's call, so it is pinned here.
describe("the final letter's newsletter line", () => {
  it("renders both buttons, report first", () => {
    const out = renderEmail(
      { subject: t.emails.final.subject, lines: t.emails.final.body },
      {
        links: { final: "https://example.test/lopp/tok", newsletter: "https://example.test/uudiskiri" },
        footer: t.emails.footer,
        siteName: "Coachiva juhi test",
      },
    );

    expect(out.html).toContain("https://example.test/lopp/tok");
    expect(out.html).toContain("https://example.test/uudiskiri");
    expect(out.html.indexOf("/lopp/tok")).toBeLessThan(out.html.indexOf("/uudiskiri"));
    expect(out.text).toContain("https://example.test/uudiskiri");
  });

  it("still sends a readable letter when the newsletter link is missing", () => {
    // A missing link drops its button rather than linking nowhere, and the
    // report, which is what the letter is actually for, has to survive that.
    const out = renderEmail(
      { subject: t.emails.final.subject, lines: t.emails.final.body },
      { links: { final: "https://example.test/lopp/tok" }, footer: t.emails.footer, siteName: "x" },
    );

    expect(out.html).toContain("https://example.test/lopp/tok");
    expect(out.html).not.toContain("Liitu uudiskirjaga");
  });
});
