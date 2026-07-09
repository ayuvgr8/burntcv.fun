# OpenSlot — Launch Film

A ~67-second product launch film for **OpenSlot** (openslot.space), built in
Remotion and matched to the live site's brand: warm cream canvas, near-black
ink, one friendly green accent, Gabarito headings + Space Mono eyebrow labels.

The story mirrors what the product actually does — **a guest leaves a 30-second
voice note when they book, and Claude turns it into a meeting brief** (the ask,
the talking points, the flags) before the call — plus the storefront and
India-first payments.

- **Composition id:** `OpenSlot`
- **Format:** 1920×1080, 30fps, 2010 frames (67s)

## Hybrid look

Per the brand, the film alternates two backdrops with a cross-fade:

- **Cream** — narrative beats (intro, voice note, before/after, storefront,
  payments, outro).
- **Dark stage** — cinematic product-demo shots where the light app windows
  float (bookings, the Claude brief artifact, dashboard).

## Structure

| File | Role |
|---|---|
| `OpenSlotFilm.tsx` | Master timeline — cream↔stage background cross-fade, scenes, captions |
| `theme.ts` | Brand tokens (cream/ink/green + dark-stage) and timing helpers |
| `fonts.ts` / `fontData.ts` | Gabarito + Space Mono, embedded as base64 data URIs |
| `icons.tsx` | Line-style SVG icon set (replaces all emoji) |
| `primitives.tsx` | Backgrounds, logo, light `Window`, eyebrow, badges, cursor, subtitles |
| `mocks.tsx` | Real product UI — bookings app, Claude brief, voice-note capture, dashboard, storefront, payments |
| `captions.ts` | Voiceover lines as tone-aware subtitles |
| `scenes/` | One component per beat (Intro → Bookings → Voice note → Brief → Before/After → Dashboard → Storefront+Payments → Outro) |

### Scene map (absolute frames)

```
0–210     Intro           "Every booking, already briefed."
210–450   Bookings        app list · Will Buyers already "Brief ready"      [stage]
450–710   Voice note      guest records a 30-sec note
710–1080  Claude brief    the artifact builds line by line                 [stage]
1080–1360 Before / after  "a name and a time" vs "context, brief & payment"
1360–1600 Dashboard       bookings, briefs, revenue at a glance            [stage]
1600–1850 Storefront + payments   products · UPI / Razorpay / global
1850–2010 Outro           end card · openslot.space · Start free
```

## Preview / render

```bash
npm run dev            # Remotion Studio
```

In this sandboxed environment, point Remotion at the pre-installed headless
shell (the Chrome download host is blocked):

```bash
npx remotion render OpenSlot out/OpenSlot.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

## Notes

- **Fonts** are embedded as base64 data URIs (`fontData.ts`) via an injected
  `@font-face` stylesheet — no network fetch, no `delayRender` (fetching over
  the render server stalled under concurrency). Regenerate from
  `public/fonts/*.woff2` if the fonts change.
- **Icons** are all SVG (`icons.tsx`), currentColor-driven — no emoji anywhere.
- **Audio** is not bundled. The narration is shown as synced subtitles; to add a
  real AI voiceover + ambient bed, drop files in `public/`, render them with
  `<Audio>` from `@remotion/media` in `OpenSlotFilm.tsx`, and align `captions.ts`
  `from` values (or remove the subtitles).
