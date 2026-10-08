/**
 * The shared email frame and parts, used by every template. Narrow (480px)
 * and nearly edge to edge on phones, in StayZim's colours and type, with the
 * mark as a hosted image beside the name in text, so it still reads with
 * images off. Inline styles and tables only, since most mail clients drop
 * flexbox; the one <style> block only tightens the padding on small screens.
 */

export const BRAND = "#007DA2";
export const BRAND_DARK = "#006483";
export const INK = "#0C181F";
export const INK_2 = "#253037";
export const MUTED = "#4F5A60";
export const MUTED_2 = "#6C767D";
export const LINE = "#E4E9EC";
export const SURFACE = "#F4F7F9";
export const WHATSAPP = "#25D366";

/** The app's type, with the system fonts underneath for clients that don't load web fonts (Gmail). */
const DISPLAY = "'Familjen Grotesk', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SANS = "'Instrument Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Where the mark is served from: the web app's public folder (apps/web/public/email). */
const ASSETS = (process.env.WEB_URL ?? "https://stayzim.co.zw").replace(/\/$/, "");

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * The StayZim email frame: the mark and name (and a small label, e.g.
 * "Billing"), a white card with a brand line on top, and the footer.
 */
export function layout({ preview, body, footer, label }: { preview: string; body: string; footer?: string; label?: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>StayZim</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@600;700&family=Instrument+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>
  @media (max-width: 520px) {
    .sz-outer { padding: 12px 6px 24px !important; }
    .sz-card { padding: 22px 18px !important; border-radius: 14px !important; }
    .sz-head { padding: 4px 6px 14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${SURFACE};font-family:${SANS};color:${INK};-webkit-text-size-adjust:100%">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preview)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE}">
  <tr><td align="center" class="sz-outer" style="padding:28px 12px 32px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
      <tr><td class="sz-head" style="padding:0 4px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle">
            <img src="${ASSETS}/email/stayzim-mark.png" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px">
            <span style="display:inline-block;vertical-align:middle;margin-left:8px;font-family:${DISPLAY};font-size:19px;line-height:30px;font-weight:700;color:${INK};letter-spacing:-0.01em">StayZim</span>
          </td>
          ${label ? `<td align="right" style="vertical-align:middle"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#E6F5FB;color:${BRAND_DARK};font-size:12px;line-height:16px;font-weight:600">${escapeHtml(label)}</span></td>` : ""}
        </tr></table>
      </td></tr>
      <tr><td class="sz-card" style="background:#FFFFFF;border:1px solid ${LINE};border-top:4px solid ${BRAND};border-radius:18px;padding:28px 26px;font-size:16px;line-height:25px;color:${INK_2}">
        ${body}
      </td></tr>
      <tr><td style="padding:18px 6px 0;font-size:12.5px;line-height:19px;color:${MUTED_2}">
        ${
          footer ??
          `StayZim · Lodge websites, booked on WhatsApp. Made in Mutare.<br>
        Questions? Reply to this email or message us on WhatsApp.`
        }
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** A heading at the top of the card. */
export function heading(text: string) {
  return `<h1 style="margin:0 0 12px;font-family:${DISPLAY};font-size:22px;line-height:28px;font-weight:700;color:${INK};letter-spacing:-0.01em">${escapeHtml(text)}</h1>`;
}

/**
 * A button that works everywhere (a table cell with the colour, the link
 * inside it), 46px tall. "whatsapp" is the green one for chats.
 */
export function button(href: string, label: string, tone: "brand" | "whatsapp" | "outline" = "brand") {
  const styles = {
    brand: { cell: `background:${BRAND}`, text: "#FFFFFF" },
    whatsapp: { cell: `background:${WHATSAPP}`, text: INK },
    outline: { cell: `background:#FFFFFF;border:1px solid ${LINE}`, text: INK },
  }[tone];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="border-radius:999px;${styles.cell}">
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:15px;line-height:20px;font-weight:600;color:${styles.text};text-decoration:none;border-radius:999px">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export function greeting(name: string) {
  return `<p style="margin:0 0 14px">Hi ${escapeHtml(name.split(" ")[0] || name)},</p>`;
}

/** A two-column summary: "Amount  $40.00". */
export function summary(rows: [string, string][]) {
  const cells = rows
    .map(
      ([label, value], index) =>
        `<tr><td style="padding:9px 0;${index > 0 ? `border-top:1px solid ${LINE};` : ""}color:${MUTED};font-size:14px;line-height:20px">${escapeHtml(label)}</td><td align="right" style="padding:9px 0 9px 12px;${index > 0 ? `border-top:1px solid ${LINE};` : ""}font-size:14px;line-height:20px;font-weight:600;color:${INK}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;padding:4px 14px;background:${SURFACE};border-radius:12px">${cells}</table>`;
}

/** The summary as text lines, for the plain part. */
export function summaryText(rows: [string, string][]) {
  return rows.map(([label, value]) => `${label}: ${value}`);
}

/** A soft box for a quote or a note (a guest's message, a reason). */
export function note(text: string) {
  return `<p style="margin:16px 0 0;padding:12px 14px;background:${SURFACE};border-radius:12px;font-size:14px;line-height:21px;color:${INK_2}">${escapeHtml(text)}</p>`;
}

/** Small print under a button or summary. */
export function small(html: string) {
  return `<p style="margin:12px 0 0;font-size:13px;line-height:20px;color:${MUTED}">${html}</p>`;
}

/** "Button not working? Paste this…" with the link written out. */
export function linkFallback(url: string) {
  return `<p style="margin:14px 0 0;font-size:12.5px;line-height:19px;color:${MUTED_2};word-break:break-all">Button not working? Paste this into your browser:<br><a href="${escapeHtml(url)}" style="color:${BRAND}">${escapeHtml(url)}</a></p>`;
}
