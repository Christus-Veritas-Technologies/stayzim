/**
 * A guest's number as digits with the country code. Zimbabwean numbers typed
 * the local way ("077 123 4567") get +263; anything else must start with its code.
 */
export function guestPhone(text: string): { digits: string } | { error: string } {
  let digits = text.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = `263${digits.slice(1)}`;
  else if (!text.trim().startsWith("+") && /^7\d{8}$/.test(digits)) digits = `263${digits}`;
  if (digits.startsWith("2630")) digits = `263${digits.slice(4)}`;
  if (!/^\d{9,15}$/.test(digits)) return { error: "Add your WhatsApp number, with the country code if you're outside Zimbabwe" };
  return { digits };
}
