import type { Metadata, Viewport } from "next";

import "../index.css";
import Providers from "@/components/providers";
import { fontVariables } from "@/lib/fonts";
import { MAIN_URL } from "@/lib/site-host";

const SHARE_CARD = { url: "/og", width: 1200, height: 630, alt: "StayZim: your own lodge website, booked on WhatsApp" };

export const metadata: Metadata = {
  // Relative addresses in metadata (the share card, canonicals) are on stayzim.co.zw
  metadataBase: new URL(MAIN_URL),
  title: {
    default: "StayZim: your own lodge website, booked on WhatsApp",
    template: "%s · StayZim",
  },
  description:
    "Stop paying 20% to Booking.com. StayZim builds your lodge its own website where guests book you directly on WhatsApp. Made in Mutare for Zimbabwean lodges, guesthouses and holiday homes. Live in about a minute, free for 2 days.",
  openGraph: {
    title: "StayZim: your own lodge website",
    description: "Your own lodge website. Guests book on WhatsApp. 0% commission.",
    siteName: "StayZim",
    locale: "en_ZW",
    type: "website",
    url: "/",
    images: [SHARE_CARD],
  },
  twitter: {
    card: "summary_large_image",
    title: "StayZim: your own lodge website",
    description: "Your own lodge website. Guests book on WhatsApp. 0% commission.",
    images: [SHARE_CARD],
  },
};

export const viewport: Viewport = {
  themeColor: "#007DA2",
  // Pages reach under the iPhone notch and home bar; bottom bars pad themselves
  // with env(safe-area-inset-bottom), and the body keeps text off the notch sideways
  viewportFit: "cover",
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
