import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASTRA NOCTIS｜星喰いの叙事詩",
  description: "七つの王国を巡る、長編ダークファンタジー3D RPG。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "ASTRA NOCTIS｜星喰いの叙事詩",
    description: "七つの王国を巡る、長編ダークファンタジー3D RPG。",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "ASTRA NOCTIS 星喰いの叙事詩" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASTRA NOCTIS｜星喰いの叙事詩",
    description: "七つの王国を巡る、長編ダークファンタジー3D RPG。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
