import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blindspot",
  description: "The eval-gated model & cost layer for AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
