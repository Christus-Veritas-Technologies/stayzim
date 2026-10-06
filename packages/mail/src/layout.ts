/** The shared email frame and pieces, used by every template. */

export const BRAND = "#007DA2";
export const INK = "#0C181F";
export const MUTED = "#4F5A60";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * The StayZim email frame: wordmark, white card, footer. Inline styles and
 * tables only, since most mail clients drop <style> blocks and flexbox.
 */
export function layout({ preview, body }: { preview: string; body: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>StayZim</title>
</head>
<body style="margin:0;padding:0;background:#F4F7F9;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F9;padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding:0 4px 20px;font-size:22px;font-weight:700;color:${BRAND};letter-spacing:-0.01em">StayZim</td></tr>
      <tr><td style="background:#FFFFFF;border:1px solid #E4E9EC;border-radius:16px;padding:32px 28px;font-size:16px;line-height:24px">
        ${body}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-size:13px;line-height:20px;color:#6C767D">
        Lodge websites with booking on WhatsApp. Made in Mutare.<br>
        Questions? Reply to this email or message us on WhatsApp.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:999px;background:${BRAND}">
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export function greeting(name: string) {
  return `<p style="margin:0 0 16px">Hi ${escapeHtml(name.split(" ")[0] || name)},</p>`;
}
