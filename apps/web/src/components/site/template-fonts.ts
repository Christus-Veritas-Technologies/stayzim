import { Bricolage_Grotesque, Cormorant_Garamond, Gloock, Hanken_Grotesk, Instrument_Serif, Newsreader, Tenor_Sans, Urbanist } from "next/font/google";

/*
 * The lodge templates' own typefaces, from designs/StayZim Lodge Templates.html.
 * Not preloaded: a lodge page only downloads the faces its template uses, so a
 * site doesn't pay for the other eight designs. Instrument Sans and Newsreader
 * come from the app's fonts (lib/fonts.ts).
 */

/** Veranda and Shoreline */
export const urbanist = Urbanist({ variable: "--font-urbanist", subsets: ["latin"], preload: false, display: "swap" });

/** Rondavel */
export const hankenGrotesk = Hanken_Grotesk({ variable: "--font-hanken-grotesk", subsets: ["latin"], preload: false, display: "swap" });

/** Wordmark */
export const bricolageGrotesque = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], preload: false, display: "swap" });

/** Overlap */
export const gloock = Gloock({ variable: "--font-gloock", subsets: ["latin"], weight: "400", preload: false, display: "swap" });

/** Escarpment */
export const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
});

/** Courtyard */
export const tenorSans = Tenor_Sans({ variable: "--font-tenor", subsets: ["latin"], weight: "400", preload: false, display: "swap" });

/** Canopy */
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  preload: false,
  display: "swap",
});

/** Shade: Newsreader's regular weight (the app loads only its semibold) */
export const newsreaderBook = Newsreader({ variable: "--font-newsreader-book", subsets: ["latin"], weight: ["400", "500"], preload: false, display: "swap" });
