# OpenSlot film — voiceover script & timing

First-person AI-assistant narration in an Apple-demo cadence: calm, warm,
unhurried, confident. One voice, speaking as OpenSlot. Recommended reference:
a natural, soft-spoken assistant voice (e.g. ElevenLabs "Matilda"/"Jessica" or
OpenAI `alloy`/`shimmer`), ~-6 dB under a soft ambient bed.

These are the on-screen caption cue points (30fps). Generate one clip per line
(or one continuous read) and align each line's **start** to the timecode below;
the film's captions can then be turned off. Total runtime **67 s** (2010 frames).

> Note: I couldn't generate the audio in-session — this environment's network is
> restricted to package registries + Anthropic, so no TTS host is reachable.
> Hand this script to any TTS/voice actor and send me the MP3 (or open the
> network to a TTS provider) and I'll mux + re-render.

| # | Time | Line |
|---|------|------|
| 1 | 0:00.7 | Hi. I'm OpenSlot. |
| 2 | 0:02.5 | Let me show you how every call gets easier. |
| 3 | 0:05.0 | Every booking arrives already briefed. |
| 4 | 0:07.6 | Here's your day — a few calls, a few names. |
| 5 | 0:10.5 | But look closer: this one's already prepared. |
| 6 | 0:12.7 | Its brief was ready before you sat down. |
| 7 | 0:15.6 | It starts the moment someone books. |
| 8 | 0:18.1 | They leave me a thirty-second voice note. |
| 9 | 0:20.7 | Just their voice, in their own words. |
| 10 | 0:22.4 | That's all I need. |
| 11 | 0:24.3 | Then I read the transcript and write your prep. |
| 12 | 0:27.5 | The ask. The talking points. The flags to watch. |
| 13 | 0:30.9 | It's ready two hours before the call. |
| 14 | 0:33.3 | So you walk in knowing exactly what matters. |
| 15 | 0:36.7 | You don't get a booking anymore — you get a briefing. |
| 16 | 0:40.5 | Context, a brief, and payment, before you say hello. |
| 17 | 0:46.0 | Everything lives in one calm place. |
| 18 | 0:48.7 | Your bookings, your briefs, your revenue. |
| 19 | 0:53.9 | And your booking page can sell for you, too. |
| 20 | 0:57.9 | Get paid the way India actually pays — UPI, Razorpay, or global cards. |
| 21 | 1:02.5 | That's OpenSlot. Every booking, already briefed. |

## Wiring the audio back in

1. Drop the file(s) in `public/` (e.g. `public/vo/full.mp3`, optional
   `public/music/bed.mp3`).
2. In `OpenSlotFilm.tsx`, add near the top of the returned tree:
   ```tsx
   import { Audio } from "@remotion/media";
   import { staticFile } from "remotion";
   // …
   <Audio src={staticFile("vo/full.mp3")} />
   <Audio src={staticFile("music/bed.mp3")} volume={0.18} />
   ```
   (install once: `npx remotion add @remotion/media`)
3. Remove the on-screen captions if you no longer want them (delete the
   `CAPTIONS.map(...)` block), or keep them as subtitles.
4. Re-render (see this folder's README for the `--browser-executable` flag).

The `from`/`dur` values in `captions.ts` are the single source of truth for
timing — keep them and the audio aligned.
