import type { Metadata } from "next";
import localFont from "next/font/local";

import { AuthProvider } from "@/features/auth";
import { StreakCelebrationHost } from "@/features/streaks";

import "./globals.css";

/**
 * Onest and Orbitron are self-hosted rather than pulled through
 * `next/font/google`. The Google loader fetches the font at build time and
 * silently substitutes an Arial-metric fallback when that request fails, which
 * left the whole app — body copy and Orbitron display type alike — rendering
 * as Arial on any offline build. Shipping the woff2 files makes the typography
 * deterministic. Both are variable fonts, so one file covers every weight.
 */
const onest = localFont({
  src: "./fonts/onest-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-onest",
  display: "swap",
});

const orbitron = localFont({
  src: "./fonts/orbitron-latin-variable.woff2",
  weight: "400 900",
  style: "normal",
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StatOz",
  description: "Sports predictions, picks, and games.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${onest.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          {children}
          <StreakCelebrationHost />
        </AuthProvider>
      </body>
    </html>
  );
}
