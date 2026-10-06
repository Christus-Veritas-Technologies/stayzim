# The lodge CMS

_Status: **planned, not built.** These docs are the plan. Build in the order under [Build order](#build-order), one commit per step, and tick items off in [progress.md](../progress.md#cms-pending)._

Owners manage their own site content: rooms, guest info and, on Growth and Pro, bookings. It works like a website builder's CMS (Framer's, for example) with one fixed content type per thing:

- **The data has one shape for every lodge and every template.** A Room is a Room whether the site uses Classic, Clear or a future Pro design.
- **Only the rendering changes.** Templates decide how a room looks, never what a room is.
- **Owners edit everything in the dashboard.** Change requests stay for what can't be self-serve: design changes, domains, custom sections.

| Doc | What it covers | Size |
| --- | --- | --- |
| This page | The architecture: content contract, rules, data model, template contract, pitfalls | — |
| [rooms.md](rooms.md) | **Core.** The content contract in code, plus the Rooms CMS: details, how many, hide, duplicate, photo order | Core |
| [guest-info.md](guest-info.md) | Stay details (check-in and check-out times, house rules, cancellation policy), FAQ, social and listing links | 3 small |
| [bookings.md](bookings.md) | The bookings calendar and owner tools, plus booking requests from the lodge site (Growth and Pro) | 2 hard |
| [quick-wins.md](quick-wins.md) | Most asked-about rooms, edit your name, and the room quick wins listed in rooms.md | 5-minute |

## Decisions (agreed with the user, 6 October 2026)

- **Bookings come from two places.**
  - Guests pick dates on the lodge site and send a **request**. The owner confirms, declines or cancels it in the dashboard.
  - WhatsApp still opens with the dates filled in, so WhatsApp stays the main channel.
  - Owners also add bookings they took on WhatsApp or by phone, and **block dates** (closed for repairs, a private event).
- **Rooms are room types with a count:** "Standard Room × 6". The site shows the type once. A night is full only when all 6 are taken.
- **The calendar and booking requests are for Growth and Pro** (`includesBookingCalendar` in `packages/sites/src/plans.ts`). Starter keeps Book on WhatsApp.
- **Everything else in the CMS is for all plans:** room details, hide, duplicate, guest info, FAQ, links.
- **Out of scope for the MVP:**
  - seasonal or weekend prices, per-person prices, minimum stays, other currencies;
  - deposits or online payment by guests;
  - channel sync with Booking.com or Airbnb;
  - custom sections and section reordering;
  - per-template content.

  They're listed under [Later](#later) so they aren't lost.

## 1. The content contract

### Where it lives

All shapes, limits and validation live in **`packages/sites/src/content/`**. It's the single source for `apps/server`, `apps/web` and the scripts.

Today the shapes are copied by hand. `LodgeJson` and `PublicSite` on the server are mirrored in `apps/web/src/lib/lodge.ts` and `apps/web/src/lib/site.ts`, and the amenity list is copied between `apps/server/src/routes/rooms.ts` and web. The foundation step removes those copies.

| File | Holds |
| --- | --- |
| `limits.ts` | Every number, once: `ROOM_LIMITS` (name 60, price 1–10 000, sleeps 1–30, units 1–50, description 400, beds 60, size 5–1000), `MAX_ROOMS` 30, `ROOM_PHOTO_LIMIT` 5, `GALLERY_LIMIT` 30, `GUEST_INFO_LIMITS` (rules 10 × 120, policy 600, FAQ 8, question 120, answer 400), `BOOKING_LIMITS` (1–60 nights, up to 18 months ahead) |
| `amenities.ts` | `AMENITY_KEYS` and labels. Web keeps only the icons, typed `satisfies Record<AmenityKey, LucideIcon>`, so a key without an icon fails `check-types` |
| `schemas.ts` | zod **input** schemas, for what clients send: `roomInput`, `roomPatch`, `lodgePatch` (today's `lodgeUpdateSchema` in `apps/server/src/routes/lodge.ts`, plus the guest-info fields), `bookingRequestInput` (guests), `ownerBookingInput`, `blockInput`, `bookingAction` |
| `site.ts` | zod **output** schema, for what the site reads: `publicSiteSchema` (the LIVE, DEMO_ENDED and SUSPENDED union) and the types `PublicSite`, `LiveSite`, `SiteRoom`, `SitePhoto` |
| `dashboard.ts` | Types for the dashboard payload: `DashboardLodge`, `DashboardRoom`, `DashboardPhoto` (today's `LodgeJson`, `RoomJson`, `PhotoJson`). Dates are ISO strings, as they arrive over JSON |
| `dates.ts` | Pure helpers on date-only strings (`"2026-10-12"`): `addDays`, `nights`, `overlaps`, `eachNight`, `isDateString`, `todayInHarare` (the UTC+2 offset already used by `billing-dates.ts`) |
| `availability.ts` | Pure: `occupancy(units, holds, from, to)` (taken per night) and `fullNights(...)`. Unit-tested, used by the server and by the dashboard's "this fills your last room" warning |

How it's used:

- **zod becomes a dependency of `@stayzim/sites`** (the catalog version; web and server already use zod 4).
- **Server:**
  - Routes validate with the shared input schemas through the existing `validJson` (`apps/server/src/lib/validate.ts`), so error sentences stay as they are.
  - Serializers are written `… satisfies LiveSite` and `… satisfies DashboardLodge`. A field added to the contract but not sent, or the other way round, fails `check-types`.
- **Web:**
  - Forms run the same schema's `safeParse` before saving. Limits and error sentences then match the server, with no copied numbers.
  - The dashboard imports the types; it no longer declares its own.
  - **Bundle weight:** zod was taken out of the lodge sites' browser bundle on purpose (see progress.md, page weight). Lodge sites only `parse` on the server, in `getSite`. The guest booking form lives in a lazily loaded chunk; there, check with plain functions from `limits.ts`, or accept zod only in that chunk. Never import `schemas.ts` from a component that's in the first load.
- **`getSite`** (`apps/web/src/lib/site.ts`, server-side) parses the API response with `publicSiteSchema`. Every new field has a `.default()`, and unknown fields are dropped. A web build that is newer or older than the API (a rolling deploy, a cached response) still renders.

### Rules that keep it predictable

1. **Changes are additive.**
   - A field is never renamed or removed, and its meaning never changes.
   - A new field arrives with a default (`null`, `[]`, `false`, `1`) in the database, the serializer and `publicSiteSchema`.
   - So old rows, old clients and the placeholder templates keep working.
2. **Strict or optional is part of the type.**
   - Strict fields are always present and valid.
   - Optional fields are `string | null`, `number | null` or a possibly empty array, never `undefined` and never `""`. The serializer turns empty strings into `null`.
   - A template checks `if (room.description)` and nothing else.
3. **The server decides what the public sees.** All of this is resolved in `apps/server/src/routes/sites.ts`, so a template can't show what it never receives:
   - hidden rooms;
   - empty sections;
   - the booking mode for the plan;
   - guest personal data, which is never sent.
4. **Templates get data plus pure helpers.**
   - `apps/web/src/lib/site-content.ts` formats things the same way everywhere:
     - `roomFacts(room)` gives "Sleeps 4 · 1 queen + 2 singles · 32 m²";
     - `stayFacts(site)` gives "Check-in from 14:00 · Check-out by 10:00";
     - `sectionsOf(site)` says which sections have content.
   - Classic and the designer's coming templates read the same wording.
5. **Lists edited as a whole are JSON; anything queried is a table.**
   - House rules, FAQ and social links are `Json` columns on `Lodge`. They save in one PATCH and need no reorder endpoints.
   - They're validated with zod on the way in, and parsed with `.catch(default)` on the way out, so a bad row can't break a site.
   - Rooms, photos and bookings stay as tables.
6. **The dashboard payload stays whole.** Every lodge and room edit still returns the full `DashboardLodge` (the `save` and `saveWith` pattern in `apps/web/src/components/dashboard/lodge-provider.tsx`), so no screen goes stale. Bookings are the one exception: they're paged by date and have their own endpoint.

### The Room type

✱ strict (always present) · ○ optional

```ts
type SiteRoom = {
  id: string;                  // ✱
  name: string;                // ✱ 1–60
  price: number;               // ✱ whole USD a night, 1–10 000
  sleeps: number;              // ✱ guests, 1–30
  amenities: AmenityKey[];     // ✱ may be empty; templates show up to AMENITIES_ON_CARD
  photos: SitePhoto[];         // ✱ may be empty; the first is the cover
  description: string | null;  // ○ ≤ 400, plain text, line breaks kept
  beds: string | null;         // ○ ≤ 60, "1 queen + 2 singles"
  size: number | null;         // ○ m², 5–1000
};

type DashboardRoom = SiteRoom & {
  units: number;               // ✱ how many of this room the lodge has, 1–50, default 1
  visible: boolean;            // ✱ default true; false hides it from the site, nothing is lost
  photos: DashboardPhoto[];    // with ids, captions and sizes
  upcomingBookings: number;    // confirmed stays from today (0 on Starter)
  updatedAt: string;
};
```

- `units` and `visible` aren't public. The site only receives visible rooms. Availability goes out through the availability endpoint, never as a count of rooms.
- `photos` stays capped at `ROOM_PHOTO_LIMIT`.

### Lodge content

The existing fields stay as they are:

- name, description (300), town, region;
- WhatsApp, phone, email;
- map;
- theme colour, logo, hero photo;
- hero headline and subline (`HERO_LIMITS`);
- template.

New fields, all optional (details in [guest-info.md](guest-info.md)):

```ts
checkInFrom: string | null;          // "14:00", 24-hour HH:MM
checkOutBy: string | null;           // "10:00"
houseRules: string[];                // ≤ 10 × 120
cancellationPolicy: string | null;   // ≤ 600
faq: { q: string; a: string }[];     // ≤ 8
socialLinks: Partial<Record<SocialKey, string>>; // https URLs; SocialKey = facebook | instagram | tiktok | tripadvisor | bookingCom | airbnb
```

`LiveSite` also gets one booking field, worked out by the server:

```ts
booking: { mode: "whatsapp" | "request" };
```

- **`request`** needs all of these:
  - the plan has `includesBookingCalendar`;
  - the lodge has a WhatsApp number;
  - at least one room is visible;
  - the site isn't a [preview](../architecture.md#templates).
- **`whatsapp`** is today's behaviour.
- A demo on Growth or Pro gets `request` too, so people from the ads can try the whole flow on their own site.

### The template contract

Every template, today's and the designer's, receives `{ site: LiveSite; preview?: boolean }` and:

- **Renders the sections that have content:**
  - hero
  - about
  - rooms, with description, beds and size through `roomFacts`
  - gallery
  - good to know (`stayFacts`, house rules, cancellation policy)
  - FAQ
  - location
  - contact, with social links
  - footer
- **Uses `BookLink`** (`apps/web/src/components/site/tracking.tsx`) for every Book button, passing `roomId` on room buttons. `BookLink` decides between WhatsApp and the booking sheet, so templates never branch on the booking mode.
- **Copes with every optional field missing**, and with no rooms, photos, WhatsApp or map. That's already a rule in [architecture.md](../architecture.md#templates).

The 8 placeholders (`templates/basic.tsx`, `looks.ts`) **are not edited** until the designer delivers. They still get these through the server and `BookLink`:

- hidden rooms dropped;
- the booking sheet.

They don't show the new sections; the real designs will. The spec for the designer lists every section above.

## 2. Bookings data model (summary)

Full detail in [bookings.md](bookings.md).

```prisma
// packages/db/prisma/schema/booking.prisma
enum BookingKind   { STAY BLOCK }
enum BookingStatus { REQUESTED CONFIRMED DECLINED CANCELLED }
enum BookingSource { SITE OWNER }

model Booking {
  id           String        @id @default(cuid())
  reference    String        @unique             // "B-7K2Q"
  lodgeId      String        // → Lodge, onDelete Cascade
  roomId       String        // → Room, onDelete Restrict (rooms with bookings are hidden, not deleted)
  kind         BookingKind
  status       BookingStatus
  source       BookingSource
  checkIn      DateTime      @db.Date            // first night
  checkOut     DateTime      @db.Date            // the morning they leave (not a night)
  quantity     Int           @default(1)         // how many of the room type
  guests       Int?
  guestName    String?
  guestPhone   String?
  guestEmail   String?
  message      String?                           // the guest's note
  notes        String?                           // the owner's private note (deposits…)
  roomName     String                            // snapshot
  nightlyPrice Int                               // snapshot, whole USD
  decidedAt    DateTime?
  cancelledAt  DateTime?
  cancelReason String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  @@index([lodgeId, checkIn])
  @@index([roomId, checkIn, checkOut])
}
```

- **Holds:** confirmed stays, and blocks that aren't cancelled. The number taken on a night is the sum of `quantity` over the holds that cover it. A night is **full** when that sum is at least `room.units`.
- **Requests hold nothing.** Spam can't close a calendar, and the owner decides who gets the room.
- **Expired** is worked out when read, the way `demoEnded` is: a REQUESTED booking whose check-in has passed shows as "Expired". There's no job and no extra status.
- **The site never receives guest data.** The availability endpoint returns only the full dates of each room.

## 3. Information architecture and UX

```
Dashboard
Bookings            ← new, Growth and Pro (locked preview on Starter); badge: requests waiting
My site
  Lodge info        (as today)
  Rooms             (CMS: details, how many, hide, duplicate, photo order)
  Gallery           (as today)
  Guest info        ← new: stay details, FAQ, links
  Design            (as today)
  Requests          (as today)
Analytics
Billing
```

The principles are the ones the dashboard already follows:

- **Save patterns stay as they are.**
  - Text forms (room sheet, Lodge info, Guest info) use a draft, a Save button, `UnsavedChangesGuard` and the sticky Save bar on phones.
  - Discrete actions save at once with a toast, and Undo where they can be undone: reorder, hide, duplicate, confirm, decline, cancel.
- **Optional reads as optional.** Extra fields sit under "Details · Optional" and never block a save.
- **Progress shows.**
  - The setup checklist gains one step, "Add guest info". It's advice, not a blocker.
  - The sidebar shows "1 hidden" on Rooms and "3 waiting" on Bookings.
- **Phone first.**
  - Every screen at 360px, with no sideways scroll on the page.
  - Tap targets of at least 44px on booking actions.
  - The bookings calendar is a month grid plus a day list on phones, never a wide timeline.
- **Plain words:** "How many of this room do you have?", "Hide from site", "Closed dates", "Cancel booking", "Send on WhatsApp too".
- **Motion:** sheets opening, list items moving, the success tick. All off with reduce motion. No `layout` animation on lists that grow while you type; it made the `/start` rooms step overlap once.

## 4. Pitfalls and how we avoid them

| Pitfall | How we avoid it |
| --- | --- |
| Server and web types drift | One contract in `packages/sites`, `satisfies` on serializers, the web copies deleted |
| Web and API deployed out of step, or a stale cache | Only additive fields, each with a default, plus `publicSiteSchema.parse` in `getSite` |
| The placeholder templates mustn't change | New behaviour comes through the server (hidden rooms) and the shared `BookLink` (booking sheet); new sections only in Classic and in the designer's spec |
| Lodge site page weight on phones | The booking sheet is a lazy chunk loaded on the first tap; no date library; availability fetched only when the sheet opens; FAQ and rules are plain HTML; first-load JS must stay within ±2 KB |
| Dates off by one day | `@db.Date` columns and `YYYY-MM-DD` strings end to end, pure helpers, "today" in Harare, tests across month, year and leap-day boundaries |
| Double bookings | Owner actions that add holds run in one transaction under a per-room advisory lock and recount before writing (409 "Standard Room is full on 12 Oct"); requests hold nothing; the dashboard warns before confirming |
| Spam requests | IP rate limit, honeypot field, phone check, at most 20 new requests per lodge a day; requests never close dates |
| Deleting a room that has bookings | Refused with a sentence that says what to do ("…has 2 upcoming bookings. Hide it instead, or cancel them first"); bookings keep a snapshot of the room name and price |
| Lowering "how many" below what's booked | The save goes through, but warns and lists the clashing nights ("12 Oct now has 5 booked of 4") |
| Price edits rewriting old bookings | Each booking keeps the nightly price it was made at |
| Bad JSON in the guest-info columns | zod on the way in, `.catch(default)` on the way out |
| Downgrading from Growth to Starter | Nothing is deleted. Bookings become read-only with an upgrade note, and the site goes back to WhatsApp buttons |
| Guest personal data | Never public. The privacy page lists it. The hourly job (`apps/server/src/jobs/billing.ts`, renamed to a general job when this lands) clears guest name, phone, email and message 12 months after check-out |
| Two devices editing at once | Last save wins; every response returns the whole lodge, so screens catch up. Fine for the MVP |
| Scope creep | Anything in [Later](#later) needs the user's go-ahead first |

## Build order

Each step is a few small commits, validated with types, tests, a real browser and screenshots at 360 and 1280. Tick them off in [progress.md](../progress.md#cms-pending).

1. **Foundation:** the content contract, serializers on it, web copies removed. No visible change. ([rooms.md](rooms.md#1-foundation))
2. **Rooms CMS:** migration, room details, how many, hide, duplicate, photo order, Classic renders the details. ([rooms.md](rooms.md))
3. **Guest info:** stay details, FAQ, links, the Guest info page and Classic sections. ([guest-info.md](guest-info.md))
4. **Quick wins:** most asked-about rooms, edit your name. ([quick-wins.md](quick-wins.md))
5. **Bookings calendar and owner tools.** ([bookings.md](bookings.md#part-1-the-calendar-and-owner-tools))
6. **Booking requests from the site.** ([bookings.md](bookings.md#part-2-booking-requests-from-the-lodge-site))

Steps 1 to 4 are for every plan and carry little risk. Steps 5 and 6 are the two hard ones. Step 6 needs step 5.

## Later

Not in the MVP. Each needs the user's go-ahead.

- Seasonal or weekend prices, and minimum stays.
- Per-person prices, and other currencies.
- Deposits by Paynow when a guest books (on Growth's "coming" list).
- An iCal export or import, to sync with Booking.com and Airbnb (the start of Pro's channel sync).
- Custom sections ("Our restaurant"), section order and on/off switches.
- Separate room pages on lodge sites.
- WhatsApp Business API notifications for owners.
- Changing the login email, which needs email verification.
