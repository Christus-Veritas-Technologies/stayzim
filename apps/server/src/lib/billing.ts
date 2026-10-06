import prisma from "@stayzim/db";
import { sendEmail } from "@stayzim/mail";
import { demoWelcomeEmail } from "@stayzim/mail/templates";
import { formatCents, formatHarareDateTime, planPriceCents, PLANS_LABEL } from "@stayzim/sites";

import { DASHBOARD_URL, siteUrlFor } from "./sites";

/** Sends an email without letting a mail failure break the request that caused it. */
export async function sendQuietly(email: Parameters<typeof sendEmail>[0], what: string) {
  await sendEmail(email).catch((error: unknown) => {
    console.error(`[mail] Could not send ${what} to ${email.to}: ${error instanceof Error ? error.message : String(error)}`);
  });
}

/** Right after an owner makes their demo at /start: the welcome email with their link. */
export async function onDemoCreated(lodgeId: string) {
  const lodge = await prisma.lodge.findUniqueOrThrow({
    where: { id: lodgeId },
    select: { name: true, slug: true, customDomain: true, plan: true, demoEndsAt: true, owner: { select: { name: true, email: true } } },
  });
  await sendQuietly(
    demoWelcomeEmail({
      to: lodge.owner.email,
      name: lodge.owner.name,
      lodgeName: lodge.name,
      siteUrl: siteUrlFor(lodge),
      dashboardUrl: DASHBOARD_URL,
      plan: PLANS_LABEL[lodge.plan],
      price: formatCents(planPriceCents(lodge.plan)),
      endsAt: lodge.demoEndsAt ? formatHarareDateTime(lodge.demoEndsAt) : "in 2 days",
    }),
    "the welcome email",
  );
}
