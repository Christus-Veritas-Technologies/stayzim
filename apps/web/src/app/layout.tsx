import type { Metadata, Viewport } from "next";

import "../index.css";
import Providers from "@/components/providers";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: {
    default: "StayZim: your own lodge website, booked on WhatsApp",
    template: "%s · StayZim",
  },
  description:
    "Stop paying 20% to Booking.com. StayZim builds your lodge its own website where guests book you directly on WhatsApp. Made in Mutare for Zimbabwean lodges. 14 days free.",
  openGraph: {
    title: "StayZim: your own lodge website",
    description: "Your own lodge website. Guests book on WhatsApp. 0% commission.",
    siteName: "StayZim",
    locale: "en_ZW",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#007DA2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontVariables} bg-white font-sans text-ink antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
