# Example content on demo sites

_Built 8 October 2026. Code: `packages/sites/src/samples/`. Tests: `packages/sites/src/samples.test.ts`._

A new site should look full and believable before the owner has added anything, so they see the value first. While a lodge is a **demo**, the API fills each empty section with example content, written for that lodge's type, setting and prices. Nothing is stored: adding one real room replaces the example rooms, and a paid site never shows examples.

| Section | Example | Shown while |
| --- | --- | --- |
| Rooms | 3 or 4 rooms (from `roomsHint`), named for the type and setting, priced around `priceHint`, with beds, size, amenities and a description | No visible room |
| Gallery | Up to 8 stock photos for the setting, rooms and food | Fewer than 3 photos |
| Hero | The first example photo | No hero photo |
| Guest info | Check-in 14:00, check-out 10:00, house rules, a cancellation line and FAQs (from the copy engine) | None of it filled in |
| Reviews (Pro) | 3 example quotes, no score, no source | No reviews |
| Journal (Pro) | 2 example posts with full bodies at `/journal/{post}` | No posts |
| Map | A real Google map of the Reserve Bank of Zimbabwe, Harare | No pin and no Maps link |

## How it works

- **Server only:** `GET /api/sites/:slug` builds the site, then `applySamples(site, { roomsHint, priceHint, pro, today })`. `LiveSite.samples` says which sections are examples, so templates can mark them. The journal endpoints return `samplePosts` for a Pro demo with no posts.
- **Never bookable:** example rooms have `sample-` ids. The bookings API can't find them (400), the booking sheet leaves them out (`booking-site.ts`), and `requestMode` counts only real rooms. On the site, Book on an example room opens a note ("This is an example room…") instead of WhatsApp or the sheet (`BookLink` in `tracking.tsx`).
- **Marked:** a small StayZim "Example" pill (`components/site/sample-badge.tsx`) on example room photos, gallery photos (`isSamplePhoto`: anything under `/samples/`), reviews, guest info, questions, posts and the map ("Example location: add your pin").
- **Dashboard:** Rooms, Gallery and Guest info say what the site shows until the owner adds their own (`components/dashboard/example-note.tsx`).
- **`/create` preview:** `sampleSite()` builds a whole demo site from the answers so far, rendered at `/preview/sample/{template}?name=&town=&country=&kind=&setting=&rooms=&price=&color=`.

## Stock photos

The photo list (`samples/photos.ts`) is empty in the repository today: this environment's network policy blocked the photo hosts, so examples use the designs' colour placeholders. To add photos:

1. Save free-to-use photos (Unsplash or Pexels licences allow commercial use) into `apps/web/public/samples/incoming/{group}/`, where `{group}` is a setting (`mountains`, `lake`, `bush`, `river`, `city`, `farm`) or `rooms`, `food`, `outside`. See the README there.
2. Run `pnpm --filter web sample-photos`. It writes each photo in three widths (1600, 1280 and 640px) to `public/samples/` and rewrites `photos.ts`.
3. List the sources in `public/samples/CREDITS.md`, then commit the photos and `photos.ts`.

They're served from the web app's `public/` folder, so they work on every lodge host, locally, in CI and in production with no R2 step.
