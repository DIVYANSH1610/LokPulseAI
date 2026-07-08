// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { AssistantContextProvider } from "@/lib/assistant-context";
import { AuthProvider } from "@/lib/auth-context"; // Import the AuthProvider
import { AskAI } from "@/components/AskAI";

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
        {/* AuthProvider wraps everything so useAuth works on all pages */}
        <AuthProvider>
          <LanguageProvider>
            <AssistantContextProvider>
              {children}
              <AskAI />
            </AssistantContextProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}