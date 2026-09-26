import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AAI JE Operations 2026 — CBT Preparation", template: "%s · AAI JE Operations" },
  description: "Full-length mocks, previous papers, subject and topic practice, and progress tracking for the AAI Junior Executive (Operations) CBT.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#070C18", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
