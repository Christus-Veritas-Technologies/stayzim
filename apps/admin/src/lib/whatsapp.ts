/** wa.me link with the text typed in: to `phone` (digits with the country code), or a chat of the team member's choosing. */
export function whatsappTextUrl(text: string, phone?: string | null) {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}
