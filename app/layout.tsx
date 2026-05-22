import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Remate",
  description: "Gestisci le tue lezioni di padel",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0e1117" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Script inline che applica il tema PRIMA del rendering */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('clubTheme') || 'dark';
              var color = localStorage.getItem('clubColor') || '#c8f53a';
              var bg    = theme === 'light' ? '#f0ede8' : '#0e1117';
              document.documentElement.style.background = bg;
              document.documentElement.style.setProperty('--pc', color);
              document.documentElement.style.setProperty('--bg', bg);
            } catch(e) {}
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        style={{ margin: 0, padding: 0 }}
      >
        {children}
      </body>
    </html>
  );
}