import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";

// NOTE: this build environment has no network access to Google Fonts, so
// the IBM Plex / Source Serif fonts are defined as CSS font-family stacks
// in globals.css instead of via next/font/google. The <link> tags below
// load the actual font files client-side via the Google Fonts CDN instead
// — this works regardless of next/font availability and additionally
// covers Noto Sans Devanagari, needed for Hindi (see lib/i18n/languages.ts
// for why each script needs its own typeface). If your deploy environment
// has internet access at build time, you can swap the Latin faces for
// next/font/google for self-hosted, zero-layout-shift loading — the
// --font-plex-sans / --font-plex-mono / --font-source-serif variable names
// are already wired through globals.css and Tailwind's theme either way.

export const metadata: Metadata = {
  title: "LokPulse AI — Development Intelligence Engine",
  description:
    "AI-powered civic issue intelligence for MPs, MLAs, and district administration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:wght@500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
