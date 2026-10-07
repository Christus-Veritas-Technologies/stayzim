# Quick wins (5-minute changes)

_Status: **built** (6 October 2026). Small changes that give owners more control. Each is one commit. Read the [CMS architecture](README.md) for the rules they follow._

| # | Change | Plans | Where it's specified |
| --- | --- | --- | --- |
| 1 | Hide or show a room | All | [rooms.md](rooms.md#dashboard) |
| 2 | Duplicate a room | All | [rooms.md](rooms.md#server-appsserversrcroutesroomsts) |
| 3 | Reorder a room's photos (the API exists already) | All | [rooms.md](rooms.md#dashboard) |
| 4 | Most asked-about rooms, on Analytics | Growth, Pro | Below |
| 5 | Edit your name in the account menu | All | Below |

Numbers 1 to 3 ship with the Rooms CMS. Numbers 4 and 5 don't depend on anything and can go at any time.

## 4. Most asked-about rooms

**Why:** owners want to know which rooms guests want, to price them and to choose which photos to show first. The data is already collected: each `BOOKING_CHAT` site event stores its `roomId`.

**Server** (`apps/server/src/routes/stats.ts`), added to the existing `/stats` response for the selected period:

```ts
const byRoom = await prisma.siteEvent.groupBy({
  by: ["roomId"],
  where: { lodgeId, type: { in: ["BOOKING_CHAT" /*, "BOOKING_REQUEST" once bookings land */] }, roomId: { not: null }, createdAt: { gte: since } },
  _count: { _all: true },
  orderBy: { _count: { roomId: "desc" } },
  take: 5,
});
// → topRooms: { roomId, name, count }[]; names from the lodge's rooms, deleted rooms dropped
```

**Web:**

- A new **Most asked-about rooms** card on `apps/web/src/app/dashboard/analytics/page.tsx`, next to countries.
- It has up to 5 rows: the room thumbnail (`RoomThumb` from `components/dashboard/room-bits.tsx`), the name, the count, and a bar sized against the top room. The bars grow in on mount, and not with reduce motion.
- Empty state: "When guests tap Book on a room, it shows here."
- On Starter it sits inside the existing locked preview with sample rows.

**Test:** a unit test for the shaping (deleted rooms dropped, ties in a stable order). The Playwright analytics check sees the card.

## 5. Edit your name

**Why:**

- The overview greeting (first name), the sidebar account card, the avatar and emails use the account name.
- Sign-ups typed it in a hurry.
- Owners created with `create-owner` can't change it at all.

**Web:**

- The account menu (`apps/web/src/components/dashboard/account-menu.tsx`) gains **Your name**, which opens a small dialog with one `Input` (2–60 characters) and Save.
- It calls `authClient.updateUser({ name })`, which better-auth already supports, so the server needs no change.
- It then refreshes the session (`authClient.getSession()`) and shows the toast "Name saved".

**Email stays a change request.** Changing a login email needs verification (better-auth's `changeEmail` with an email to the new address), which is [Later](README.md#later).

**Test:** Playwright changes the name; the sidebar account card and the overview greeting update.
