import type { Email } from "./index";

import { button, escapeHtml, greeting, heading, INK, layout, small, summary, summaryText } from "./layout";

type Claim = { lodgeName: string; domain: string; readyBy: string };

/** To the owner, straight after they claim their free .co.zw. */
export function domainClaimedEmail(input: Claim & { to: string; name: string; dashboardUrl: string }): Email {
  const lead = `We're registering ${input.domain} for ${input.lodgeName} and pointing it at your site. It's ready within 72 hours; we'll WhatsApp and email you the moment it's live.`;
  const rows: [string, string][] = [
    ["Domain", input.domain],
    ["Ready by", input.readyBy],
    ["Cost", "Free with your plan"],
  ];
  return {
    to: input.to,
    subject: `${input.domain} is on its way`,
    text: [
      `Hi ${input.name.split(" ")[0]},`,
      "",
      lead,
      "",
      ...summaryText(rows),
      "",
      "Your stayzim.co.zw address keeps working, so links you've shared won't break. If the name is taken, we'll message you with options.",
      "",
      input.dashboardUrl,
    ].join("\n"),
    html: layout({
      preview: `Ready within 72 hours: we'll WhatsApp and email you when ${input.domain} is live.`,
      label: "Your domain",
      body: `${heading("Your domain is on its way")}
${greeting(input.name)}
<p style="margin:0">${escapeHtml(lead)}</p>
${summary(rows)}
${small("Your stayzim.co.zw address keeps working, so links you've shared won't break. If the name is taken, we'll message you with options.")}
${button(input.dashboardUrl, "Open your dashboard", "outline")}`,
    }),
  };
}

/** To StayZim (hello@): a domain to register and set up. */
export function domainClaimTeamEmail(input: Claim & { to: string; slug: string; plan: string; ownerName: string; ownerEmail: string; whatsapp: string | null }): Email {
  const rows: [string, string][] = [
    ["Domain", input.domain],
    ["Lodge", `${input.lodgeName} (${input.slug})`],
    ["Plan", input.plan],
    ["Owner", `${input.ownerName}, ${input.ownerEmail}`],
    ["WhatsApp", input.whatsapp ?? "Not given"],
    ["Promised by", input.readyBy],
  ];
  const command = `pnpm --filter @stayzim/db set-domain --slug ${input.slug} --domain ${input.domain}`;
  return {
    to: input.to,
    subject: `Domain claim: ${input.domain} for ${input.lodgeName}`,
    text: [
      `${input.lodgeName} claimed a free domain. Register it, then run:`,
      "",
      command,
      "",
      ...summaryText(rows),
      "",
      "The owner is emailed within the hour once set-domain has run. WhatsApp them too.",
    ].join("\n"),
    html: layout({
      preview: `Register ${input.domain} by ${input.readyBy}.`,
      label: "Team",
      body: `${heading("A domain to set up")}
<p style="margin:0">${escapeHtml(input.lodgeName)} claimed a free domain. Register it, then run set-domain:</p>
${summary(rows)}
<p style="margin:16px 0 0;padding:12px 14px;background:${INK};border-radius:12px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:19px;color:#FFFFFF;word-break:break-all">${escapeHtml(command)}</p>
${small("The owner is emailed within the hour once set-domain has run. WhatsApp them too.")}`,
    }),
  };
}

/** To the owner, once StayZim has set the domain up. */
export function domainReadyEmail(input: { to: string; name: string; lodgeName: string; domain: string }): Email {
  const url = `https://${input.domain}`;
  const lead = `${input.lodgeName} is live on ${input.domain}. Share it with guests; your stayzim.co.zw address still works and opens the same site.`;
  return {
    to: input.to,
    subject: `${input.domain} is live`,
    text: [`Hi ${input.name.split(" ")[0]},`, "", lead, "", url].join("\n"),
    html: layout({
      preview: `${input.lodgeName} is live on ${input.domain}.`,
      label: "Your domain",
      body: `${heading("Your domain is live")}
${greeting(input.name)}
<p style="margin:0">${escapeHtml(lead)}</p>
${button(url, `Open ${input.domain}`)}`,
    }),
  };
}
