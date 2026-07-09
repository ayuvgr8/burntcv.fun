// Voiceover lines as tone-aware lower-third subtitles (30fps, absolute frames).
// `onDark` = true on the dark-stage scenes so the caption stays legible.

export type Caption = { text: string; from: number; dur: number; onDark?: boolean };

export const CAPTIONS: Caption[] = [
  // 1 · Intro (cream) 0–210
  { text: "Every meeting used to start with the same question.", from: 18, dur: 66 },
  { text: "Who is this — and what do they actually need?", from: 90, dur: 58 },
  { text: "OpenSlot answers it before you ever join.", from: 152, dur: 52 },

  // 2 · Bookings (stage) 210–450
  { text: "A booking comes in — a name, a time, a call.", from: 228, dur: 78, onDark: true },
  { text: "But now it arrives with context.", from: 314, dur: 56, onDark: true },
  { text: "One is already briefed for your ten o'clock.", from: 378, dur: 64, onDark: true },

  // 3 · Voice note (cream) 450–710
  { text: "When your guest books, they leave a thirty-second voice note.", from: 468, dur: 96 },
  { text: "Just their voice — what they're hoping to cover.", from: 572, dur: 76 },
  { text: "That's all it takes.", from: 664, dur: 40 },

  // 4 · Claude brief (stage) 710–1080
  { text: "Claude reads the transcript and writes your prep.", from: 730, dur: 90, onDark: true },
  { text: "The ask. The talking points. The flags to watch.", from: 828, dur: 92, onDark: true },
  { text: "Ready two hours before the call.", from: 928, dur: 64, onDark: true },
  { text: "You walk in already knowing what matters.", from: 1000, dur: 72, onDark: true },

  // 5 · Before / after (cream) 1080–1360
  { text: "So you don't get a booking — you get a briefing.", from: 1100, dur: 96 },
  { text: "Context, a brief, and payment, before you say hello.", from: 1216, dur: 100 },

  // 6 · Dashboard (stage) 1360–1600
  { text: "It all lives in one calm workspace.", from: 1380, dur: 76, onDark: true },
  { text: "Bookings, briefs, and revenue — at a glance.", from: 1462, dur: 84, onDark: true },

  // 7 · Storefront + payments (cream) 1600–1850
  { text: "Your booking page is also your storefront.", from: 1616, dur: 80 },
  { text: "And get paid the way India actually pays — UPI, Razorpay, or global cards.", from: 1738, dur: 100 },

  // 8 · Outro (cream) 1850–2010
  { text: "OpenSlot. Every booking, already briefed.", from: 1876, dur: 66 },
];
