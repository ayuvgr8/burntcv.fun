"use client";

// Local, device-only persistence. We keep the roast text + usage counters,
// never the résumé itself (PRD §10).

export interface HistoryItem {
  id: number;
  persona: string;
  emoji: string;
  intensity: string;
  cold: string;
  dark: string;
  when: number;
  linkedin: boolean;
}

export { PASS_DAYS, PASS_MS } from "./plan";
import { PASS_MS, GLOWUPS_PER_PASS } from "./plan";

export interface Stored {
  passUntil: number; // epoch ms; pass is active while now < passUntil (0 = none)
  passToken: string; // server-signed Pass token (bypasses the roast rate limit)
  passCode: string; // restore code shown to the user for other devices
  glowupsLeft: number; // Glow-Up rewrites remaining on the current Pass
  freeRoastUsed: boolean; // the one free roast has been spent
  apiKey: string; // BYOK — unlimited
  usageDate: string;
  roastsToday: number; // pass daily counter (resets each day)
  history: HistoryItem[];
}

const KEY = "burntcv";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function load(): Stored {
  const empty: Stored = {
    passUntil: 0,
    passToken: "",
    passCode: "",
    glowupsLeft: 0,
    freeRoastUsed: false,
    apiKey: "",
    usageDate: today(),
    roastsToday: 0,
    history: [],
  };
  if (typeof window === "undefined") return empty;
  try {
    const u = JSON.parse(localStorage.getItem(KEY) || "{}");
    const roastsToday = u.usageDate === today() ? u.roastsToday || 0 : 0;
    // Migrate legacy boolean unlocks (`lifetime`/`pro`) → a 6-month pass.
    const passUntil =
      Number(u.passUntil) ||
      (u.lifetime || u.pro ? Date.now() + PASS_MS : 0);
    return {
      passUntil,
      passToken: u.passToken || "",
      passCode: u.passCode || "",
      // Existing Pass holders (bought before Glow-Up credits shipped) have no
      // stored count → assume a full quota; the server reconciles the truth.
      glowupsLeft: Number.isFinite(u.glowupsLeft)
        ? u.glowupsLeft
        : passUntil > Date.now()
          ? GLOWUPS_PER_PASS
          : 0,
      freeRoastUsed: !!u.freeRoastUsed,
      apiKey: u.apiKey || "",
      usageDate: today(),
      roastsToday,
      history: Array.isArray(u.history) ? u.history : [],
    };
  } catch {
    return empty;
  }
}

export function persist(patch: Partial<Stored>): void {
  if (typeof window === "undefined") return;
  try {
    const u = JSON.parse(localStorage.getItem(KEY) || "{}");
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...u, ...patch, usageDate: today() }),
    );
  } catch {
    /* ignore */
  }
}
