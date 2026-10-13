import type { Metadata, Viewport } from "next";

import "../index.css";
import Providers from "@/components/providers";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "StayZim admin", template: "%s · StayZim admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#007DA2", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} bg-surface-2 font-sans text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
