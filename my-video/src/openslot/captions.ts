// First-person AI-assistant narration (Apple-demo cadence), shown as tone-aware
// lower-third captions and used as the voiceover script. `onDark` = true on the
// dark-stage scenes. Timings are the intended VO cue points (30fps) — see
// VOICEOVER.md for the clean script to hand to a TTS voice.

export type Caption = { text: string; from: number; dur: number; onDark?: boolean };

export const CAPTIONS: Caption[] = [
  // 1 · Intro (cream) 0–210
  { text: "Hi. I'm OpenSlot.", from: 20, dur: 46 },
  { text: "Let me show you how every call gets easier.", from: 74, dur: 70 },
  { text: "Every booking arrives already briefed.", from: 150, dur: 54 },

  // 2 · Bookings (stage) 210–450
  { text: "Here's your day — a few calls, a few names.", from: 228, dur: 78, onDark: true },
  { text: "But look closer: this one's already prepared.", from: 314, dur: 60, onDark: true },
  { text: "Its brief was ready before you sat down.", from: 380, dur: 62, onDark: true },

  // 3 · Voice note (cream) 450–710
  { text: "It starts the moment someone books.", from: 468, dur: 68 },
  { text: "They leave me a thirty-second voice note.", from: 542, dur: 72 },
  { text: "Just their voice, in their own words.", from: 620, dur: 46 },
  { text: "That's all I need.", from: 672, dur: 34 },

  // 4 · Claude brief (stage) 710–1080
  { text: "Then I read the transcript and write your prep.", from: 730, dur: 88, onDark: true },
  { text: "The ask. The talking points. The flags to watch.", from: 826, dur: 92, onDark: true },
  { text: "It's ready two hours before the call.", from: 928, dur: 64, onDark: true },
  { text: "So you walk in knowing exactly what matters.", from: 1000, dur: 74, onDark: true },

  // 5 · Before / after (cream) 1080–1360
  { text: "You don't get a booking anymore — you get a briefing.", from: 1100, dur: 96 },
  { text: "Context, a brief, and payment, before you say hello.", from: 1216, dur: 100 },

  // 6 · Dashboard (stage) 1360–1600
  { text: "Everything lives in one calm place.", from: 1380, dur: 74, onDark: true },
  { text: "Your bookings, your briefs, your revenue.", from: 1460, dur: 84, onDark: true },

  // 7 · Storefront + payments (cream) 1600–1850
  { text: "And your booking page can sell for you, too.", from: 1616, dur: 82 },
  { text: "Get paid the way India actually pays — UPI, Razorpay, or global cards.", from: 1738, dur: 100 },

  // 8 · Outro (cream) 1850–2010
  { text: "That's OpenSlot.", from: 1876, dur: 48 },
];
