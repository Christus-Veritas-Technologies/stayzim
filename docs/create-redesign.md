# /create redesign, the look step and the photo dropzone

_The plan for the October 2026 sign-up redesign: what was asked, what was built, what's left, and the open production bug. Read this before working on `/create`, photo uploads or lodge-subdomain routing. For the wider state of the project, see [progress.md](progress.md)._

**Last updated:** 7 October 2026

## What the user asked

On 7 October, with five reference screenshots:

- **A better multi-step form for `/create`, built from the design system.**
  - The user's words: "the design system has already been set up, use that."
  - Don't invent new colours, fonts or one-off components. Use the tokens in `packages/ui/src/styles/globals.css` and the components in `packages/ui`, as the dashboard does.
- **Add the steps they never saw: a template and a plan.**
  - "Lead with the templates, then let the price just be subtly shown. The main point isn't the price, it's the template itself."
- **A better photo upload field "across the entire app, wherever refs are".**
- **Fix "no available server"** when opening the new site from the live/claim screen in production. The user says the request reaches their server and the SSL certificate is fine.
- **A detailed plan, updated docs and a handover**, so a new agent can carry on.

The reference images, and what each one gave the design:

| Reference | Pattern taken | Where it went |
| --- | --- | --- |
| Ziemann "Vehicle information" form | A sidebar card of numbered steps (number, title, detail, a line joining them); a big title with a divider under it; Back and Next | `CreateFrame`'s sidebar (`StepList`), `CreateHeading`'s divider, `CreateActions` |
| US Mobile "First, choose your plan!" | A numbered question as the heading; a thin progress bar with "Step 1 of 4"; selectable rows with the price small on the right; a full-width Next | "First, pick a look"; the step line and bar at the top of the card; the price small on each design tile; full-width Next on phones |
| "Request a Quote" card | A 2×2 grid of selectable tiles; the picked one gets a coloured border | The design tiles: 2 columns on phones and 3 on wider screens, with a brand ring (`layoutId`) and a check on the picked one |
| 99.co "Upload photos" | A dashed drag-and-drop area with an Upload photos button; a "+40% quality" hint; thumbnails with ✕; a quality score card; optional captions | `PhotoDropzone` (everywhere photos go in); the green tip chip; ✕ on `/create` thumbnails; the "Your first look" meter. Gallery already had inline captions |
| Mobile onboarding ("Welcome! What's your name?") | A round back button top left; a pill of dots top right; one big question; one big input; a full-width rounded Continue | The phone header (`StepDots`, round Back); "What's your lodge called?" with 48px inputs; sticky full-width Next |

## What was built

Commits on `main`: `ddea09e` (server) and `d04ee19` (web).

### `/create` is now three steps, then live

| Step | Screen | URL |
| --- | --- | --- |
| 1 of 3 · about 90 s | **Pick a look:** all nine designs as tiles (`TemplateThumb` sketches), each with a short line and its plan's price small (`$40/mo`). One is always picked: Shoreline by default, or the default design of the plan on the link (`?plan=pro` → Escarpment). The note by Next says which plan the design comes with, and what it costs after the free 2 days | `/create?step=look&look=growth-shoreline` |
| 2 of 3 · about 60 s | **What's your lodge called?** Lodge name and WhatsApp (48px inputs, 16px text so iOS doesn't zoom). Back returns to the looks with the pick kept. Next makes the guest account and the lodge, **in the picked design, on that design's plan** | `?step=lodge&look=…` |
| 3 of 3 · about 30 s | **Add 3 photos:** the dropzone, then thumbnails with ✕ (it deletes the saved photo) and a "Your first look 0 of 3" meter. Once three are in, the dropzone goes away. "No photos on this phone? Go live without them" stays | `?step=photos&look=…` |
| Live | Unchanged: open, share, Claim my site | `?step=live&look=…` |

- **Files:**
  - `apps/web/src/app/create/page.tsx`: the step machine (`look`, `lodge`, `photos`, `live`). The step and the look are in the URL, so a reload carries on.
  - `components/create/frame.tsx`:
    - `CREATE_STEPS`;
    - `CreateFrame` (the sidebar `StepList` at `lg` and up; the phone header with Back and `StepDots` below `lg`; "Step N of 3" with a thin bar; the live preview column at `xl` and up);
    - `CreateHeading`;
    - `CreateActions` (Back at `lg` and up, a note, the main button; `sticky` keeps it at the bottom of the screen on phones).
  - `components/create/look-step.tsx`: `LookStep`, `lookFromParams`, and the one-line descriptions in `LOOKS`.
  - `components/create/lodge-step.tsx`: it now sends `template` and the design's `plan`.
  - `components/create/photos-step.tsx`: the dropzone, ✕ remove, the `FirstLook` meter.
  - `components/create/preview.tsx`: `DEFAULT_THEME` is exported. The phone strip (`MiniPreview`) now shows up to `xl`, because the right column only appears at `xl`.
- **Layout by width:**
  - Below `sm`: a white screen, no card. Round Back and the dots at the top. Big question, then full-width Next, kept in view at the bottom on long steps.
  - `sm` to `lg`: the same, inside a white card on `surface-2`.
  - `lg` to `xl`: adds the steps sidebar (wordmark, "Your lodge's website", the 4 steps with ticks, "Free for 2 days").
  - `xl` and up: adds the live phone preview on the right (not on the look step: the tiles are the preview there).
- **Motion** (framer-motion; the app's `MotionConfig reducedMotion="user"` turns it off):
  - each step rises in;
  - the sidebar's current-step halo moves with `layoutId`;
  - the joining lines fill;
  - the active dot stretches;
  - the picked design's ring slides between tiles;
  - the check pops;
  - tiles lift on hover.
- **API:** `POST /api/onboarding/lodge` takes an optional `template` (one of `TEMPLATE_KEYS`). It answers 400 "That design needs a bigger plan." if the plan sent doesn't include it, and falls back to the plan's default design when there's none (`apps/server/src/routes/onboarding.ts`).
- **Funnel:** `create_open`, `create_look` (added in the second pass), `create_lodge`, `create_photo`, `create_live`, `create_claim`.

### One photo dropzone for the whole app

`PhotoDropzone` in `apps/web/src/components/dashboard/photo-tiles.tsx` replaces the old `AddPhotosTile` and `FullTile`:

- **What it is:** a `<label>` around a visually hidden file input, so a click or tap anywhere on it opens the picker.
  - Keyboard users tab to the input; the focus ring shows on the whole area through `has-[input:focus-visible]`.
  - Photos dropped from a computer are taken too. While dragging, it turns `brand-wash` and the icon lifts.
- **Titles:** "Drag photos here" with a mouse, "Add photos from your phone" on touch screens (`pointer-coarse:`).
- **Props:**
  - `size="lg"`: stands on its own, centred.
  - `size="sm"`: a row, for sheets and the logo. On phones the button wraps to a full-width line.
  - `multiple`, `title`, `touchTitle`, `note`, `action` (the button's words).
  - `tip`: the green chip.
  - `media`: in place of the icon, e.g. the current logo.
  - `full={{ limit, what }}`: "{what} is full · 10 of 10".
  - `busy`, `disabled`.
  - `children`: extra buttons such as Remove. Buttons inside a label don't open the picker.

Used in:

| Place | Variant |
| --- | --- |
| `/create` photos step | `lg` with the "Daylight photos look best" tip until the first photo; `sm` "Add another photo" after; gone at 3 |
| Gallery (`app/dashboard/gallery/page.tsx`) | `lg` above the grid until the gallery has `GALLERY_GOAL` (5) photos, then `sm`; full at 30. The header's Upload button and the grid's add tile are gone |
| Room sheet (`components/dashboard/room-sheet.tsx`) | `sm` above the room's photos; full at `ROOM_PHOTO_LIMIT` |
| Logo (My site → Look, `app/dashboard/site/page.tsx`) | `sm`, one file, with the current logo as `media` and Remove beside Upload |

`UploadTile` (progress ring, waiting, failed with Retry) is unchanged and still shows each photo on its way up.

### Checked

- `pnpm check-types` and `pnpm test` (46 unit tests) pass.
- Playwright: `create.e2e.ts` (now picks Rondavel, goes Back and on again, and checks the Design screen shows Rondavel live) and the whole `mobile.e2e.ts` (every page at 360px) pass: 22 tests.
- Screenshots at 360 and 1280 of every step, Gallery, the room sheet and the logo.
- Automated, a site goes live in about 7 seconds.

## The production bug: "no available server"

**Symptom:** on stayzim.co.zw, Open my site on the live screen (`https://{slug}.stayzim.co.zw`) shows Traefik's plain-text page `no available server`. The certificate is fine and the request reaches the VPS.

**What each Traefik answer means.** Tested on 7 October against Traefik v2.11 and v3.6 in Docker, with the same labels as `deploy/compose.yaml` and a stand-in web container:

| What you see | Cause seen in the tests |
| --- | --- |
| `no available server` (503) | A route matched, but Traefik's **own health check** on the service (`loadbalancer.healthcheck` labels, or a `healthCheck` in a dynamic configuration file) marked every server down. Nothing else gave exactly this text |
| `404 page not found` | No route matched. Either the labels are missing; or web isn't `healthy` yet (Traefik leaves it out); or the rule is one this Traefik can't read: the old v3-only `HostRegexp` rule never matches on Traefik v2 or with `core.defaultRuleSyntax=v2`; or Traefik is older than v3.6 on Docker 29+ and can't read any container (`client version 1.24 is too old` in its log) |
| `Gateway Timeout` (504) | Traefik picked a network it can't reach web on |
| `Internal Server Error` (500) from Traefik | `allowEmptyServices=true` and web not healthy |

**What changed in the repo:**

- **`deploy/compose.yaml` lodge-site route.**
  - Now one catch-all `PathPrefix(`/`)` at priority 1, in place of the two `HostRegexp` routers.
  - `PathPrefix` reads the same in Traefik v2 and v3, so lodge subdomains and lodges' own domains route on either.
  - Coolify's routes for the named domains (`stayzim.co.zw`, `www.`, `api.`) have higher priority, and the tests show they keep them.
- **`deploy/check-routing.sh`:** run on the VPS. It reads, and changes nothing:
  - the Docker and Traefik versions, and the proxy's rule-syntax and empty-services settings;
  - which containers carry the route, with their health, networks and rule;
  - any Traefik health check, and Coolify's dynamic configuration;
  - Traefik's own answer for the root and a lodge host;
  - the proxy's recent errors.

  Each problem it finds comes with the fix. It was run against each case above.

**What the user should do:**

1. Redeploy from the latest `main`, so the new route is live.
2. In the server's terminal (Coolify → Servers → your server → Terminal), paste and run `deploy/check-routing.sh`, or run `bash check-routing.sh mistvalley stayzim.co.zw` after copying it over.
3. Fix what it lists:
   - **A Traefik health check:** remove it. Coolify's own health check for a resource is Docker's, which is fine.
   - **Stale or duplicate web containers:** stop them.
   - **An outdated proxy:** update it in Coolify → Servers → Proxy.
   - **A `*.stayzim.co.zw` route in Coolify's dynamic configuration:** remove it.
4. If it reports no problems but the browser still shows the error, purge Cloudflare's cache.

**Not yet confirmed on the real server:** it needs someone with access to the VPS. When the cause is found, note it in [deployment.md](deployment.md#troubleshooting).

## Added on 7 October (second pass)

- **Preview on each design** (`look-step.tsx`):
  - An eye button on each tile opens a sheet with that design on one of the landing page's example lodges (`LODGES` in `components/landing/content.ts`).
  - It uses a paid one first, so the preview has no demo badges, through `/preview/{slug}/{key}`. Phone or Desktop size, Open in a new tab, and **Use {design}**, which picks it and closes.
  - The button shows on hover with a mouse, and always (icon only) on touch screens.
  - If no example lodge is live (a fresh install before `seed-demos`), there's no Preview button at all.
  - The frame is shared with the Design screen: `components/dashboard/template-preview-frame.tsx` (`TemplatePreviewFrame`, `PreviewWidthTabs`).
- **The look step in the funnel:**
  - Next on step 1 sends `create_look` (and Meta's `CreateStep` with `look`).
  - `pnpm --filter server funnel [--days 30] [--source meta]`, or `bun scripts/funnel.ts` in the container, prints people per step (open, look, lodge, photo, live, claim) and their share of those who opened `/create`, per advert source.
- **Captions:** a Gallery photo without a caption says **Add a caption** with a pencil, and the page header says captions are optional.
- **Copy:** once photos are in, the small dropzone on `/create` no longer repeats "1 more for the best first look"; the note by Go live says it.
- **Checked on an emulated phone** (Galaxy S9+, touch):
  - the dropzone says "Add photos from your phone";
  - a tap anywhere on it opens the picker;
  - Next and Go live stay in view at the bottom;
  - nothing scrolls sideways.
- **Tests:** a new browser test opens Wordmark's preview and uses it. `create`, `mobile` and `templates` pass (36 tests), as do the unit tests and types.

## Added on 8 October (value first)

- **Plan tabs:** the look step shows the designs one plan at a time, Starter first, the price small in each tab.
- **Your place:** a new step 2 (type of place, setting, rooms, a typical price); the lodge step adds town and country. Four steps now, then live.
- **The real preview:** the column beside the form is the picked design in a scaled phone (`/preview/sample/{template}` before the lodge exists, then the lodge's own site), updated once typing pauses without blanking.
- The site it makes has generated copy and example content: see [cms/copy.md](cms/copy.md) and [cms/examples.md](cms/examples.md).

## What's left

1. **Run `deploy/check-routing.sh` on the VPS** and fix what it reports (above). Only the user, or an agent with a shell on the server, can.
2. **Seed the example lodges in production** (`seed-demos`, then real photos as each demo owner). The landing page's example links and the Preview on each design both use them.
3. **Real phones:**
   - iOS Safari with the keyboard open on the lodge step (the sticky Next);
   - the photo picker on Android Chrome.
   - Everything else was checked on an emulated phone.
4. **Plan not tied to the design** (only if the user asks):
   - Today the plan comes with the design (Canopy → Pro), which keeps step 1 about the look.
   - Someone who wants Pro with a Starter design picks the design here and changes plan on Billing later.

## Rules for whoever continues

- **Use the design system.** The user said so twice; bad designs are not acceptable.
  - Before adding UI, look at how the dashboard does it: `PageHeader`, `FormSection`, `shadow-card` cards, `Badge`, `Button` variants, the `brand`, `ink`, `muted` and `line` tokens.
  - The app screens are in `designs/StayZim App Screens.html`.
- **No new upload UI:** use `PhotoDropzone`, with `UploadTile` for items in flight.
- **Keep it moving:** `/create` must stay about 90 seconds and mobile first. Don't add fields before the site is live: town, rooms, logo and the rest belong to the dashboard checklist.
- **Commits:** one per small task, on `main`, never with a Co-Authored-By line.
