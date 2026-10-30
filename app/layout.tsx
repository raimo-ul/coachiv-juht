import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import "./globals.css";
import { getContent } from "@/lib/content";
import { Footer } from "@/components/Footer";

// Self-hosted by next/font at build time: no request to Google from a visitor's
// browser, which keeps the pages free of third-party calls and matches SPEC 2's
// "no analytics or tracking cookies" in spirit as well as in letter.
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
        <Footer />
      </body>
    </html>
  );
}
