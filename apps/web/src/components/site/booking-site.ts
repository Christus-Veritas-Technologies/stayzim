import { isSampleRoomId } from "@stayzim/sites";

import type { BookingSite } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

/** What the booking sheet needs, where the site takes bookings. In a preview the sheet opens, but sends nothing. */
export function bookingSite(site: LiveSite, preview = false): BookingSite | null {
  return site.booking.mode === "request" && site.whatsapp
    ? {
        slug: site.slug,
        name: site.name,
        whatsapp: site.whatsapp,
        themeColor: site.themeColor,
        checkInFrom: site.checkInFrom,
        checkOutBy: site.checkOutBy,
        // Example rooms never reach the sheet
        rooms: site.rooms.filter((room) => !isSampleRoomId(room.id)).map(({ id, name, price, sleeps }) => ({ id, name, price, sleeps })),
        preview,
      }
    : null;
}
