import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { MediaModalProvider } from "@/context/media-modal-context";
import { MediaDetailModal } from "@/components/media-detail-modal";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetStream • Cinema & Serie TV",
  description: "Piattaforma personale cinematografica per esplorare film e serie TV e gestire i download.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NetStream",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0c0d10] text-[#f2f2f5] selection:bg-[#E50914] selection:text-white">
        <QueryProvider>
          <MediaModalProvider>
            {/* Top Notch / Status Bar Safe-Area Shield */}
            <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top,0px)] bg-[#0c0d10] z-50 pointer-events-none" />
            {children}
            <MediaDetailModal />
            <PwaRegister />
          </MediaModalProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
