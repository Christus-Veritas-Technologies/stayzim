import type { Email } from "./index";

import { button, greeting, heading, layout, linkFallback, MUTED, small } from "./layout";

export * from "./billing";
export * from "./bookings";

export function resetPasswordEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  return {
    to,
    subject: "Reset your StayZim password",
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password for your StayZim account. Open this link to choose a new password:",
      "",
      url,
      "",
      "The link works for 1 hour. If you did not ask for this, you can ignore this email; your password stays the same.",
    ].join("\n"),
    html: layout({
      preview: "Choose a new password for your StayZim account.",
      body: `${heading("Choose a new password")}
${greeting(name)}
<p style="margin:0">Someone asked to reset the password for your StayZim account. Tap the button to choose a new one.</p>
${button(url, "Choose a new password")}
${small("The link works for 1 hour. If you did not ask for this, you can ignore this email; your password stays the same.")}
${linkFallback(url)}`,
    }),
  };
}

export function passwordChangedEmail({ to, name }: { to: string; name: string }): Email {
  return {
    to,
    subject: "Your StayZim password was changed",
    text: [
      `Hi ${name},`,
      "",
      "The password for your StayZim account was just changed.",
      "",
      "If this was you, there is nothing to do. If it was not, reset your password straight away and message us on WhatsApp.",
    ].join("\n"),
    html: layout({
      preview: "The password for your StayZim account was just changed.",
      body: `${heading("Your password was changed")}
${greeting(name)}
<p style="margin:0 0 16px">The password for your StayZim account was just changed.</p>
<p style="margin:0;color:${MUTED}">If this was you, there is nothing to do. If it was not, reset your password straight away and message us on WhatsApp.</p>`,
    }),
  };
}
