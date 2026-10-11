import type { Metadata } from "next";

import { FoundingProvider } from "@/components/founding";
import { DemoLodges } from "@/components/landing/demo-lodges";
import { FinalCta } from "@/components/landing/final-cta";
import { FloatingWhatsApp } from "@/components/landing/floating-whatsapp";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Maths } from "@/components/landing/maths";
import { Nav } from "@/components/landing/nav";
import { PageView } from "@/components/landing/page-view";
import { Pricing } from "@/components/landing/pricing";
import { Questions } from "@/components/landing/questions";
import { MetaPixel } from "@/components/meta-pixel";
import { jsonLd, stayzimStructuredData } from "@/lib/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Made again every minute, so the prices on it turn over at the founding deadline
export const revalidate = 60;

export default function Home() {
  return (
    <FoundingProvider serverNow={Date.now()}>
      {/* eslint-disable-next-line react/no-danger -- our own JSON, with "<" escaped */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(stayzimStructuredData()) }} />
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <DemoLodges />
        <Maths />
        <Pricing />
        <Questions />
        <FinalCta />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <PageView />
      <MetaPixel />
    </FoundingProvider>
  );
}
