import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import "./globals.css";

// Display serif for names and prices — a Didone, the typographic signature of
// luxury editorial. Variable optical size keeps hairlines crisp at 72px and
// legible at 20px.
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Geometric sans for UI and tracked capitals
const jost = Jost({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paddock — Collector Car Value Tracker",
  description:
    "From the poster on your wall to the keys in your hand. Follow the collector cars you've always wanted, know what they're really worth, and watch the ones you own like a portfolio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Font variables live on <html> so the theme's :root font stacks can
  // reference them (a var() to an undefined property invalidates the value).
  return (
    <html lang="en" className={`${bodoni.variable} ${jost.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased bg-surface-page text-sand min-h-screen">
        {children}
      </body>
    </html>
  );
}
