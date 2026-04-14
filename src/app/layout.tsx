import type { Metadata } from "next";
import { Special_Elite, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const specialElite = Special_Elite({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShareSharp",
  description:
    "Send any file with a self-destructing link. No account needed.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${specialElite.variable} ${ibmPlexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
