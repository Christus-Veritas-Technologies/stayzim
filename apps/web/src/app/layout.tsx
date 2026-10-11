import type { Metadata, Viewport } from "next";

import { foundingOpen, monthlyPrice } from "@stayzim/sites";

import "../index.css";
import Providers from "@/components/providers";
import { fontVariables } from "@/lib/fonts";
import { MAIN_URL } from "@/lib/site-host";

const SHARE_CARD = { url: "/og", width: 1200, height: 630, alt: "StayZim: get your lodge a website, built free" };

/** Made with the page, so the price in it turns over at the founding deadline. */
export function generateMetadata(): Metadata {
  const from = `$${monthlyPrice("STARTER", foundingOpen(new Date()))}`;
  const description = `Build your lodge a website free. Pay only when you love it. From ${from}/month.`;
  const shareTitle = `Get your lodge a website from ${from} a month`;
  const shareDescription = "Build it free, then pay only when you love it. Guests book you on WhatsApp and you keep 100%.";
  return {
    // Relative addresses in metadata (the share card, canonicals) are on stayzim.co.zw
    metadataBase: new URL(MAIN_URL),
    title: {
      default: "StayZim: your own lodge website, booked on WhatsApp",
      template: "%s · StayZim",
    },
    description,
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      siteName: "StayZim",
      locale: "en_ZW",
      type: "website",
      url: "/",
      images: [SHARE_CARD],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: [SHARE_CARD],
    },
  };
}

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
