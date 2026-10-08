import { includesAnalytics, includesBookingCalendar, PLAN_PAGES, PLAN_RANK, type Plan, type SitePage } from "@stayzim/sites";

const PAGE_NAMES: Partial<Record<SitePage, string>> = {
  rooms: "Rooms",
  gallery: "Gallery",
  contact: "Contact",
  about: "Our story",
  experiences: "Things to do",
  reviews: "Reviews",
  journal: "Journal",
};

/** "Rooms, Gallery and Contact" */
function list(names: string[]) {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * What moving from one plan to a cheaper one changes, in the owner's words.
 * Nothing is deleted: what a plan doesn't include is hidden and comes back
 * on an upgrade. Empty when `to` isn't cheaper.
 */
export function planChanges(from: Plan, to: Plan, upcomingBookings = 0): string[] {
  if (PLAN_RANK[to] >= PLAN_RANK[from]) return [];
  const changes: string[] = [];
  const pages = PLAN_PAGES[from].filter((page) => !PLAN_PAGES[to].includes(page)).flatMap((page) => PAGE_NAMES[page] ?? []);
  if (pages.length > 0) changes.push(`The ${list(pages)} ${pages.length === 1 ? "page goes" : "pages go"}; your home page keeps showing everything.`);
  if (includesBookingCalendar(from) && !includesBookingCalendar(to)) {
    changes.push(
      upcomingBookings > 0
        ? `Guests book on WhatsApp again. Your ${upcomingBookings} upcoming ${upcomingBookings === 1 ? "booking stays" : "bookings stay"} in your calendar.`
        : "Guests book on WhatsApp again instead of on your site.",
    );
  }
  if (includesAnalytics(from) && !includesAnalytics(to)) changes.push("Visitor analytics are hidden. Visits are still counted, so they're back if you upgrade.");
  if (from === "PRO") changes.push("Reviews and journal posts are hidden, not deleted, and we stop managing your Booking.com and Airbnb listings.");
  return changes;
}
