import { Familjen_Grotesk, Instrument_Sans, Newsreader } from "next/font/google";

/** The app's fonts, loaded once here for the root layout and the global error page. */
const familjenGrotesk = Familjen_Grotesk({
  variable: "--font-familjen-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

// Lodge names on the sample lodge sites
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["600"],
});

/** Classes for <body> that define the font CSS variables. */
export const fontVariables = `${familjenGrotesk.variable} ${instrumentSans.variable} ${newsreader.variable}`;
