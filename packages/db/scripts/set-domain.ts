/**
 * Gives a lodge its own domain, or takes it away. The site then answers on that
 * domain as well as on {slug}.stayzim.co.zw, and the dashboard shows it as the
 * lodge's address. DNS and the certificate are set up separately (docs/deployment.md).
 *
 *   pnpm --filter @stayzim/db set-domain --slug mistvalley --domain mistvalleylodge.co.zw
 *
 * Own domains are for paying lodges (any plan): a .co.zw the owner claimed from
 * the dashboard (free while DOMAIN_STILL_FREE isn't "false"; StayZim registers it),
 * or a domain they have. A claimed one is marked ready by the billing job, which
 * emails the owner.
 *   pnpm --filter @stayzim/db set-domain --slug mistvalley --remove
 *   pnpm --filter @stayzim/db set-domain --list
 */
import { parseArgs } from "node:util";

import { normalizeDomain } from "@stayzim/sites";

import prisma from "../src/index";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    domain: { type: "string" },
    remove: { type: "boolean", default: false },
    // Set it on a lodge that hasn't paid yet anyway
    force: { type: "boolean", default: false },
    list: { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const sitesDomain = (process.env.SITES_DOMAIN ?? "stayzim.co.zw").toLowerCase().replace(/:\d+$/, "");

if (values.list) {
  const lodges = await prisma.lodge.findMany({ where: { customDomain: { not: null } }, select: { slug: true, customDomain: true }, orderBy: { slug: "asc" } });
  console.log(lodges.length === 0 ? "\nNo lodge has its own domain yet.\n" : `\n${lodges.map((lodge) => `${lodge.slug}: ${lodge.customDomain}`).join("\n")}\n`);
  await prisma.$disconnect();
  process.exit(0);
}

const slug = values.slug?.trim().toLowerCase();
if (!slug) fail("Pass --slug, e.g. --slug mistvalley (or --list).");
const lodge = await prisma.lodge.findUnique({ where: { slug }, select: { id: true, name: true, customDomain: true, status: true, plan: true } });
if (!lodge) fail(`No lodge with the slug "${slug}".`);

if (values.remove) {
  if (!lodge.customDomain) fail(`${lodge.name} has no domain of its own.`);
  await prisma.lodge.update({ where: { id: lodge.id }, data: { customDomain: null } });
  console.log(`\n${lodge.name} no longer uses ${lodge.customDomain}. Its site stays at ${slug}.${sitesDomain}.`);
  console.log(`Remove ${lodge.customDomain} from Cloudflare (or Coolify) too.\n`);
  await prisma.$disconnect();
  process.exit(0);
}

const domain = normalizeDomain(values.domain);
if (!domain) fail('Pass --domain with the domain name, e.g. --domain mistvalleylodge.co.zw (or --remove).');
if (domain === sitesDomain || domain.endsWith(`.${sitesDomain}`)) fail(`${domain} is part of ${sitesDomain}; every lodge has that address already.`);
const taken = await prisma.lodge.findUnique({ where: { customDomain: domain }, select: { slug: true } });
if (taken && taken.slug !== slug) fail(`${domain} already belongs to ${taken.slug}.`);

if (lodge.status === "DEMO" && !values.force) {
  fail(`${lodge.name} is still a demo. Own domains come once a plan is paid for (add --force to set it anyway).`);
}

await prisma.lodge.update({ where: { id: lodge.id }, data: { customDomain: domain } });
const claim = await prisma.domainClaim.findUnique({ where: { lodgeId: lodge.id }, select: { domain: true, status: true } });
if (claim?.status === "REQUESTED") {
  if (claim.domain !== domain) console.log(`\nThey claimed ${claim.domain}; their claim now points at ${domain}.`);
  console.log(`\nThey claimed it from the dashboard: the billing job (hourly, or run-billing now) emails them that it's live. WhatsApp them too.`);
}
console.log(`\n${lodge.name} now answers on ${domain} (and www.${domain}), as well as ${slug}.${sitesDomain}.`);
console.log(`
Next, so guests can reach it (details in docs/deployment.md, "Custom domains"):
  1. DNS at the domain's registrar or in Cloudflare:
       ${domain}       CNAME  sites.${sitesDomain}   (or an A record to the server's IP)
       www.${domain}   CNAME  ${domain}
  2. A certificate: add ${domain} as a Custom Hostname in Cloudflare for SaaS,
     or add https://${domain} to the web service's domains in Coolify.
  3. Open https://${domain}: the site shows there within a few minutes.
`);
await prisma.$disconnect();
