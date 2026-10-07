# Bookings: the calendar, owner tools and requests from the site

_Status: **built** (7 October 2026). Growth and Pro (`includesBookingCalendar`). These are the two hard features, built part 1, then part 2, with the additions under [Added while building](#added-while-building). Read the [CMS architecture](README.md) and [rooms.md](rooms.md) first; this needs `Room.units` and `Room.visible`._

**Why.** Owners keep track of bookings in WhatsApp chats and paper diaries, and they double-book. Guests want to see whether dates are free without waiting for a reply.

**The approach:**

- One calendar per lodge that the owner controls.
- Guests send **requests**. The owner confirms or declines them.
- WhatsApp stays the conversation.
- No payments by guests in this build.

## The model

`packages/db/prisma/schema/booking.prisma`, migration `bookings`:

```prisma
enum BookingKind   { STAY BLOCK }
enum BookingStatus { REQUESTED CONFIRMED DECLINED CANCELLED }
enum BookingSource { SITE OWNER }

model Booking {
  id           String        @id @default(cuid())
  reference    String        @unique
  lodgeId      String        @map("lodge_id")
  lodge        Lodge         @relation(fields: [lodgeId], references: [id], onDelete: Cascade)
  roomId       String        @map("room_id")
  room         Room          @relation(fields: [roomId], references: [id], onDelete: Restrict)
  kind         BookingKind
  status       BookingStatus
  source       BookingSource
  checkIn      DateTime      @db.Date @map("check_in")
  checkOut     DateTime      @db.Date @map("check_out")
  quantity     Int           @default(1)
  guests       Int?
  guestName    String?       @map("guest_name")
  guestPhone   String?       @map("guest_phone")
  guestEmail   String?       @map("guest_email")
  message      String?
  notes        String?
  roomName     String        @map("room_name")
  nightlyPrice Int           @map("nightly_price")
  decidedAt    DateTime?     @map("decided_at")
  cancelledAt  DateTime?     @map("cancelled_at")
  cancelReason String?       @map("cancel_reason")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  @@index([lodgeId, checkIn])
  @@index([roomId, checkIn, checkOut])
  @@map("booking")
}
```

Add `SiteEventType.BOOKING_REQUEST` to `site.prisma` in the same migration.

### What each kind and status means

| | REQUESTED | CONFIRMED | DECLINED | CANCELLED |
| --- | --- | --- | --- | --- |
| **STAY from the site** | New, waiting for the owner. Holds nothing | Holds `quantity` rooms | Closed, holds nothing | Closed, holds nothing |
| **STAY added by the owner** | — (owner bookings start CONFIRMED) | Holds | — | Closed |
| **BLOCK** (closed dates) | — | Holds `quantity` rooms (default: all of the type) | — | Removed by the owner |

Allowed transitions. Anything else is refused with 409, "This booking was already declined".

- REQUESTED → CONFIRMED (Confirm) or DECLINED (Decline)
- CONFIRMED → CANCELLED (Cancel booking)
- CONFIRMED → CONFIRMED (edit dates, room, quantity or guests, re-checked)

**Expired** isn't stored. A REQUESTED booking with `checkIn < today` (Harare) is sent as `expired: true` and listed under Past as "Expired, not answered".

**References** use the same generator as change requests (`newReference` in `apps/server/src/routes/requests.ts`, moved into a shared `lib/reference.ts`), with the prefix `B-`.

### Availability maths

The maths lives in `packages/sites/src/content/availability.ts`. It is pure and unit-tested.

- A stay covers the nights `checkIn ≤ night < checkOut`. A guest leaving on the 12th and one arriving on the 12th never clash.
- `taken(night) = Σ quantity` of holds covering the night. Holds are CONFIRMED stays and blocks that aren't cancelled.
- A room is **full** on a night when `taken ≥ units`.
- `canHold(room, holds, checkIn, checkOut, quantity)` returns `{ ok: true } | { ok: false, fullOn: "2026-10-12" }`.
- All dates are `YYYY-MM-DD` strings. Arithmetic goes through `dates.ts`, using UTC midnight internally and never local time. "Today" is `todayInHarare()`.

## Part 1: the calendar and owner tools

### Server: `apps/server/src/routes/bookings.ts`

Mounted at `/api/lodge/bookings`, with `requireLodge`.

- Every route checks `includesBookingCalendar(lodge.plan)`.
- Reads still work after a downgrade.
- Writes return 403: "Bookings come with Growth and Pro".

| Route | Does |
| --- | --- |
| `GET /?from&to` | Bookings and blocks overlapping the window (at most 92 days), plus `rooms: {id, name, units, visible}` and the `requests` count. Sorted by check-in |
| `GET /requests` | REQUESTED, not expired, oldest first |
| `GET /search?q` | By guest name, phone or reference (past and future), 20 results |
| `POST /` | `ownerBookingInput`: room, dates, quantity, guests, guest name and phone (both optional), notes. Creates a CONFIRMED STAY with source OWNER |
| `POST /blocks` | `blockInput`: room, dates, quantity (default `units`), note. Creates a BLOCK |
| `PATCH /:id` | `bookingAction`, a union: `{action:"confirm"}`, `{action:"decline", reason?}`, `{action:"cancel", reason?}`, or `{action:"edit", roomId?, checkIn?, checkOut?, quantity?, guests?, notes?}` |
| `DELETE /blocks/:id` | Removes a block (sets it to CANCELLED, so the history stays) |

**Holds are written inside a lock.** That covers confirm, `POST /`, `POST /blocks`, and an edit that changes the room, dates or quantity. Each runs in `prisma.$transaction`:

1. `SELECT pg_advisory_xact_lock(hashtext($roomId))`. Two confirms for the same room queue; different rooms don't wait.
2. Load the holds that overlap the dates, then `canHold(...)`.
3. If it's full: 409, "Standard Room is full on 12 Oct", with `{ fullOn }`.
4. Otherwise write. The snapshot is `roomName` and `nightlyPrice` from the room at the moment of creating.

**Owner warnings, not refusals:**

- `quantity` can't be more than `units`. That's a 422 with "You have 4 Standard Rooms".
- Lowering `Room.units` below what's held is allowed (rooms.md). `GET /` then returns `overbooked: [{roomId, night, taken, units}]` so the calendar shows them in red.

**Emails** (`packages/mail/src/bookings.ts`, using the same layout as billing.ts):

- To the guest, only if they gave an email:
  - confirmed;
  - declined, with the reason if there is one;
  - cancelled, with the reason if there is one.
- Each has the lodge's name, WhatsApp button and the dates.
- They're sent after the commit and never block the action.

**`lodgeJson()`** adds:

- `bookingsWaiting`: the count of open requests, for the sidebar badge;
- `today`: `{ arriving, leaving, staying }` counts, for the overview card;
- `room.upcomingBookings`.

All of it is 0 on Starter.

### Dashboard: `apps/web/src/app/dashboard/bookings/`

**Navigation** (`components/dashboard/nav.ts`):

- **Bookings** sits after Dashboard, with the `CalendarDays` icon and a "3 waiting" badge.
- **Starter** gets the locked preview, the same pattern as `analytics/page.tsx` `LockedPreview`: a blurred sample calendar, "Take bookings on your site with Growth", and an upgrade button. The upgrade goes to Billing's plan picker (`/dashboard/billing`), not WhatsApp, now that owners can pay themselves.

**Tabs** (`@stayzim/ui` Tabs; the choice is kept in the URL as `?tab=`):

1. **Requests** (the default when there are any): one card per request.
   - Shows the guest, the room, "12–15 Oct · 3 nights · 2 guests", the total "$285", the message, and "Sent 2 h ago".
   - **Confirm** (primary) and **Decline** (outline).
   - Before the owner taps, the card runs `canHold` on the client from the loaded window.
     - If confirming fills the last room, it reads "This fills your last Standard Room on 13 Oct".
     - If the room is already full, Confirm is disabled with `WhyDisabled`: "Standard Room is full on 13 Oct. Change the room or dates first". **Change** opens the booking sheet in edit mode.
   - After confirming or declining, the card collapses (motion, off with reduce motion), and the toast offers **Message {guest} on WhatsApp**.
   - Empty state: "No requests waiting. New ones from your site show here, and we email you."
2. **Calendar:**
   - **Desktop (≥ 1024px):** a timeline.
     - Rooms are rows, labelled "Standard Room · 6".
     - Days are columns: 14 or 30, with Prev, Today and Next.
     - Each cell shows "4/6", tinted by how full it is.
     - Stays are bars, from check-in to check-out: confirmed in the lodge's brand colour, blocks hatched in grey.
     - Clicking a bar opens the booking sheet. Clicking an empty cell opens **Add**, already filled in.
   - **Phone:**
     - a room picker (chips) above a month grid (`packages/ui/src/components/range-calendar.tsx`, in its display mode);
     - each day shows a dot: none, partly booked or full;
     - tapping a day lists that day's arrivals, stays and departures below it, with **Add booking** and **Close dates** buttons for that day.
     - No sideways scrolling.
3. **Upcoming:** confirmed stays from today, grouped by week ("This week", "Next week", then by month), with a search box (`GET /search`).
4. **Past:** stays that are over, declined, cancelled or expired, newest first, paged 20 at a time.

**Booking sheet** (`components/dashboard/booking-sheet.tsx`), used for adding, viewing and editing:

- **Fields:**
  - Room (a select of visible rooms; a hidden room shows only when it is already the booking's room);
  - Dates (a range calendar with full nights struck through);
  - How many rooms (1 to `units`);
  - Guests;
  - Guest name and phone (the phone uses the `+263` input from Lodge info, and is optional for owner bookings);
  - Notes ("Deposit $50 received on EcoCash").
- **Total:** "3 nights × $95 = $285", from the snapshot price, or today's price for a new booking.
- **Actions,** by status:
  - REQUESTED: Confirm, Decline.
  - CONFIRMED: Save changes, **Cancel booking**.
    - Cancel opens an `AlertDialog`: "Cancel {guest}'s booking? The dates open up again." It has an optional reason and a "Message {guest} on WhatsApp" checkbox, which opens the message after cancelling.
  - BLOCK: Save, Open these dates.
- **Message guest:** `wa.me/{guestPhone}` links with the text already written. The messages live in `apps/web/src/lib/booking-messages.ts`, with unit tests.
  - Confirmed: "Hi {first name}, your booking at {lodge} is confirmed: {room}, {12 Oct}–{15 Oct} ({3} nights, {2} guests). Total ${285}. Check-in from {14:00}. Reference {B-7K2Q}."
  - Declined: "Hi {first name}, sorry, {lodge} is full for {12–15 Oct}. {reason}"
  - Cancelled: "Hi {first name}, your booking at {lodge} for {12–15 Oct} is cancelled. {reason}"
- **History,** at the foot of the sheet: "Requested on the site · 6 Oct 14:02", "Confirmed · 6 Oct 15:10".

**Overview** (`app/dashboard/page.tsx`): a **Today** card, on Growth and Pro, when there's anything to show.

- "2 arriving · 1 leaving · 3 requests waiting".
- Each part links to its tab.

**Save style:** each action saves at once, with a toast.

- Confirm, decline and cancel can't be undone, which is why cancel has its dialog.
- Removing a block shows Undo, which recreates it.
- A failure keeps the sheet open, with the server's sentence in `FormMessage`.

## Part 2: booking requests from the lodge site

### What the guest sees

1. They tap any **Book** button, in any template, including the placeholders. Every template's Book buttons are `BookLink`.
2. **On Growth and Pro** (`site.booking.mode === "request"`), `BookLink` opens the **booking sheet** instead of `wa.me`. It's a bottom sheet on phones and a dialog on desktop, in the lodge's theme colour.
   - **Step 1, Dates:** the room (preselected from the button, or a select), a range calendar with full nights greyed out and struck through, and the number of guests (up to `sleeps × rooms`).
     - The summary reads "3 nights · $285" and "Check-in from 14:00 · Check-out by 10:00".
     - If a picked range crosses a full night: "Standard Room is full on 13 Oct. Try other dates or another room."
   - **Step 2, Your details:** name, WhatsApp number (the `+263` field and checks used in the dashboard), email (optional, "for your confirmation"), and a note (optional, 300 characters).
   - **Step 3, Sent:** "Request sent to Mist Valley. They'll confirm with you, usually on WhatsApp. Reference B-7K2Q."
     - The main button is **Send on WhatsApp too**. It opens `wa.me/{lodge}` with "Hi Mist Valley, I've just sent a booking request (B-7K2Q): Standard Room, 12–15 Oct, 2 guests. My name is Tendai."
     - Then a quiet Done.
3. **On Starter** (`mode === "whatsapp"`), and when the sheet fails to load, `BookLink` is the WhatsApp link it is today. The no-JavaScript fallback is an `href` to `wa.me`.

### Server (public, in `apps/server/src/routes/sites.ts`)

| Route | Does |
| --- | --- |
| `GET /:slug/availability?from&to` | Lodge must be LIVE (not suspended, not an ended demo) and in request mode. At most 120 days per call. Returns `{ rooms: { id, full: string[] }[] }`, only the full nights of visible rooms. `Cache-Control: public, max-age=60` |
| `POST /:slug/bookings` | `bookingRequestInput`: `roomId`, `checkIn`, `checkOut`, `guests`, `name` (2–80), `phone`, `email?`, `message?` (≤ 300), and `website`, the honeypot, which must be empty. Creates a REQUESTED STAY with source SITE and the snapshot, records a `BOOKING_REQUEST` site event, emails the owner, and returns `{ reference }` |

**Checks on `POST`:**

- **Rate limit:** `hono-rate-limiter` keyed on `clientIp`, as the events route is, at 5 per 10 minutes.
- **Honeypot:** if it's filled, answer 200 with a made-up reference and store nothing.
- **Phone:** the shared `phoneNumber` rule.
- **Dates:** check-in from today (Harare) to 18 months ahead, 1–60 nights.
- **Room:** must be visible and belong to the lodge.
- **Guests:** at most `sleeps × units`.
- **The room must not be full** on any night ("Standard Room is full on 13 Oct" with 409, which the sheet shows in step 1).
- **Daily cap:** at most 20 requests per lodge a day. After that, 429: "This lodge has a lot of requests today. Message them on WhatsApp instead", and the sheet switches to the WhatsApp button.
- **Owner's own visits:** the events route skips them (`apps/server/src/lib/visits.ts`). Requests aren't skipped, but they're marked "(you)" in the dashboard if the owner was signed in, so testing is easy.

**Owner email** (`packages/mail/src/bookings.ts`):

- Subject: "New booking request: Standard Room, 12–15 Oct".
- It has the guest's name, phone and message, and two buttons: **Open requests** (`WEB_URL/dashboard/bookings`) and **WhatsApp {guest}**.
- It goes to the owner's account email. The dashboard badge is there too.

### Lodge site code (`apps/web`)

- **`components/site/tracking.tsx` `BookLink`:**
  - It takes the site's booking mode from a small context set by `SiteTemplate` in `templates/index.tsx`. That's not a template file, so the placeholders need no edit.
  - In request mode, a click calls `event.preventDefault()` and opens the sheet. The sheet is loaded with `next/dynamic(() => import("./booking-sheet"), { ssr: false })`, and the import starts on `pointerdown` so it's ready by `click`.
  - It still tracks `BOOKING_CHAT` when the guest ends up on WhatsApp.
- **`components/site/booking-sheet.tsx`:**
  - the three steps above;
  - availability fetched when it opens, for the room's next 120 days, and again when the guest pages past them;
  - plain functions for checks, **no zod**;
  - `@stayzim/ui` Sheet/Dialog and `range-calendar.tsx`.
- **`packages/ui/src/components/range-calendar.tsx`:** new, and shared with the dashboard.
  - A month grid built with `Intl.DateTimeFormat` and no date library.
  - Disabled and struck-through days.
  - Range selection (tap the start, tap the end).
  - Keyboard: arrows, PageUp and PageDown for months, Enter.
  - `aria-label`s like "13 October, full".
  - Weeks start on Monday.
- **Preview:** the `/preview/...` route forces WhatsApp mode, so a preview never creates requests.
- **Demo sites:** request mode works, so ad sign-ups can try it on their own site. Requests are real, and the demo badge stays.

### Analytics

- `BOOKING_REQUEST` counts alongside `BOOKING_CHAT` (`apps/server/src/routes/stats.ts`).
- The overview tile "Booking chats" becomes **"Booking chats and requests"**, with both numbers.
- The visits table filter gains "Booking request".

## Privacy and retention

- `apps/web/src/app/privacy/page.tsx` gains a short section: what a guest gives (name, phone, optional email and note), who sees it (the lodge only), and how long it's kept (12 months after the stay).
- The hourly job (`apps/server/src/jobs/billing.ts`; it kept its name) clears the guest's name, phone, email and message 12 months after check-out. The booking row stays, for the owner's counts.

## Pitfalls specific to bookings

| Risk | Handling |
| --- | --- |
| Two confirms at once for the last room | Per-room advisory lock plus recounting inside the transaction; a test runs two confirms with `Promise.all` and expects one 409 |
| Off-by-one nights | Nights are `[checkIn, checkOut)`; unit tests for back-to-back stays, month ends, 29 Feb 2028 and the Harare midnight (22:00 UTC) |
| A guest's time zone (diaspora guests in the UK) | Dates are calendar dates, never instants; the guest picks dates, not times |
| Spam or competitors filling the inbox | Requests hold nothing; rate limit, honeypot and daily cap; the owner can ignore them and they expire on their own |
| An owner forgets to answer | The email, the badge, the Today card; a request expires at its check-in date |
| A room is hidden or deleted with bookings | Hidden: its bookings stay and show greyed in the calendar. Delete: refused (rooms.md) |
| Plan downgrade | Writes 403 and the dashboard is read-only with an upgrade note; the site goes back to WhatsApp; nothing is deleted |
| Lodge suspended, or demo ended | Availability and requests return 404, the same as the site |
| Page weight | The sheet and calendar are a lazy chunk (target under 15 KB gzipped); first load unchanged ±2 KB |

## Tests

- **Unit** (`packages/sites`): `dates` and `availability`.
  - Overlaps, back-to-back stays, `units`, blocks, `quantity`, the overbooked list.
  - Boundaries: month, year, leap day, Harare midnight.
- **Unit** (`apps/web`): `booking-messages.ts`, and `range-calendar` key handling.
- **Unit** (`packages/mail`): the booking email templates.
- **Server** (with the test database, as `apps/server/test/setup.ts` sets up):
  - every transition allowed and refused;
  - the concurrent confirm;
  - the honeypot, the daily cap, and the downgrade 403.
- **Playwright** (`apps/web/e2e/bookings.e2e.ts`):
  1. A guest opens the site (Growth), taps Book on a room, picks dates and sends. The Sent step shows a reference, and the WhatsApp link carries it.
  2. The owner sees it in Requests and confirms it. On the site, those nights are full for a room with `units` = 1.
  3. The owner cancels it, and the nights open up again.
  4. The owner closes dates, and they're greyed out on the site.
  5. Starter: Book goes to `wa.me`, and the dashboard shows the locked preview.
  6. All of it at 360px. The lodge site's first-load JS is checked against the page-weight budget.

## Done when

- Owners on Growth and Pro run their bookings in the dashboard: confirm, decline, add, close dates, edit, cancel, and message guests.
- Guests can send requests from any template.
- The landing page and the plan lists stop saying "coming later" for the calendar:
  - `apps/web/src/components/landing/content.ts`
  - `pricing.tsx`
  - `PLANS` in `apps/web/src/lib/lodge.ts`
- Terms and privacy are updated.
- progress.md is ticked.
- architecture.md has a Bookings section.

## Added while building

Asked by the user on 7 October 2026, once the CMS was done:

- **Book first, WhatsApp second (Growth and Pro).**
  - Classic's Book buttons read **Book now** in the lodge's colour, with a calendar icon.
  - The phone's sticky bar is Book now plus a round WhatsApp button.
  - The contact band offers Book now and the WhatsApp number.
  - `BookLink` takes `channel="whatsapp"` for buttons that must always open the chat.
  - Starter sites keep Book on WhatsApp everywhere.
- **Confirm bookings automatically.**
  - An owner switch on the Bookings page (`Lodge.autoConfirmBookings`, migration `lodge_auto_confirm`).
  - When it's on, `POST /api/sites/:slug/bookings` claims the room under the lock (`claimRooms`) and creates the booking CONFIRMED.
  - The guest sees "You're booked".
  - The owner's email says "New booking", and the guest gets the confirmation email when they gave one.
- **Booking data in the dashboard:**
  - the Today strip and a **Coming up** card (next 3 arrivals) on the overview;
  - the stats tile counts site bookings and WhatsApp chats apart (`bookingRequests` in `/api/lodge/stats`);
  - Rooms shows upcoming bookings and offers Hide instead of Delete;
  - Billing notes that bookings stay after a move to Starter.

