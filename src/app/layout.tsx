import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteShell } from "@/components/layout/site-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PlayDuel",
    template: "%s · PlayDuel",
  },
  description:
    "Scegli il gioco. Trova la sfida. Minigiochi nel browser, senza registrazione tradizionale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-background focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
        >
          Vai al contenuto
        </a>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
