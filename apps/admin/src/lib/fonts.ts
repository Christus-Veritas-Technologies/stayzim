import { Familjen_Grotesk, Instrument_Sans } from "next/font/google";

/** The app's fonts, the same as the web app's (lib/fonts.ts there). */
const familjenGrotesk = Familjen_Grotesk({ variable: "--font-familjen-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });
const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });

export const fontVariables = `${familjenGrotesk.variable} ${instrumentSans.variable}`;
