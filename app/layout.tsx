import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { business } from "@/lib/business";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Monthly Reports · ${business.shortName}`,
  description: `Monthly sales, clients and team reports for ${business.name}.`,
  robots: business.isDemo ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
