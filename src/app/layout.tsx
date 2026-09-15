import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paddock — Collector Car Value Tracker",
  description:
    "Track collector, luxury, and exotic car values like a stock portfolio. Dark, fast, obsession-inducing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${dmSerifDisplay.variable} ${dmSans.variable} font-sans antialiased bg-surface-page text-sand min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
