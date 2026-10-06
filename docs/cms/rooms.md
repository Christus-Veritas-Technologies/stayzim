# Core: the content contract and the Rooms CMS

_Status: **planned.** All plans. Read the [CMS architecture](README.md) first._

Two steps, built in order:

1. **Foundation.** Move the shapes into `packages/sites/src/content/`. Nothing visible changes.
2. **Rooms CMS.** Owners describe each room properly, say how many they have, hide rooms, duplicate them and order their photos.

The quick wins that belong to rooms are part of step 2:

- hide or show a room;
- duplicate a room;
- reorder a room's photos.

## 1. Foundation

**Goal:** one source for every shape and limit. The app behaves exactly as before.

1. **`packages/sites`:**
   - Add `zod` (`catalog:`) to `package.json`.
   - Create `src/content/` with `limits.ts`, `amenities.ts`, `schemas.ts`, `site.ts`, `dashboard.ts` and `dates.ts` ([README](README.md#where-it-lives)).
   - Export it all from `src/index.ts`.
   - Move the current numbers into `limits.ts`. Today they're spread across:
     - `apps/server/src/routes/rooms.ts` (`MAX_ROOMS`, the room limits);
     - `apps/server/src/routes/photos.ts` (5 per room, 30 in the gallery, caption 80);
     - `apps/server/src/routes/lodge.ts` (name 80, description 300, town 60);
     - `apps/web/src/lib/lodge.ts` (`ROOM_PHOTO_LIMIT`).
2. **Amenities:**
   - The keys and labels move to `amenities.ts`.
   - `apps/web/src/lib/lodge.ts` keeps `AMENITIES` as `{ label, icon }`, built from the shared labels and an icon map typed `satisfies Record<AmenityKey, LucideIcon>`.
   - The server's `AMENITIES` tuple in `routes/rooms.ts` goes.
3. **Server:**
   - `lodgeUpdateSchema` and `roomSchema` become the shared `lodgePatch` and `roomInput`. The `phoneNumber` and `optionalText` helpers in `apps/server/src/lib/lodge.ts` move with them.
   - `lodgeJson()` is checked with `satisfies DashboardLodge`.
   - The LIVE projection in `routes/sites.ts` is checked with `satisfies LiveSite`.
4. **Web:**
   - `Lodge`, `Room` and `Photo` in `apps/web/src/lib/lodge.ts`, and `PublicSite` and `LiveSite` in `apps/web/src/lib/site.ts`, become re-exports of the shared types. Keep the names, so imports across the app don't change.
   - `getSite` runs `publicSiteSchema.parse` on the server.
   - **zod must not reach a lodge site's browser bundle.** It was taken out on purpose (commit 6081f4b, `lib/public-env.ts`).
     - Today `lib/site.ts` is only imported by server components: the templates, `sites/[slug]/page.tsx` and the preview page. Keep it that way.
     - Client components (`tracking.tsx`, the booking sheet) import types only (`import type`) from `@stayzim/sites`. Any helper they need goes in a file with no zod imports.
     - Check the built client chunks for zod (`grep -l "ZodError" .next/static/chunks/*`) before and after.
5. **Tests** (`packages/sites/src/content/*.test.ts`):
   - Every schema accepts today's real data (copy a `mistvalley` payload).
   - Every schema rejects each limit +1.
   - `publicSiteSchema` fills defaults for a payload missing the new fields.

**Done when:** `pnpm check-types` and `pnpm test` pass; the Playwright smoke and 360px suites pass unchanged; the lodge site's first-load JS hasn't grown.

## 2. Rooms CMS

### Data

Migration `room_details`, written with `prisma migrate diff`, as the README's database section explains:

```prisma
model Room {
  // … existing fields
  description String?              // ≤ 400
  beds        String?              // ≤ 60
  size        Int?                 // m², 5–1000
  units       Int     @default(1)  // 1–50
  visible     Boolean @default(true)
}
```

These fields are additive, have defaults and need no backfill.

### Schema (`packages/sites/src/content/schemas.ts`)

```ts
export const roomInput = z.object({
  name: z.string().trim().min(1, "Add the room name").max(ROOM_LIMITS.name),
  price: z.number().int("Use whole dollars").min(1, "Add the price per night").max(ROOM_LIMITS.priceMax),
  sleeps: z.number().int().min(1).max(ROOM_LIMITS.sleepsMax),
  units: z.number().int().min(1).max(ROOM_LIMITS.unitsMax).default(1),
  visible: z.boolean().default(true),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(AMENITY_KEYS.length).default([]),
  description: optionalText(ROOM_LIMITS.description, "Keep the description under 400 characters"),
  beds: optionalText(ROOM_LIMITS.beds),
  size: z.number().int().min(5).max(1000).nullable().default(null),
});
export const roomPatch = roomInput.partial();
```

`optionalText` turns empty text into `null`. It's the helper moved from `apps/server/src/lib/lodge.ts`.

### Server (`apps/server/src/routes/rooms.ts`)

- **`POST /` and `PATCH /:id`:** take the new fields.
- **`POST /:id/duplicate`:**
  - copies every field except the photos;
  - the name becomes "{name} (copy)", cut to 60 characters;
  - the copy starts with `visible: false` and goes straight after the original;
  - refuses past `MAX_ROOMS` with the existing sentence;
  - returns `{ roomId, lodge }`, like `POST /`.
- **`DELETE /:id`:**
  - Before the bookings feature: as today.
  - After it: refused with 409 when the room has bookings (`onDelete: Restrict`). There are two sentences:
    - "Hillside has 2 upcoming bookings. Hide it instead, or cancel them first", when any are upcoming;
    - "Hillside has past bookings, so it can't be deleted. Hide it instead", when they're all in the past.
- **`apps/server/src/lib/lodge.ts`:** `roomJson` adds `description`, `beds`, `size`, `units`, `visible`, and `upcomingBookings` (0 until bookings exist).
- **`routes/sites.ts`:**
  - Public rooms are `where: { visible: true }` and send `description`, `beds` and `size`.
  - The intro chips in Classic ("N rooms", "Sleeps up to", "From $X") then count visible rooms only, with no template change.

### Dashboard

**Rooms page (`apps/web/src/app/dashboard/rooms/page.tsx`):**

- **Each row and card shows:**
  - "× 6" next to the name when `units > 1`;
  - a **Hidden** badge (muted) when `!visible`. `RoomStatus` in `components/dashboard/room-bits.tsx` gains a "Hidden" state that wins over "Needs photo".
- **Row menu (the existing `DropdownMenu`):** Edit, **Duplicate**, **Hide from site / Show on site**, Move up, Move down, Delete.
  - **Hide or show** saves at once (`PATCH {visible}`), with the toast "Hillside is hidden from your site" and an Undo action.
  - **Duplicate** shows the toast "Copy added (hidden until you show it)" and opens the copy's sheet.
- **Tabs:** All rooms · Missing photos · **Hidden**. The Hidden tab only appears when there's a hidden room.
- **Sidebar** (`components/dashboard/nav.ts`): Rooms adds "1 hidden" next to "N without a photo".
- **Checklist** (`setupSteps` in `apps/web/src/lib/lodge.ts`): "Add rooms" is done only when at least one room is visible.

**Room sheet (`apps/web/src/components/dashboard/room-sheet.tsx`):**

Same sheet, same draft, same Save and discard rules. The form is grouped:

1. **Basics:**
   - name;
   - price ("$ … / night");
   - sleeps;
   - **How many of this room do you have?** A `NumberField` from 1 to 50, with the hint "Guests see it once. We use the number for bookings."
2. **Details · Optional** (a `Collapsible`, open when any field is set):
   - **Description:** `Textarea` with a 0/400 counter. Placeholder: "A quiet rondavel with a view of the hills, a private veranda and an outdoor shower."
   - **Beds:** placeholder "1 queen + 2 singles".
   - **Size:** "m²", digits only.
3. **Amenities:** as today.
4. **Photos:**
   - Drag to reorder, using the framer-motion `Reorder` list the gallery uses, plus Move earlier and Move later in a tile menu for keyboard and touch.
   - It saves at once with `PUT /api/lodge/photos/order { roomId, ids }`. The endpoint already exists.
   - The first photo is the Cover, as today.
   - **Not while the room is being created.** Pending photos keep their pick order until the room exists.
5. **Show on site:**
   - a `Switch` (new `packages/ui/src/components/switch.tsx` on Base UI's Switch);
   - hint when off: "Hidden rooms stay here, guests don't see them."

Other rules:

- Client validation is `roomInput.safeParse` (so `sleeps`, `units` and `size` errors read like the server's).
- `draftFrom` and the "edited" check cover the new fields.
- **Lowering "how many"** below what's already booked shows a warning above Save once bookings exist: "12 Oct already has 5 booked; you'd have 4". It still saves.

### Lodge site

- **Classic** (`apps/web/src/components/site/templates/classic.tsx`), in each room card:
  - `roomFacts(room)` under the name ("Sleeps 4 · 1 queen + 2 singles · 32 m²"), replacing the current sleeps line;
  - the description under the amenities, clamped to 3 lines, with a "More" toggle when it's longer. Line breaks are kept with `whitespace-pre-line`.
- **`apps/web/src/lib/site-content.ts`:** new, with `roomFacts` and `formatSize`, plus unit tests next to `site.test.ts`.
- **Placeholders:** not touched. Hidden rooms vanish for them through the server.
- **SEO:** each visible room is added to the site's JSON-LD as a `HotelRoom` with `bed`, `occupancy` and `floorSize`. That goes in a `<script type="application/ld+json">` in `app/sites/[slug]/page.tsx`, outside the template.

### Tests

- **Unit:**
  - `roomInput` limits;
  - `roomFacts` (every combination of missing fields);
  - the duplicate name cut at 60 characters.
- **Playwright** (`apps/web/e2e/`):
  - add a description, beds, "how many" 3, then save; the site shows the facts and description;
  - hide the room; it's gone from the site, and the intro chips update;
  - show it again;
  - duplicate; the copy is hidden and opens in the sheet;
  - reorder 2 photos; the site's cover changes;
  - all of it again at 360px.

**Done when:**

- Owners can do all of the above without a change request.
- The ROOMS topic example in `apps/web/src/lib/requests.ts` ("now sleeps 4 and costs $95") is changed to something owners still need us for.
- Docs are updated:
  - progress.md: the checklist and the log;
  - architecture.md: the Data table.
