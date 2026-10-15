import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ashwatch — Keep the watch",
  description: "A cooperative frontier watch. Face the threat, read its intent, and cover your company.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
