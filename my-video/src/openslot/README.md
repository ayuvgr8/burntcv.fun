# OpenSlot — Launch Film

A 65-second product launch film for **OpenSlot** (a Google Calendar scheduling
tool), built entirely in Remotion. Style: minimal, modern — Apple-meets-Linear,
dark ambient palette, fast pacing with cinematic dissolves.

- **Composition id:** `OpenSlot`
- **Format:** 1920×1080, 30fps, 1950 frames (65s)

## Structure

| File | Role |
|---|---|
| `OpenSlotFilm.tsx` | Master timeline — background, scenes, and captions on absolute frames |
| `theme.ts` | Design tokens (colors, easing) + timing helpers (`riseIn`, `ramp`, `envelope`) |
| `fonts.ts` / `fontData.ts` | Inter + JetBrains Mono, embedded as base64 data URIs (see note below) |
| `primitives.tsx` | Background, `LogoMark`, `Window` (browser chrome), `Cursor`, `CodeLabel`, `Subtitle` |
| `mocks.tsx` | Product UI mockups (dashboard, OAuth consent, calendar list, booking page, Google Calendar, confirmation, privacy) |
| `captions.ts` | Voiceover lines timed as lower-third subtitles |
| `scenes/` | One component per beat (Intro → Connect → Calendars → Availability → Booking → Privacy → Outro) |

### Scene map (absolute frames)

```
0–150     Intro          logo, "Meet OpenSlot", zoom to dashboard
150–360   Connect        homepage → Google OAuth consent + permission callouts
360–660   Calendars      calendar-list selection · calendar.calendarlist.readonly
660–1050  Availability   free/busy detection · calendar.freebusy
1050–1500 Booking         create → Google Meet → reschedule → cancel · calendar.events
1500–1740 Privacy        connected account, shield, "no ads / no selling data"
1740–1950 Outro          fast montage → end card (openslot.io)
```

## Preview

```bash
npm run dev            # Remotion Studio
```

## Rendering

In most environments:

```bash
npx remotion render OpenSlot out/OpenSlot.mp4
```

**In this sandboxed/cloud environment**, the Chrome-headless-shell download host
is blocked, so point Remotion at the pre-installed shell binary:

```bash
npx remotion render OpenSlot out/OpenSlot.mp4 \
  --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```

## Notes

- **Fonts** are embedded as base64 data URIs (`fontData.ts`) and registered with
  an injected `@font-face` stylesheet. This is deliberate: fetching font files
  over the render server stalled under render concurrency, and a `delayRender()`
  font wait timed out during composition selection. Data URIs decode instantly
  with no network. Regenerate `fontData.ts` from `public/fonts/*.woff2` if the
  fonts change.
- **Audio** is not included. The film was scripted with a natural AI voiceover +
  dark ambient piano; those tracks aren't bundled (no TTS/music assets in this
  environment). The narration is currently shown as synced on-screen subtitles.
  To add real audio:
  1. Generate a voiceover track (see the `voiceover` rule in the Remotion skill —
     ElevenLabs TTS) and a music bed; drop the files in `public/`.
  2. Render them with `<Audio>` from `@remotion/media` in `OpenSlotFilm.tsx`.
  3. Align `captions.ts` `from` values to the audio, or remove the subtitles.
