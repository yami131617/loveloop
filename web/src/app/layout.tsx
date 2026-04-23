import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CallProvider } from "@/components/CallProvider";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "LoveLoop — match · chat · play · level up",
  description: "Gen Z dating built on connection, not just looks. Match through interests, grow with mini-games, level up your bond.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a0e2e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="antialiased">
        <CallProvider>
          <main className="app-content min-h-screen">{children}</main>
        </CallProvider>
      </body>
    </html>
  );
}
