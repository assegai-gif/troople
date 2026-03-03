import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Troople",
  description: "Guess the country from military troop strength data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
