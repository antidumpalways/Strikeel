import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRIKEEL - Many Chains. One Equilibrium.",
  description:
    "Cross-chain DeFi exposure and Strike-powered hedge preview. Simulation only.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
