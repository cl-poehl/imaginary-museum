import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "The Imaginary Museum", template: "%s · The Imaginary Museum" },
  description:
    "A museum you walk through in 3D, from Ice Age carvings to the first abstract paintings, that learns your taste and hangs a room for you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <SiteHeader />
        {children}
        <footer className="label flex justify-center gap-6 px-4 pt-6 pb-8 text-faint">
          <span>Images from Wikimedia Commons</span>
          <Link href="/privacy" className="transition-colors hover:text-fg">
            Privacy
          </Link>
        </footer>
      </body>
    </html>
  );
}
