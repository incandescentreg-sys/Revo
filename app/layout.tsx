import Script from "next/script";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Toasts } from "@/components/Toasts";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "REVO — твой личный трекер",
  description: "REVO — персональный трекер привычек и самодисциплины. Приватно."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0e1420"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body className="min-h-screen antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <AppProvider>
          <Toasts />
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}