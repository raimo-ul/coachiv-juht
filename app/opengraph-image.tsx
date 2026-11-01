import { ImageResponse } from "next/og";
import { getContent } from "@/lib/content";

/**
 * The picture that appears when someone shares a link in Slack or LinkedIn.
 *
 * Until 01.11 there was none, so a shared link rendered as an empty grey box.
 * Generated rather than drawn by hand so the words come from content/et.json
 * and cannot drift from the page they advertise.
 *
 * Built on the brand the site already uses: white ground, the signal square in
 * its hairline rule, near-black type. No fonts are loaded here. next/og would
 * need the font as bytes and the CSP that protects the published pages blocks
 * fetching one, so this uses the renderer's default face. The mark and the
 * palette carry the identity; a wrong headline face would carry less than
 * none.
 */
export const alt = "Coachiva juhi test";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const t = getContent();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFFFF",
          padding: 72,
          border: "3px solid #2B2B2B",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#00FA96",
              border: "3px solid #0F0F0F",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#6A6862",
            }}
          >
            {t.home.eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 96,
              lineHeight: 1.02,
              fontWeight: 700,
              color: "#0F0F0F",
              letterSpacing: -2,
            }}
          >
            {t.meta.siteName}
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.35, color: "#0F0F0F", maxWidth: 880 }}>
            {t.home.smallLine}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#6A6862" }}>
          {t.footer.brand}
        </div>
      </div>
    ),
    size,
  );
}
