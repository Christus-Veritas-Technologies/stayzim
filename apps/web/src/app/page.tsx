import type { Metadata } from "next";

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

export default function Home() {
  return (
    <>
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
    </>
  );
}
