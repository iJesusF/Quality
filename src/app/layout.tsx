import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VORTECH Quality",
  description: "Control de calidad y trazabilidad para construcción industrial.",
  applicationName: "VORTECH Quality",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "VORTECH Quality" },
};

export const viewport: Viewport = {
  themeColor: "#1261a6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
