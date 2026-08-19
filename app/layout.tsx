import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAM Voting System",
  description: "Check-in and live voting for FAM",
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