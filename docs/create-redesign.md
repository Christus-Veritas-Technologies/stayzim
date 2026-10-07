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
- **Funnel:** unchanged event names (`create_open`, `create_lodge`, `create_photo`, `create_live`, `create_claim`). There's no event for the look step yet; see [what's left](#whats-left).

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

**What the message means:** it's Traefik's 503.

- A router **did** match the host (with no match you'd get `404 page not found`), but the service behind it has **no server to send to**.
- So the DNS, Cloudflare and the `stayzim-sites` HostRegexp rule are probably fine. The service side is what's broken.

**Likely causes, most likely first:**

1. **The web container isn't healthy yet, or is unhealthy.**
   - `apps/web/Dockerfile` has a `HEALTHCHECK`. Traefik's Docker provider leaves out containers whose health isn't `healthy`.
   - If the root domain also fails at that moment, this is it. `docker ps` shows `(unhealthy)` or `(health: starting)`.
   - The check fetches `/` on port 9999 inside the container. Look at `docker inspect --format '{{json .State.Health}}' <web container>`.
2. **Two containers define the same router or service names** (`stayzim-sites`, `stayzim-custom-domains`).
   - For example, an old web application left running beside the compose resource, or a staging copy of the compose file.
   - Traefik merges or conflicts them, and the copy that wins can point at a container that's stopped or unhealthy.
   - Rename the routers per environment, or stop the old resource.
3. **Web was deployed as a separate Coolify application, not the compose resource,** with `*.stayzim.co.zw` typed in as a domain. Coolify then writes its own router for it, which may not work. The compose file's labels only apply when web is deployed from `deploy/compose.yaml`.
4. **Traefik picks the wrong network for the container.**
   - It's attached to the compose network and the `coolify` network. With more than one network, Traefik can choose an address it can't reach.
   - That usually gives `Bad Gateway` or a timeout rather than "no available server", but it's worth ruling out.
   - Coolify adds `traefik.docker.network` to the domains it manages, not to our hand-written labels.

**How to check, on the VPS** (Coolify → Servers → Terminal, or SSH):

```bash
# 1. Is web healthy?
docker ps --format '{{.Names}}\t{{.Status}}' | grep -i web

# 2. Which containers carry the lodge-site routes?
docker ps -q | xargs docker inspect --format '{{.Name}} {{index .Config.Labels "traefik.http.routers.stayzim-sites.rule"}}' | grep -v ' $'

# 3. Ask Traefik directly, from the server, with a lodge's host name
curl -sk --resolve mistvalley.stayzim.co.zw:443:127.0.0.1 https://mistvalley.stayzim.co.zw/ -o /dev/null -w '%{http_code}\n'

# 4. Traefik's view of the routers and services (Coolify's proxy container is coolify-proxy)
docker logs coolify-proxy 2>&1 | grep -iE 'stayzim-sites|no available|error' | tail -30
```

**Fixes, in order:**

1. **Unhealthy web:** fix what the health check reports, then redeploy. While testing, removing the `HEALTHCHECK` from the web image tells you quickly whether it's the cause.
2. **Duplicate routes:** keep one resource that serves web (the compose resource from `deploy/compose.yaml`), and stop or delete the others.
3. **Separate application:**
   - Either deploy from `deploy/compose.yaml` as [deployment.md](deployment.md#3-coolify) describes;
   - or copy the `traefik.*` labels from the `web` service in `deploy/compose.yaml` into that application's Container Labels (Coolify → the application → General → Container Labels).
   - Remove any `*.stayzim.co.zw` domain typed into Coolify.
4. **Network:** add `traefik.docker.network=<the network both Traefik and web are on>` to the web labels. Coolify's proxy network is usually `coolify`; check with `docker inspect coolify-proxy`.

**Not yet confirmed:** this needs someone with access to the VPS. When it's found, note the cause in [deployment.md](deployment.md#troubleshooting) and tick it off in the list below.

## What's left

In order of value:

1. **Production "no available server"** (above). Needs VPS access; the user is the one who can run the commands, or give an agent a shell.
2. **A Preview on each design tile** (step 1).
   - `/preview/{slug}/{template}` already shows a lodge in any design.
   - Once the demo lodges are seeded in production (`seed-demos`), add a Preview link on each tile pointing at a demo lodge, e.g. `/preview/msasaridge/{key}`, in a sheet or a new tab.
   - Leave it out until those lodges exist, or it 404s.
3. **A funnel event for the look step:**
   - `trackCreateStep("look")` and `metaCreateStep("look")` when Next is pressed on step 1.
   - Add `"look"` to the step union in `lib/track.ts` and `lib/meta-pixel.ts`, then the event to the funnel query.
   - It shows how many people drop off at the designs.
4. **Captions on new uploads** (99.co's "Manage photos" panel):
   - Gallery already edits captions inline.
   - If wanted: a caption field on each photo as it finishes uploading, saved with `PATCH /photos/:id`.
5. **Real phones:** check the dropzone's touch title, the sticky Next on iOS Safari with the keyboard open, and the picker opening from a tap anywhere on the area.
6. **Plan not tied to the design** (only if the user asks):
   - Today the plan comes with the design (Canopy → Pro), which keeps step 1 about the look.
   - Someone who wants Pro with a Starter design picks the design here and changes plan on Billing later.

## Rules for whoever continues

- **Use the design system.** The user said so twice; bad designs are not acceptable.
  - Before adding UI, look at how the dashboard does it: `PageHeader`, `FormSection`, `shadow-card` cards, `Badge`, `Button` variants, the `brand`, `ink`, `muted` and `line` tokens.
  - The app screens are in `designs/StayZim App Screens.html`.
- **No new upload UI:** use `PhotoDropzone`, with `UploadTile` for items in flight.
- **Keep it moving:** `/create` must stay about 90 seconds and mobile first. Don't add fields before the site is live: town, rooms, logo and the rest belong to the dashboard checklist.
- **Commits:** one per small task, on `main`, never with a Co-Authored-By line.
