import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI War - One feed for every frontier lab",
  description: "A curated intelligence feed for major AI lab updates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
