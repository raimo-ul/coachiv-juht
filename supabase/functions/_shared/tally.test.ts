import { describe, expect, it } from "vitest";
import { signForTest, verifyTallySignature } from "./tally.ts";

const SECRET = "test-signing-secret";
const BODY = JSON.stringify({ eventId: "e1", data: { responseId: "r1" } });

describe("verifyTallySignature", () => {
  it("accepts a signature it produced itself", async () => {
    const sig = await signForTest(SECRET, BODY);
    expect(await verifyTallySignature(BODY, sig, SECRET)).toBe(true);
  });

  it("produces base64, not hex", async () => {
    // Stripe's digest is hex. Tally's is base64, and reusing the Stripe
    // comparison here would have rejected every real request.
    const sig = await signForTest(SECRET, BODY);
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(sig).not.toMatch(/^[0-9a-f]{64}$/);
  });

  it("signs the body alone, with no timestamp", async () => {
    // If a timestamp were part of the signed string, the same body would sign
    // differently from one second to the next.
    const a = await signForTest(SECRET, BODY);
    const b = await signForTest(SECRET, BODY);
    expect(a).toBe(b);
  });

  it("rejects a body that changed by one character", async () => {
    const sig = await signForTest(SECRET, BODY);
    expect(await verifyTallySignature(BODY.replace("r1", "r2"), sig, SECRET)).toBe(false);
  });

  it("rejects a signature made with another secret", async () => {
    const sig = await signForTest("someone-elses-secret", BODY);
    expect(await verifyTallySignature(BODY, sig, SECRET)).toBe(false);
  });

  it("rejects a missing or empty header", async () => {
    expect(await verifyTallySignature(BODY, null, SECRET)).toBe(false);
    expect(await verifyTallySignature(BODY, "", SECRET)).toBe(false);
  });

  it("ignores whitespace around the header value", async () => {
    const sig = await signForTest(SECRET, BODY);
    expect(await verifyTallySignature(BODY, `  ${sig}\n`, SECRET)).toBe(true);
  });

  it("throws when the secret is missing rather than letting anything through", async () => {
    await expect(verifyTallySignature(BODY, "anything", undefined)).rejects.toThrow(
      "TALLY_SIGNING_SECRET",
    );
  });
});
