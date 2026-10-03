import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Saurabh Pandey — Full-Stack Developer",
  description:
    "Saurabh Pandey is an entry-level full-stack developer building responsive web applications and robust APIs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable} ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
