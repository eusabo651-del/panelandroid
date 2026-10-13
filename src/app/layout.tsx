import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "PURPOU AUXÍLIO DE MIRA",
  description: "Painel PWA de acesso e auxílio de mira da PURPOU.",
  manifest: "/manifest.json",
  applicationName: "PURPOU AUXÍLIO DE MIRA",
  icons: {
    icon: [
      { url: "/icons/purpou-crown-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/purpou-crown-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/purpou-crown-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PURPOU AUXÍLIO" },
};
export const viewport: Viewport = { themeColor: "#08060d", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: "if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); }); }" }} />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden">{children}<PWAInstallPrompt /></body>
    </html>
  );
}
