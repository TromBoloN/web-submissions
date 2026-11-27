import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

// Only fonts the CSS actually uses (globals.css: --font-geist, --font-geist-mono, --font-space-grotesk).
// Every font registered here is preloaded on every page, so add one only when a style uses it.

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const fontRegistry = {
  geist: {
    label: "Geist",
    font: geist,
  },
  geistMono: {
    label: "Geist Mono",
    font: geistMono,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontVars = Object.values(fontRegistry)
  .map(({ font }) => font.variable)
  .join(" ");

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
