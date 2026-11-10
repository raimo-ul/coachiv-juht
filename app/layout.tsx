import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getContent } from "@/lib/content";

// Self-hosted by next/font at build time, so a visitor's browser makes no
// request to Google. Vercel Analytics is the one third-party call the pages
// make, and it sets no cookie; see DECISIONS.md 10.11.
const head = Bebas_Neue({
  weight: "400",
  subsets: ["latin-ext"],   // latin-ext carries ä, õ, ü, š, ž
  variable: "--font-head",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const t = getContent();

export const metadata: Metadata = {
  title: t.meta.siteName,
  description: t.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et" className={`${head.variable} ${body.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
