import type { Config } from "tailwindcss";

// Tailwind 3.4, the same version as radical-simplicity and attfocus-v2.
//
// Lovable emits Tailwind 3 with a config in this shape, so a design built there
// drops in here with its class names intact instead of needing a translation
// pass. That is the whole reason this project uses Tailwind at all.
//
// Colours are declared as HSL channel triplets in CSS variables and read back
// through hsl(var(--x)), which is the convention the sibling projects use and
// the one shadcn components expect. The values themselves live in globals.css.

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        heading: ["var(--font-head)", '"Bebas Neue"', "sans-serif"],
        body: ["var(--font-body)", '"DM Sans"', "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      // Sharp corners are a brand rule, not a default to be overridden here and
      // there. Everything resolves to 0 unless something asks for a pill.
      borderRadius: {
        none: "0",
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        full: "9999px",
      },
      maxWidth: {
        measure: "34rem",   // a comfortable line length for body text
      },
    },
  },
  plugins: [],
} satisfies Config;
