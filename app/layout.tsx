import type { Metadata } from "next";
import { IBM_Plex_Mono, Inria_Serif, Playfair_Display, Poppins } from "next/font/google";
import { SiteBar } from "@/components/ui/SiteBar";
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

// The site bar's fonts, matching caitlynfeletar.com.
const inria = Inria_Serif({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-inria",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: `Monthly Reports · ${business.shortName}`,
  description: `Monthly sales, clients and team reports for ${business.name}.`,
  robots: business.isDemo ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable} ${inria.variable} ${plexMono.variable}`}>
      <body>
        {business.isDemo && <SiteBar />}
        {children}
      </body>
    </html>
  );
}
