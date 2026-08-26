import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const TITLE = "Invoice Control — Maker/Checker Verification Demo";
const DESCRIPTION =
  "An interactive demonstration of the maker/checker pattern: one process decides an invoice verdict, a second independently re-derives it from the raw data and catches the disagreement.";

/**
 * Absolute base for Open Graph URLs.
 *
 * Vercel injects these at build time, so no manual environment variable is
 * required for deployment. The localhost fallback is development-only — it
 * exists purely so `next build` can resolve relative OG image paths without
 * warning, and is never used in a deployed build.
 */
const productionUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? null;

const metadataBase = productionUrl
  ? new URL(`https://${productionUrl}`)
  : new URL(`http://localhost:${process.env.PORT ?? 3000}`);

export const metadata: Metadata = {
  metadataBase,
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Invoice Control",
  keywords: [
    "maker checker",
    "separation of duties",
    "invoice approval",
    "independent verification",
    "four eyes principle",
    "Next.js",
  ],
  authors: [{ name: "Invoice Control demo" }],
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Invoice Control",
    locale: "en_US",
    // og:image is supplied by app/opengraph-image.tsx, which Next wires up
    // automatically at the correct absolute URL.
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
