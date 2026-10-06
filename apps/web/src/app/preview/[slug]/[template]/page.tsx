import { findTemplate } from "@stayzim/sites";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/site/preview-banner";
import { SuspendedSite } from "@/components/site/site-states";
import { SiteTemplate } from "@/components/site/templates";
import { getSite, withTemplate } from "@/lib/site";

type Props = { params: Promise<{ slug: string; template: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, template: key } = await params;
  const [site, template] = [await getSite(slug), findTemplate(key)];
  const title = site && template ? `Preview: ${site.name} in ${template.name}` : "Preview";
  return { title: { absolute: title }, robots: { index: false, follow: false } };
}

/**
 * A lodge's site in any template, including ones its plan doesn't include, so
 * owners can see what they'd get. Opened in the dashboard's Design screen; it
 * doesn't record visits.
 */
export default async function TemplatePreviewPage({ params }: Props) {
  const { slug, template: key } = await params;
  const template = findTemplate(key);
  const site = await getSite(slug);
  if (!site || !template) notFound();
  if (site.status === "SUSPENDED") return <SuspendedSite name={site.name} />;
  return (
    <>
      <PreviewBanner template={template.name} />
      <SiteTemplate site={withTemplate(site, template)} preview />
    </>
  );
}
