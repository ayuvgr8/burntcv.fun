// Voiceover lines rendered as lower-third subtitles, timed in absolute frames
// (30fps). These mirror the OpenSlot narration script. When a real AI voiceover
// track is added, align each `from` to the corresponding audio and drop the
// on-screen subtitles if desired (see README in this folder).

export type Caption = { text: string; from: number; dur: number };

export const CAPTIONS: Caption[] = [
  // 1 · Intro (0–150)
  { text: "Every meeting starts with a simple question.", from: 18, dur: 56 },
  { text: "When are you free?", from: 78, dur: 40 },
  { text: "Today, OpenSlot answers it — automatically.", from: 120, dur: 30 },

  // 2 · Connect Google (150–360)
  { text: "Connecting your calendar takes one click.", from: 168, dur: 68 },
  {
    text: "OpenSlot requests only the permissions required to schedule meetings accurately.",
    from: 246,
    dur: 104,
  },

  // 3 · Calendar list (360–660)
  { text: "First, OpenSlot reads your list of calendars.", from: 378, dur: 80 },
  {
    text: "So you choose exactly which calendars are checked before accepting bookings.",
    from: 468,
    dur: 150,
  },
  { text: "Nothing more.", from: 626, dur: 30 },

  // 4 · Availability / free-busy (660–1050)
  {
    text: "Next, OpenSlot checks availability across your selected calendars.",
    from: 678,
    dur: 108,
  },
  { text: "Only free time slots are shown.", from: 796, dur: 68 },
  { text: "Busy meetings stay protected.", from: 876, dur: 68 },
  { text: "Double bookings never happen.", from: 956, dur: 80 },

  // 5 · Booking / events (1050–1500)
  {
    text: "When someone books, OpenSlot creates the meeting in your Google Calendar.",
    from: 1068,
    dur: 128,
  },
  { text: "Google Meet is generated automatically.", from: 1206, dur: 84 },
  { text: "If the booking changes, your calendar changes too.", from: 1300, dur: 100 },
  { text: "When it's cancelled, everything stays in sync.", from: 1410, dur: 84 },

  // 6 · Privacy (1500–1740)
  { text: "Your calendar data is used only for scheduling.", from: 1516, dur: 94 },
  { text: "We never sell it. We never share it.", from: 1620, dur: 82 },
  { text: "You stay in control.", from: 1706, dur: 32 },

  // 7 · Outro (1740–1950) — closing lines resolve into the end card.
  { text: "From availability to booking.", from: 1752, dur: 54 },
  { text: "From Google Calendar to Google Meet.", from: 1810, dur: 54 },
  { text: "Everything happens automatically.", from: 1866, dur: 50 },
];
