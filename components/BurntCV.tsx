"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "./css";
import Landing from "./Landing";
import { extractPdf, requestGlowup, requestRoast } from "@/lib/client";
import { ev } from "@/lib/analytics";
import {
  purchase,
  restoreEntitlement,
  requestMagicLink,
  claimMagicLink,
  fetchRegion,
  startCreemCheckout,
  claimCreem,
  PRICES,
  type Plan,
} from "@/lib/payments";
import { load, PASS_MS, persist, type HistoryItem } from "@/lib/storage";
import { GLOWUPS_PER_PASS } from "@/lib/plan";
import {
  fallbackRoast,
  INTENSITIES,
  intensityById,
  PERSONAS,
  personaById,
  type Glowup,
  type Roast,
} from "@/lib/roast";

// International Pass allowance: 400 roasts across the 6 months (no daily cap),
// after which the holder buys a new Pass. India stays on the 5-roasts/day model.
const INTL_ROAST_CAP = 400;

// How a roast is paid for, resolved before the API call and used for accounting.
type Consume = "byok" | "lifetime" | "free" | "paid";

type Screen =
  | "landing"
  | "input"
  | "roasting"
  | "result"
  | "card"
  | "glowup"
  | "paywall"
  | "settings"
  | "history";

const LOADING_MSGS = [
  "Reading between the lines…",
  "Sharpening the knife…",
  "Counting the buzzwords…",
  "Diagnosing the real damage…",
  "Locating the dark truth…",
];

const PASS_PERKS = [
  "5 roasts a day for 6 months",
  "All 6 roaster personas + Unhinged 💀",
  `${GLOWUPS_PER_PASS} Glow-Up rewrites included (₹49 each after)`,
  "Watermark-free share cards",
];
// International Pass is a 400-roast bucket over 6 months, with $3.99 extra Glow-Ups.
const PASS_PERKS_INTL = [
  "400 roasts over 6 months",
  "All 6 roaster personas + Unhinged 💀",
  `${GLOWUPS_PER_PASS} Glow-Up rewrites included ($3.99 each after)`,
  "Watermark-free share cards",
];

// Shared mono section-label + placeholder-highlight styles for the Glow-Up.
const GLOW_LABEL =
  "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.14em;font-weight:700;color:#0f0623;";
const PH_STYLE =
  "background:#ffe8a3;color:#7a5a00;font-weight:700;padding:0 4px;border-radius:4px;white-space:nowrap;";

// Highlight [bracketed] fill-in-the-blank placeholders so they're impossible to
// miss (and never mistaken for a real, defensible number).
function hlPlaceholders(text: string) {
  return text.split(/(\[[^\]]+\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <mark key={i} style={css(PH_STYLE)}>
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// Rotating tile palettes for the buzzword-autopsy bento grid (collage feel).
const BENTO_PALETTES = [
  { box: "background:#0f0623;", fg: "#fff", tag: "#f98731" },
  { box: "background:#fff;border:1.5px solid rgba(237,50,55,.2);", fg: "#0f0623", tag: "#ed3237" },
  { box: "background:#4e3188;", fg: "#fff", tag: "#ffdd00" },
  { box: "background:#fff;border:1.5px solid rgba(78,49,136,.25);", fg: "#0f0623", tag: "#4e3188" },
];

export default function BurntCV() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [inputMode, setInputMode] = useState<"paste" | "upload" | "linkedin">(
    "upload",
  );
  const [isLinkedIn, setIsLinkedIn] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("drag a file or tap to upload");
  const [intensity, setIntensity] = useState("medium");
  const [persona, setPersona] = useState("recruiter");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [roast, setRoast] = useState<Roast | null>(null);
  const [glowup, setGlowup] = useState<Glowup | null>(null);
  const [glowupLoading, setGlowupLoading] = useState(false);
  const [cardVariant, setCardVariant] = useState(0);
  const [wmOff, setWmOff] = useState(false);
  const [passUntil, setPassUntil] = useState(0);
  const [passToken, setPassToken] = useState("");
  const [passCode, setPassCode] = useState("");
  const [glowupsLeft, setGlowupsLeft] = useState(0);
  const [freeRoastUsed, setFreeRoastUsed] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [roastsToday, setRoastsToday] = useState(0);
  const [passRoasts, setPassRoasts] = useState(0); // lifetime — intl 400-cap
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [buying, setBuying] = useState<Plan | null>(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [paywallReason, setPaywallReason] = useState<
    "roast" | "daily" | "passcap" | "watermark" | "glowup" | "unhinged" | "upsell" | null
  >(null);

  // Payment region: India → Razorpay/UPI, everyone else → Creem ($9.99 Pass + $4.99 Glow-Up).
  const [region, setRegion] = useState<"IN" | "INTL">("IN");

  const stack = useRef<Screen[]>([]);
  const intensityRef = useRef<HTMLDivElement | null>(null);
  const loadingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byok = !!apiKey;
  const hasPass = passUntil > Date.now();
  // India Pass = 5 roasts/day; international Pass = 400 roasts over the 6 months,
  // no daily limit (metered client-side, like the daily counter).
  const isIN = region === "IN";
  const passRoastsLeft = isIN
    ? Math.max(0, 5 - roastsToday)
    : Math.max(0, INTL_ROAST_CAP - passRoasts);

  useEffect(() => {
    const u = load();
    setPassUntil(u.passUntil);
    setPassToken(u.passToken);
    setPassCode(u.passCode);
    setGlowupsLeft(u.glowupsLeft);
    setFreeRoastUsed(u.freeRoastUsed);
    setApiKey(u.apiKey);
    setKeyDraft(u.apiKey);
    setRoastsToday(u.roastsToday);
    setPassRoasts(u.passRoasts);
    setHistory(u.history);

    // Which payment rail to show (India → Razorpay, else → Creem).
    fetchRegion().then(setRegion);

    const params = new URLSearchParams(window.location.search);

    // Deep-link from the /linkedin landing page → jump into the LinkedIn flow.
    if (params.get("li") === "1") {
      setInputMode("linkedin");
      setIsLinkedIn(true);
      setScreen("input");
      stack.current = ["landing"];
      window.history.replaceState(null, "", "/");
    }

    // Return from a Creem checkout → confirm payment server-side, then act on
    // the server-verified product: a standalone "glowup" runs the one-off
    // Glow-Up; "glowup_topup" is a Pass holder's 5th+ Glow-Up (paid, so the
    // server won't spend a Pass credit); "pass" applies the 6-Month Pass.
    if (params.get("creem") === "success") {
      const cid = params.get("checkout_id");
      window.history.replaceState(null, "", "/");
      if (cid) {
        claimCreem(cid).then((res) => {
          if (res.ok && res.kind === "glowup") {
            execGlowup(false);
            return;
          }
          if (res.ok && res.kind === "glowup_topup") {
            execGlowup(true);
            return;
          }
          const pass = res.pass;
          if (res.ok && pass) {
            const gl = pass.glowupsLeft ?? GLOWUPS_PER_PASS;
            setPassUntil(pass.passUntil);
            setPassToken(pass.token);
            setPassCode(pass.code);
            setGlowupsLeft(gl);
            setPassRoasts(0); // fresh Pass → reset the 400-roast lifetime counter
            persist({
              passUntil: pass.passUntil,
              passToken: pass.token,
              passCode: pass.code,
              glowupsLeft: gl,
              passRoasts: 0,
            });
            toastMsg("6-Month Pass unlocked 🔥 — restore code saved in Settings");
          } else {
            toastMsg("Couldn’t confirm that payment — email us if you were charged.");
          }
        });
      }
    }

    // Magic-link Pass restore → the emailed link lands here with ?restore=<token>.
    // Verify it server-side and apply the Pass on this device.
    const restoreTok = params.get("restore");
    if (restoreTok) {
      window.history.replaceState(null, "", "/");
      claimMagicLink(restoreTok).then((pass) => {
        if (pass) {
          const gl = pass.glowupsLeft ?? GLOWUPS_PER_PASS;
          setPassUntil(pass.passUntil);
          setPassToken(pass.token);
          setPassCode(pass.code);
          setGlowupsLeft(gl);
          persist({
            passUntil: pass.passUntil,
            passToken: pass.token,
            passCode: pass.code,
            glowupsLeft: gl,
          });
          toastMsg("Pass restored 🔥");
        } else {
          toastMsg("That restore link is invalid or expired — request a new one.");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep a live ref of current screen for the stack push
  const screenRef = useRef<Screen>("landing");
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const go = useCallback((s: Screen) => {
    stack.current.push(screenRef.current);
    setMenuOpen(false);
    setScreen(s);
  }, []);

  const goBack = useCallback(() => {
    const prev = stack.current.pop() || "landing";
    setMenuOpen(false);
    setScreen(prev);
  }, []);

  const goHome = useCallback(() => {
    stack.current = [];
    setMenuOpen(false);
    setScreen("landing");
  }, []);

  const toastMsg = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  // After a résumé loads, bring the intensity picker into view so the user's
  // clear next step ("pick your pain tolerance" → Roast it) isn't below the fold.
  const scrollToIntensity = useCallback(() => {
    setTimeout(() => {
      intensityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setFileLabel(f.name);
      const isPdf =
        f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      if (isPdf) {
        toastMsg("Reading your PDF…");
        const text = await extractPdf(f);
        if (text) {
          setResumeText(text.slice(0, 6000));
          toastMsg("PDF loaded 🔥");
          scrollToIntensity();
        } else {
          toastMsg("Couldn’t read that PDF — paste the text for the sharpest roast.");
        }
        return;
      }
      const r = new FileReader();
      r.onload = () => {
        let txt = String(r.result || "");
        txt = txt
          .replace(/[^\x09\x0A\x0D\x20-\x7E -￿]/g, " ")
          .replace(/\s{3,}/g, "  ")
          .trim();
        if (txt.length < 30)
          toastMsg("Couldn’t read much text — paste it instead for the sharpest roast.");
        setResumeText(txt.slice(0, 6000));
        if (txt.length >= 30) scrollToIntensity();
      };
      r.onerror = () => toastMsg("File read failed — try pasting the text.");
      r.readAsText(f);
    },
    [toastMsg, scrollToIntensity],
  );

  // All personas & intensities are free to pick — you pay per roast, not per
  // feature. The gate is at "Roast it".
  const selectIntensity = useCallback((id: string) => setIntensity(id), []);
  const selectPersona = useCallback((id: string) => setPersona(id), []);

  const cycleLoading = useCallback(() => {
    let i = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    if (loadingTimer.current) clearInterval(loadingTimer.current);
    loadingTimer.current = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[i]);
    }, 1300);
  }, []);

  const doRoast = useCallback(async (consume: Consume) => {
    const linkedin = isLinkedIn;
    go("roasting");
    setRoast(null);
    setGlowup(null);
    cycleLoading();

    const result = await requestRoast({
      text: resumeText,
      persona,
      intensity,
      linkedin,
      apiKey,
      // Pass roasts carry the server-verified token (bypasses the IP limit);
      // free / single / top-up roasts fall under the per-IP ceiling.
      passToken: consume === "lifetime" ? passToken : "",
    });

    if (loadingTimer.current) clearInterval(loadingTimer.current);

    if (!result.ok) {
      if (result.reason === "rate_limited") {
        // Free roast quota exhausted (server IP ceiling) — send to paywall.
        setPaywallReason("roast");
        setScreen("paywall");
        return;
      }
      if (result.reason === "daily_exhausted") {
        // Server rejected a Pass roast: India's 5/day are gone (local counter was
        // stale/tampered) → sync it up and open the daily paywall.
        setRoastsToday(5);
        persist({ roastsToday: 5 });
        setPaywallReason("daily");
        setScreen("paywall");
        return;
      }
      if (result.reason === "pass_exhausted") {
        // Server rejected a Pass roast: all 400 are gone → sync + re-sell the Pass.
        setPassRoasts(INTL_ROAST_CAP);
        persist({ passRoasts: INTL_ROAST_CAP });
        setPaywallReason("passcap");
        setScreen("paywall");
        return;
      }
      if (result.reason === "overloaded") {
        toastMsg("The roaster's a bit overloaded 🔥 — give it another go.");
        setScreen("input");
        return;
      }
      // No platform key configured — steer the user to bring their own.
      toastMsg("Add your Claude API key to start roasting →");
      setScreen("settings");
      return;
    }

    const r = result.roast;
    if (!r.trajectory) r.trajectory = { satirical: "", real: "" };
    const pmeta = personaById(persona);
    const hist: HistoryItem = {
      id: Date.now(),
      persona: pmeta.label,
      emoji: pmeta.emoji,
      intensity,
      cold: r.cold_open,
      dark: r.dark_insight,
      when: Date.now(),
      linkedin,
    };
    const nextHistory = [hist, ...history].slice(0, 30);
    stack.current = ["input"];
    setRoast(r);
    setHistory(nextHistory);
    setScreen("result");

    // Accounting: only 'lifetime' (Pass quota) and 'free' (the one freebie) are
    // metered. 'byok' and 'paid' need no accounting. For Pass roasts the SERVER
    // is authoritative — sync the region's counter from its `passRoastsLeft` so
    // local storage can't drift out of (or be edited below) the truth.
    const patch: Record<string, unknown> = { history: nextHistory };
    if (consume === "lifetime") {
      const left = result.passRoastsLeft;
      if (isIN) {
        const used = typeof left === "number" ? Math.max(0, 5 - left) : roastsToday + 1;
        setRoastsToday(used);
        patch.roastsToday = used;
      } else {
        const usedTot =
          typeof left === "number" ? Math.max(0, INTL_ROAST_CAP - left) : passRoasts + 1;
        setPassRoasts(usedTot);
        patch.passRoasts = usedTot;
      }
    } else if (consume === "free") {
      setFreeRoastUsed(true);
      patch.freeRoastUsed = true;
    }
    persist(patch);
    ev("roast_completed", { persona, intensity, linkedin, consume });
  }, [
    isLinkedIn,
    go,
    cycleLoading,
    resumeText,
    persona,
    intensity,
    apiKey,
    passToken,
    roastsToday,
    passRoasts,
    isIN,
    history,
    toastMsg,
  ]);

  // Decide how this roast is paid for, then run it (or open the paywall).
  const onRoast = useCallback(() => {
    const t = resumeText.trim();
    if (t.length < 40) {
      toastMsg("Paste a bit more — give me something to work with.");
      return;
    }
    if (byok) return void doRoast("byok");
    if (hasPass && passRoastsLeft > 0) return void doRoast("lifetime");
    if (hasPass) {
      // Pass out of allowance → India: today's 5 are gone, offer a ₹5 top-up.
      // International: all 400 are gone, offer a fresh Pass.
      setPaywallReason(isIN ? "daily" : "passcap");
      go("paywall");
      return;
    }
    // Unhinged 💀 is a paid tier — ₹7 from the first roast. Only Mild and
    // Medium Rare are free on the house.
    if (!intensityById(intensity).free) {
      setPaywallReason("unhinged");
      go("paywall");
      return;
    }
    if (!freeRoastUsed) return void doRoast("free");
    // Free roast spent, no pass → pay to keep roasting.
    setPaywallReason("roast");
    go("paywall");
  }, [resumeText, byok, hasPass, passRoastsLeft, isIN, freeRoastUsed, intensity, go, toastMsg, doRoast]);

  // Runs the actual Glow-Up call. `paid=true` means the user just paid ₹49 for
  // this one, so the server must NOT spend a Pass credit on it.
  const execGlowup = useCallback(
    async (paid = false) => {
      setGlowupLoading(true);
      setGlowup(null);
      setMenuOpen(false);
      ev("glowup_run");
      go("glowup");
      const res = await requestGlowup({ text: resumeText, apiKey, passToken, paid });
      // Race guard: the Pass looked like it had credits but the server says it's
      // out — refund the optimistic UI and route to the ₹49 paywall.
      if (res.exhausted) {
        setGlowupsLeft(0);
        persist({ glowupsLeft: 0 });
        setGlowupLoading(false);
        setPaywallReason("glowup");
        go("paywall");
        return;
      }
      if (typeof res.glowupsLeft === "number") {
        setGlowupsLeft(res.glowupsLeft);
        persist({ glowupsLeft: res.glowupsLeft });
      }
      setGlowup(res.glowup);
      setGlowupLoading(false);
    },
    [go, resumeText, apiKey, passToken],
  );

  // BYOK is free; a Pass spends one of its 4 included Glow-Ups; everyone else
  // (and Pass holders who've used their 4) pays ₹49.
  const runGlowup = useCallback(() => {
    if (byok || (hasPass && glowupsLeft > 0)) {
      execGlowup();
      return;
    }
    setPaywallReason("glowup");
    go("paywall");
  }, [byok, hasPass, glowupsLeft, execGlowup, go]);

  // Copy a single string (used by the summary card).
  const copyText = useCallback(
    (text: string, note: string) => {
      navigator.clipboard?.writeText(text);
      toastMsg(note);
    },
    [toastMsg],
  );

  // Assemble the summary + every rewritten bullet into one pasteable block —
  // the "the ₹49 was a steal" moment.
  const copyGlowup = useCallback(() => {
    if (!glowup) return;
    const block = [
      "SUMMARY",
      glowup.summary,
      "",
      "BULLETS",
      ...glowup.rewrites.map((r) => "• " + r.after),
    ].join("\n");
    navigator.clipboard?.writeText(block);
    ev("glowup_copy");
    toastMsg("Copied — paste it straight into your résumé ✨");
  }, [glowup, toastMsg]);

  const buy = useCallback(
    async (plan: Plan) => {
      const reason = paywallReason;
      setBuying(plan);
      const res = await purchase(plan);
      setBuying(null);
      if (!res.ok) {
        toastMsg("Payment didn't go through — give it another shot.");
        return;
      }
      ev("purchase", { plan, simulated: res.simulated });
      setPaywallReason(null);

      if (plan === "lifetime") {
        // Prefer the server-minted entitlement (durable + restore code);
        // fall back to a local pass in simulated/offline mode.
        const p = res.pass;
        const until = p?.passUntil ?? Date.now() + PASS_MS;
        const gl = p?.glowupsLeft ?? GLOWUPS_PER_PASS;
        setPassUntil(until);
        setPassToken(p?.token ?? "");
        setPassCode(p?.code ?? "");
        setGlowupsLeft(gl);
        persist({
          passUntil: until,
          passToken: p?.token ?? "",
          passCode: p?.code ?? "",
          glowupsLeft: gl,
        });
        toastMsg(
          p?.code
            ? "6-Month Pass unlocked 🔥 — restore code saved in Settings"
            : res.simulated
              ? "6-Month Pass unlocked (demo) 🔥"
              : "6-Month Pass unlocked 🔥",
        );
        setTimeout(() => {
          if (reason === "watermark") {
            setWmOff(true);
            setScreen("card");
          } else if (reason === "glowup") {
            execGlowup(); // Pass now includes the Glow-Up — run it
          } else if (reason === "roast" || reason === "daily" || reason === "unhinged") {
            setScreen("input");
            doRoast("lifetime");
          } else {
            goBack();
          }
        }, 80);
      } else if (plan === "glowup") {
        // ₹49 Glow-Up — a paid top-up, so don't spend a Pass credit on it.
        toastMsg(res.simulated ? "Glow-Up unlocked (demo) ✨" : "Glow-Up unlocked ✨");
        setTimeout(() => execGlowup(true), 80);
      } else {
        // ₹7 single — pay then roast this one now (no stored balance).
        toastMsg(res.simulated ? "Roast unlocked (demo) 🔥" : "Roast unlocked 🔥");
        setTimeout(() => {
          setScreen("input");
          doRoast("paid");
        }, 80);
      }
    },
    [paywallReason, toastMsg, goBack, doRoast, execGlowup],
  );

  // International purchases → redirect to Creem's hosted checkout. On return the
  // mount effect confirms payment and mints the Pass / runs the Glow-Up. If Creem
  // isn't reachable, tell the user. `creemLoading` tracks whichever is opening.
  const [creemLoading, setCreemLoading] = useState<null | "pass" | "glowup" | "glowup_topup">(null);
  const buyCreem = useCallback(async () => {
    setCreemLoading("pass");
    const ok = await startCreemCheckout("pass");
    if (!ok) {
      setCreemLoading(null);
      toastMsg("Couldn’t open checkout — try again in a moment.");
    }
  }, [toastMsg]);
  const buyCreemGlowup = useCallback(async () => {
    setCreemLoading("glowup");
    const ok = await startCreemCheckout("glowup");
    if (!ok) {
      setCreemLoading(null);
      toastMsg("Couldn’t open checkout — try again in a moment.");
    }
  }, [toastMsg]);
  // A Pass holder past their 4 included Glow-Ups → the cheaper $3.99 top-up.
  const buyCreemTopup = useCallback(async () => {
    setCreemLoading("glowup_topup");
    const ok = await startCreemCheckout("glowup_topup");
    if (!ok) {
      setCreemLoading(null);
      toastMsg("Couldn’t open checkout — try again in a moment.");
    }
  }, [toastMsg]);

  const restorePassFromInput = useCallback(async () => {
    const val = restoreInput.trim();
    if (!val) return;
    setRestoring(true);

    // An email can't restore directly (that would be Pass theft) — we email a
    // one-tap link to the address on file instead. A code restores instantly.
    if (val.includes("@")) {
      await requestMagicLink(val);
      setRestoring(false);
      setRestoreInput("");
      // Uniform message whether or not that email has a Pass (no enumeration).
      toastMsg("If that email has a Pass, we’ve sent a restore link — check your inbox 📬");
      return;
    }

    const pass = await restoreEntitlement({ code: val });
    setRestoring(false);
    if (!pass) {
      toastMsg("No active Pass found for that code.");
      return;
    }
    const gl = pass.glowupsLeft ?? GLOWUPS_PER_PASS;
    setPassUntil(pass.passUntil);
    setPassToken(pass.token);
    setPassCode(pass.code);
    setGlowupsLeft(gl);
    persist({
      passUntil: pass.passUntil,
      passToken: pass.token,
      passCode: pass.code,
      glowupsLeft: gl,
    });
    setRestoreInput("");
    toastMsg("Pass restored 🔥");
  }, [restoreInput, toastMsg]);

  const saveKey = useCallback(() => {
    const k = keyDraft.trim();
    setApiKey(k);
    persist({ apiKey: k });
    if (k) ev("byok_added");
    toastMsg(k ? "Key saved — unlimited roasting unlocked 🔑" : "Key cleared");
  }, [keyDraft, toastMsg]);

  const removeKey = useCallback(() => {
    setApiKey("");
    setKeyDraft("");
    persist({ apiKey: "" });
    toastMsg("Key removed");
  }, [toastMsg]);

  const toggleWatermark = useCallback(() => {
    if (!(hasPass || byok)) {
      setPaywallReason("watermark");
      go("paywall");
      return;
    }
    setWmOff((v) => !v);
  }, [hasPass, byok, go]);

  const downloadCard = useCallback(async () => {
    const el = document.getElementById("burnt-card");
    if (!el) {
      toastMsg("Screenshot this card to share 📸");
      return;
    }
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "burntcv-roast.png";
      a.click();
      ev("card_download", { variant: cardVariant });
      toastMsg("Saved your roast card 🔥");
    } catch {
      toastMsg("Screenshot this card to share 📸");
    }
  }, [toastMsg]);

  const shareCard = useCallback(async () => {
    const text = "I let an AI roast my résumé and I've never felt so seen 💀";
    const url = "https://burntcv.app";
    try {
      if (navigator.share) await navigator.share({ title: "BurntCV", text, url });
      else {
        await navigator.clipboard.writeText(text + " " + url);
        toastMsg("Caption + link copied 🔗");
      }
      ev("card_share", { variant: cardVariant });
    } catch {
      /* user cancelled */
    }
  }, [toastMsg, cardVariant]);

  const copyCaption = useCallback(() => {
    try {
      navigator.clipboard.writeText(
        "I let an AI roast my résumé and I've never felt so seen 💀 https://burntcv.app",
      );
      ev("caption_copy");
      toastMsg("Caption copied 🔗");
    } catch {
      /* ignore */
    }
  }, [toastMsg]);

  const goLinkedIn = useCallback(() => {
    setInputMode("linkedin");
    setIsLinkedIn(true);
    go("input");
  }, [go]);

  const goPaywall = useCallback(() => {
    setPaywallReason("upsell");
    go("paywall");
  }, [go]);

  const whenLabel = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 60000);
    if (d < 1) return "just now";
    if (d < 60) return d + "m ago";
    const h = Math.floor(d / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  };

  // ---- derived view values ----
  const it = intensityById(intensity);
  const pers = personaById(persona);
  const linkedinUrlValid = /linkedin\.com\/(in|pub|profile)\//i.test(
    linkedinUrl.trim(),
  );
  const normalizedLinkedinUrl = /^https?:\/\//i.test(linkedinUrl.trim())
    ? linkedinUrl.trim()
    : "https://" + linkedinUrl.trim();
  const passExpiry =
    passUntil > 0
      ? new Date(passUntil).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  const usageLabel = byok
    ? "∞ Key"
    : hasPass
      ? isIN
        ? `${roastsToday}/5`
        : `${passRoasts}/${INTL_ROAST_CAP}`
      : freeRoastUsed
        ? isIN
          ? "₹7/roast"
          : "Pass"
        : "1 free";
  const usagePct =
    byok || (!hasPass && !freeRoastUsed)
      ? "100%"
      : hasPass
        ? isIN
          ? (Math.min(roastsToday, 5) / 5) * 100 + "%"
          : (Math.min(passRoasts, INTL_ROAST_CAP) / INTL_ROAST_CAP) * 100 + "%"
        : "0%";
  const usageNote = byok
    ? "Unlimited via your own Claude API key."
    : hasPass
      ? isIN
        ? roastsToday >= 5
          ? "You’ve used today’s 5 roasts — back tomorrow, or grab a ₹5 top-up."
          : `6-Month Pass: 5 roasts a day · ${glowupsLeft} Glow-Up${glowupsLeft === 1 ? "" : "s"} left. Renews ${passExpiry}.`
        : passRoastsLeft <= 0
          ? "You’ve used all 400 roasts on your Pass — grab a new 6-Month Pass to keep going."
          : `6-Month Pass: ${passRoastsLeft} of 400 roasts left · ${glowupsLeft} Glow-Up${glowupsLeft === 1 ? "" : "s"} left. Renews ${passExpiry}.`
      : freeRoastUsed
        ? isIN
          ? "Your free roast is used. ₹7 per roast, or ₹199 for 5 a day for 6 months."
          : "Your free roast is used. Get the 6-Month Pass — 400 roasts over 6 months."
        : "Your first roast is on us — everything unlocked.";

  const cardLabel = isLinkedIn
    ? "LINKEDIN ROAST"
    : (it.label || "Medium").toUpperCase() + " ROAST";
  const cardCold = roast ? roast.cold_open : fallbackRoast().cold_open;
  const cardDark = roast ? roast.dark_insight : fallbackRoast().dark_insight;
  const cardBento =
    roast?.bento && roast.bento.length ? roast.bento : fallbackRoast().bento!;
  const cardScore = roast?.score ?? fallbackRoast().score!;
  const canRemoveWatermark = hasPass || byok;
  const showWatermark = !(canRemoveWatermark && wmOff);

  const isGlowup = paywallReason === "glowup";
  const isUnhinged = paywallReason === "unhinged";
  const paywallEmoji =
    paywallReason === "daily"
      ? "🔥"
      : paywallReason === "passcap"
        ? "🔄"
        : paywallReason === "watermark"
          ? "💧"
          : isGlowup
            ? "✨"
            : isUnhinged
              ? "💀"
              : "⚡";
  const paywallTitle =
    paywallReason === "daily"
      ? "That's your 5 for today."
      : paywallReason === "passcap"
        ? "That's all 400 roasts."
        : paywallReason === "watermark"
          ? "Watermark-free is a Pass perk."
          : isGlowup
            ? "Now let's fix it. ✨"
            : isUnhinged
              ? "Unhinged is no-mercy mode. 💀"
              : paywallReason === "roast"
                ? "Loved your free roast?"
                : "Roast without limits.";
  const paywallSub =
    paywallReason === "daily"
      ? isIN
        ? "Your Pass gives you 5 a day and you’ve used them. Grab a ₹5 top-up, or come back tomorrow."
        : "Your Pass gives you 5 roasts a day — you’ve used them. Come back tomorrow."
      : paywallReason === "passcap"
        ? "You’ve used all 400 roasts on your 6-Month Pass. Grab a new one — $9.99 for another 400 over 6 months."
      : paywallReason === "watermark"
        ? "Get the 6-Month Pass to drop the watermark on every card you share."
        : isGlowup
          ? isIN
            ? "The roast found the flaws — the Glow-Up rewrites them into callback bullets. ₹49, or 4 included with the 6-Month Pass."
            : "The roast found the flaws — the Glow-Up rewrites them into callback bullets. $4.99, or included in the 6-Month Pass."
          : isUnhinged
            ? isIN
              ? "The savage tier is ₹7 a roast — or free on the 6-Month Pass. (Mild & Medium Rare stay free for your first roast.)"
              : "The savage tier is on the 6-Month Pass. (Mild & Medium Rare stay free for your first roast.)"
            : paywallReason === "roast"
              ? isIN
                ? "Your first one was on us. Keep roasting — ₹7 a pop, or ₹199 for 5 a day, 6 months."
                : "Your first one was on us. Get the 6-Month Pass — 400 roasts over 6 months."
              : isIN
                ? "₹7 per roast, or ₹199 for 5 roasts a day for 6 months."
                : "The 6-Month Pass — 400 roasts over 6 months.";
  // India (Razorpay) shows the micro-roast + ₹199 Pass cards. The rest of the
  // world (Creem) buys the $9.99 Pass — plus, on a Glow-Up prompt, either a
  // standalone $4.99 Glow-Up (non-Pass) or a $3.99 top-up (Pass, 4 used up). No
  // international per-roast micro-charge (fees eat sub-$1).
  const showSingle = isIN && paywallReason !== "watermark";
  // Don't re-upsell the Pass to someone who already holds one (e.g. a Pass
  // holder who's used their 4 Glow-Ups and is now buying a ₹49 top-up) — EXCEPT
  // when their intl Pass is out of its 400 roasts ("passcap"), where the whole
  // point is to sell them a fresh Pass.
  const showLifetime = isIN && paywallReason !== "daily" && !hasPass;
  const showCreem =
    !isIN && paywallReason !== "daily" && (!hasPass || paywallReason === "passcap");
  // The standalone international Glow-Up ($4.99) — only on a Glow-Up prompt, and
  // not for Pass holders (their Pass already includes Glow-Ups).
  const showCreemGlowup = !isIN && isGlowup && !hasPass;
  // The cheaper $3.99 Glow-Up top-up — an intl Pass holder who's used all 4.
  const showCreemTopup = !isIN && isGlowup && hasPass && glowupsLeft <= 0;
  // Pass holders past 5/day pay a ₹5 top-up; the Glow-Up is ₹49; a single roast ₹7.
  const isDaily = paywallReason === "daily";
  const payPlan: Plan = isGlowup ? "glowup" : isDaily ? "topup" : "single";
  const payRupees = PRICES[payPlan].rupees;

  const tabBtn = (active: boolean) =>
    "flex:1;border:none;cursor:pointer;padding:11px 6px;border-radius:9px;font-weight:700;font-size:13px;" +
    (active
      ? "background:#fff;color:#0f0623;box-shadow:0 2px 8px -2px rgba(15,6,35,.2);"
      : "background:transparent;color:#808080;");

  // ============ LANDING ============
  if (screen === "landing") {
    return (
      <>
        {toast && <Toast toast={toast} />}
        <Landing
          onRoast={() => {
            setIsLinkedIn(false);
            setInputMode("upload");
            go("input");
          }}
          onLinkedIn={goLinkedIn}
          region={region}
        />
      </>
    );
  }

  // ============ APP SHELL ============
  return (
    <div style={css("min-height:100vh;background:#e9e7ec;display:flex;justify-content:center;")}>
      {toast && <Toast toast={toast} />}
      <div
        style={css(
          "width:100%;max-width:480px;background:#f7f6f4;min-height:100vh;display:flex;flex-direction:column;box-shadow:0 0 90px rgba(15,6,35,.14);position:relative;overflow:hidden;",
        )}
      >
        {/* TOP BAR */}
        <div
          style={css(
            "position:sticky;top:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:13px 14px;background:rgba(247,246,244,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(15,6,35,.07);",
          )}
        >
          <button
            onClick={goBack}
            style={css(
              "border:none;background:transparent;cursor:pointer;font-size:24px;line-height:1;color:#5a5a5a;width:34px;height:34px;border-radius:9px;",
            )}
          >
            ‹
          </button>
          <div
            onClick={goHome}
            style={css(
              "display:flex;align-items:center;gap:7px;cursor:pointer;font-weight:900;font-size:17px;letter-spacing:-.01em;",
            )}
          >
            <span style={css("font-size:17px;")}>🔥</span>BurntCV
          </div>
          <div style={css("display:flex;align-items:center;gap:8px;")}>
            <span
              onClick={() => go("settings")}
              style={css(
                "cursor:pointer;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;font-weight:700;color:#4e3188;background:rgba(78,49,136,.09);padding:6px 10px;border-radius:999px;",
              )}
            >
              {usageLabel}
            </span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              style={css(
                "border:none;background:transparent;cursor:pointer;font-size:20px;width:34px;height:34px;border-radius:9px;color:#5a5a5a;",
              )}
            >
              ≡
            </button>
          </div>
        </div>

        <div style={css("flex:1;overflow-y:auto;")}>
          {/* ===== SETUP ===== */}
          {screen === "input" && (
            <>
              <div
                style={css(
                  "padding:22px 18px 130px;display:flex;flex-direction:column;gap:22px;",
                )}
              >
                <div>
                  <h2 style={css("font-size:28px;font-weight:900;letter-spacing:-.02em;margin:0 0 6px;")}>
                    {isLinkedIn ? "Feed me your LinkedIn" : "Feed me your résumé"}
                  </h2>
                  <p style={css("margin:0;font-size:14.5px;color:#5a5a5a;line-height:1.5;")}>
                    {isLinkedIn
                      ? "Drop your profile URL and we'll walk you through the 5-second copy-paste. We never scrape — and never store it."
                      : "Paste it, drop a file, or roast a sample. Roasted in memory, never stored."}
                  </p>
                </div>

                <div
                  style={css(
                    "display:flex;gap:6px;background:rgba(15,6,35,.05);padding:5px;border-radius:13px;",
                  )}
                >
                  {(["paste", "upload", "linkedin"] as const).map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        setInputMode(id);
                        setIsLinkedIn(id === "linkedin");
                      }}
                      style={css(tabBtn(inputMode === id))}
                    >
                      {id === "paste" ? "Paste" : id === "upload" ? "Upload" : "LinkedIn"}
                    </button>
                  ))}
                </div>

                {inputMode === "upload" &&
                  (() => {
                    const picked = fileLabel !== "drag a file or tap to upload";
                    return (
                      <label
                        style={css(
                          "position:relative;border:2px dashed;border-radius:15px;padding:14px 14px;text-align:left;cursor:pointer;display:flex;flex-direction:row;align-items:center;gap:13px;transition:all .18s;" +
                            (picked
                              ? "border-color:rgba(31,157,85,.55);background:rgba(31,157,85,.06);box-shadow:0 10px 26px -18px rgba(31,157,85,.5);"
                              : "border-color:rgba(78,49,136,.5);background:linear-gradient(135deg,rgba(78,49,136,.08),rgba(234,76,137,.07));animation:uploadglow 2.6s ease-in-out infinite;"),
                        )}
                      >
                        <div
                          style={css(
                            "flex-shrink:0;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;" +
                              (picked
                                ? "background:linear-gradient(135deg,#1f9d55,#12833f);box-shadow:0 8px 18px -8px rgba(31,157,85,.6);"
                                : "background:linear-gradient(135deg,#f98731,#ed3237 60%,#ea4c89);box-shadow:0 8px 18px -8px rgba(237,50,55,.6);"),
                          )}
                        >
                          {picked ? "✓" : "📄"}
                        </div>
                        <div style={css("flex:1;min-width:0;")}>
                          <div
                            style={css(
                              "font-weight:800;font-size:14.5px;color:#0f0623;letter-spacing:-.01em;word-break:break-word;",
                            )}
                          >
                            {picked ? fileLabel : "Drop your résumé here"}
                          </div>
                          <div
                            style={css(
                              "font-size:11.5px;color:#8a8690;margin-top:2px;line-height:1.4;",
                            )}
                          >
                            {picked
                              ? "Tap to swap for a different file"
                              : "or drag & drop · PDF, TXT, or DOCX"}
                          </div>
                        </div>
                        {!picked && (
                          <span
                            style={css(
                              "flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#0f0623;color:#fff;font-weight:800;font-size:13px;padding:9px 15px;border-radius:10px;box-shadow:0 8px 18px -10px rgba(15,6,35,.6);",
                            )}
                          >
                            ⬆︎ Choose
                          </span>
                        )}
                        <input
                          type="file"
                          accept=".txt,.pdf,.doc,.docx,.md"
                          onChange={onFile}
                          style={css("display:none;")}
                        />
                      </label>
                    );
                  })()}

                {inputMode === "linkedin" && (
                  <div style={css("display:flex;flex-direction:column;gap:12px;")}>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="Paste your LinkedIn profile URL — linkedin.com/in/you"
                      style={css(
                        "width:100%;border:1.5px solid rgba(0,119,181,.35);border-radius:14px;padding:14px 15px;font-size:14px;color:#222;background:#fff;",
                      )}
                    />
                    {linkedinUrlValid && (
                      <div
                        style={css(
                          "border:1.5px solid rgba(0,119,181,.3);background:rgba(0,119,181,.05);border-radius:14px;padding:15px;display:flex;flex-direction:column;gap:13px;",
                        )}
                      >
                        <div style={css("font-weight:800;font-size:14px;color:#0077b5;display:flex;align-items:center;gap:7px;")}>
                          🔗 Profile detected
                        </div>
                        <div style={css("font-size:12.5px;color:#5a5a5a;line-height:1.5;")}>
                          LinkedIn blocks automated profile fetching (their rules), so grab it in
                          5 seconds — pick either:
                        </div>
                        <a
                          href={normalizedLinkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={css(
                            "text-align:center;border:none;cursor:pointer;padding:12px;border-radius:11px;background:#0077b5;color:#fff;font-weight:800;font-size:14px;",
                          )}
                        >
                          Open my profile ↗
                        </a>
                        <div style={css("display:flex;flex-direction:column;gap:4px;")}>
                          <div style={css("font-weight:800;font-size:12.5px;color:#0f0623;")}>
                            ① Copy &amp; paste
                          </div>
                          <div style={css("font-size:12px;color:#5a5a5a;line-height:1.45;")}>
                            Copy your <strong>Headline</strong>, <strong>About</strong>, and 2–3
                            recent posts → paste them below.
                          </div>
                        </div>
                        <label style={css("display:flex;flex-direction:column;gap:4px;cursor:pointer;")}>
                          <div style={css("font-weight:800;font-size:12.5px;color:#0f0623;")}>
                            ② Or upload your Save-to-PDF{" "}
                            <span style={css("color:#0077b5;")}>· tap here</span>
                          </div>
                          <div style={css("font-size:12px;color:#5a5a5a;line-height:1.45;")}>
                            On your profile: <strong>More → Save to PDF</strong> → drop it in.
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.txt"
                            onChange={onFile}
                            style={css("display:none;")}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder={
                    isLinkedIn
                      ? "Paste your LinkedIn headline, About section and a few posts…"
                      : "Paste your résumé text here — the more you give me, the sharper the roast…"
                  }
                  style={css(
                    "width:100%;min-height:150px;resize:vertical;border:1.5px solid rgba(15,6,35,.12);border-radius:14px;padding:15px;font-size:14.5px;line-height:1.55;color:#222;background:#fff;",
                  )}
                />
                <div style={css("margin-top:-12px;")}>
                  <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#9c9c9c;")}>
                    {resumeText.trim().length < 40
                      ? "paste at least a few lines"
                      : resumeText.length + " chars · ready"}
                  </span>
                </div>

                <div ref={intensityRef} style={css("scroll-margin-top:70px;")}>
                  <div
                    style={css(
                      "font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;font-weight:700;color:#0f0623;margin-bottom:10px;",
                    )}
                  >
                    PICK YOUR PAIN TOLERANCE
                  </div>
                  <div style={css("display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;")}>
                    {INTENSITIES.map((t) => {
                      const sel = t.id === intensity;
                      return (
                        <div
                          key={t.id}
                          onClick={() => selectIntensity(t.id)}
                          style={css(
                            "cursor:pointer;border-radius:14px;padding:13px 9px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;position:relative;text-align:left;" +
                              (sel
                                ? "border:2px solid #ed3237;background:rgba(237,50,55,.05);"
                                : "border:1.5px solid rgba(15,6,35,.12);background:#fff;"),
                          )}
                        >
                          <div style={css("font-size:22px;")}>{t.emoji}</div>
                          <div style={css("font-weight:800;font-size:14px;")}>{t.label}</div>
                          <div style={css("font-size:10.5px;color:#808080;line-height:1.35;")}>
                            {t.desc}
                          </div>
                          {!t.free && !hasPass && !byok && (
                            <span
                              style={css(
                                "position:absolute;top:8px;right:8px;font-size:9px;font-weight:800;letter-spacing:.02em;color:#ed3237;background:rgba(237,50,55,.1);padding:2px 6px;border-radius:6px;",
                              )}
                            >
                              ₹7
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div
                    style={css(
                      "font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.14em;font-weight:700;color:#0f0623;margin-bottom:10px;",
                    )}
                  >
                    PICK YOUR ROASTER
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:8px;")}>
                    {PERSONAS.map((p) => {
                      const sel = p.id === persona;
                      return (
                        <div
                          key={p.id}
                          onClick={() => selectPersona(p.id)}
                          style={css(
                            "cursor:pointer;border-radius:14px;padding:11px;display:flex;gap:12px;align-items:center;position:relative;" +
                              (sel
                                ? "border:2px solid #ed3237;background:rgba(237,50,55,.05);"
                                : "border:1.5px solid rgba(15,6,35,.12);background:#fff;"),
                          )}
                        >
                          <div
                            style={css(
                              "flex:none;width:42px;height:42px;border-radius:12px;background:rgba(15,6,35,.04);display:flex;align-items:center;justify-content:center;font-size:22px;",
                            )}
                          >
                            {p.emoji}
                          </div>
                          <div style={css("flex:1;min-width:0;")}>
                            <div style={css("font-weight:800;font-size:14.5px;")}>{p.label}</div>
                            <div style={css("font-size:12px;color:#808080;line-height:1.35;")}>
                              {p.desc}
                            </div>
                          </div>
                          {sel && (
                            <span style={css("flex:none;font-size:16px;color:#ed3237;")}>✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div
                style={css(
                  "position:absolute;bottom:0;left:0;right:0;padding:14px 18px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(to top,#f7f6f4 72%,rgba(247,246,244,0));",
                )}
              >
                <button
                  onClick={onRoast}
                  style={css(
                    "width:100%;border:none;cursor:pointer;padding:17px;border-radius:15px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 16px 28px -12px rgba(237,50,55,.6);",
                  )}
                >
                  Roast it 🔥
                </button>
              </div>
            </>
          )}

          {/* ===== ROASTING ===== */}
          {screen === "roasting" && (
            <div
              style={css(
                "min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:26px;text-align:center;",
              )}
            >
              <div style={css("position:relative;width:96px;height:96px;")}>
                <div
                  style={css(
                    "position:absolute;inset:0;border-radius:50%;border:4px solid rgba(237,50,55,.12);border-top-color:#ed3237;animation:spin .9s linear infinite;",
                  )}
                ></div>
                <div
                  style={css(
                    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:38px;animation:flick 1.1s ease-in-out infinite;",
                  )}
                >
                  🔥
                </div>
              </div>
              <div>
                <div style={css("font-size:21px;font-weight:900;letter-spacing:-.01em;")}>
                  {loadingMsg}
                </div>
                <div
                  style={css(
                    "font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#9c9c9c;margin-top:8px;",
                  )}
                >
                  diagnosing real weaknesses before the jokes…
                </div>
              </div>
            </div>
          )}

          {/* ===== RESULT ===== */}
          {screen === "result" && roast && (
            <>
              <div
                style={css("padding:18px 18px 150px;display:flex;flex-direction:column;gap:18px;")}
              >
                <div style={css("display:flex;gap:8px;flex-wrap:wrap;")}>
                  <span
                    onClick={() => go("input")}
                    style={css(
                      "cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:rgba(78,49,136,.09);color:#4e3188;font-weight:700;font-size:12px;padding:7px 11px;border-radius:999px;",
                    )}
                  >
                    {pers.emoji} {pers.label} ▾
                  </span>
                  <span
                    onClick={() => go("input")}
                    style={css(
                      "cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:rgba(237,50,55,.1);color:#ed3237;font-weight:700;font-size:12px;padding:7px 11px;border-radius:999px;",
                    )}
                  >
                    {it.emoji} {it.label} ▾
                  </span>
                </div>

                <div
                  style={css(
                    "border-left:4px solid #f98731;background:rgba(249,135,49,.07);border-radius:0 14px 14px 0;padding:15px 17px;",
                  )}
                >
                  <div
                    style={css(
                      "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;font-weight:700;color:#f98731;",
                    )}
                  >
                    §01 — THE COLD OPEN
                  </div>
                  <p style={css("margin:9px 0 0;font-size:19px;line-height:1.38;font-weight:600;")}>
                    {roast.cold_open}
                  </p>
                </div>

                {roast.score && (
                  <div
                    style={css(
                      "border:1.5px solid rgba(15,6,35,.1);background:#fff;border-radius:16px;padding:16px 17px;",
                    )}
                  >
                    <div style={css("display:flex;align-items:center;justify-content:space-between;")}>
                      <div
                        style={css(
                          "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;font-weight:700;color:#ed3237;",
                        )}
                      >
                        🎯 BUZZWORD METER
                      </div>
                      <div
                        style={css(
                          "font-size:11px;font-weight:800;color:#4e3188;background:rgba(78,49,136,.09);padding:4px 9px;border-radius:999px;",
                        )}
                      >
                        GRADE {roast.score.grade}
                      </div>
                    </div>
                    <div style={css("display:flex;align-items:baseline;gap:6px;margin-top:10px;")}>
                      <span style={css("font-size:40px;font-weight:900;letter-spacing:-.03em;")}>
                        {roast.score.value}
                      </span>
                      <span style={css("font-size:15px;font-weight:700;color:#9c9c9c;")}>
                        /100 buzzword-infested
                      </span>
                    </div>
                    <div
                      style={css(
                        "height:10px;background:rgba(15,6,35,.07);border-radius:999px;margin-top:10px;overflow:hidden;",
                      )}
                    >
                      <div
                        style={css(
                          `height:100%;width:${Math.max(0, Math.min(100, roast.score.value))}%;background:linear-gradient(90deg,#f98731,#ed3237);border-radius:999px;`,
                        )}
                      ></div>
                    </div>
                    <div style={css("margin-top:10px;font-size:13.5px;font-weight:700;color:#0f0623;")}>
                      {roast.score.label}
                    </div>
                  </div>
                )}

                <div>
                  <div
                    style={css(
                      "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;font-weight:700;color:#4e3188;margin-bottom:11px;",
                    )}
                  >
                    §02 — THE ROAST 🔥
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:10px;")}>
                    {roast.roasts.map((text, i) => (
                      <div
                        key={i}
                        style={css(
                          "display:flex;gap:12px;padding:13px;border:1px solid rgba(15,6,35,.08);border-radius:14px;background:#fff;",
                        )}
                      >
                        <div
                          style={css(
                            "flex:none;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f98731,#ed3237);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;",
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div style={css("font-size:13.5px;line-height:1.5;color:#222;")}>{text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {roast.bento && roast.bento.length > 0 && (
                  <div>
                    <div
                      style={css(
                        "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;font-weight:700;color:#ed3237;margin-bottom:11px;",
                      )}
                    >
                      § THE BUZZWORD AUTOPSY 🔬
                    </div>
                    <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:8px;")}>
                      {roast.bento.map((b, i) => {
                        const pal = BENTO_PALETTES[i % BENTO_PALETTES.length];
                        const hero = i === 0;
                        return (
                          <div
                            key={i}
                            style={css(
                              `${pal.box}color:${pal.fg};border-radius:16px;padding:${hero ? "16px" : "13px"};display:flex;flex-direction:column;gap:5px;position:relative;overflow:hidden;` +
                                (hero ? "grid-column:1 / -1;" : ""),
                            )}
                          >
                            <div style={css(`font-size:${hero ? "30px" : "24px"};line-height:1;`)}>
                              {b.emoji}
                            </div>
                            <div
                              style={css(
                                `font-size:${hero ? "26px" : "19px"};font-weight:900;letter-spacing:-.01em;color:${pal.tag};`,
                              )}
                            >
                              {b.tag}
                            </div>
                            <div style={css("font-size:11px;line-height:1.3;opacity:.72;font-weight:600;")}>
                              “{b.term}”
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div
                    style={css(
                      "font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;font-weight:700;color:#4e3188;margin-bottom:11px;",
                    )}
                  >
                    §03 — CAREER TRAJECTORY
                  </div>
                  <div style={css("display:flex;flex-direction:column;gap:10px;")}>
                    <div style={css("background:#4e3188;color:#fff;border-radius:14px;padding:15px;")}>
                      <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;opacity:.85;")}>
                        📈 WHERE YOU&apos;RE HEADED
                      </div>
                      <p style={css("margin:8px 0 0;font-size:13.5px;line-height:1.5;")}>
                        {roast.trajectory.satirical}
                      </p>
                    </div>
                    <div
                      style={css(
                        "background:#fff;border:1.5px solid #4e3188;border-radius:14px;padding:15px;",
                      )}
                    >
                      <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;color:#4e3188;")}>
                        🎯 REAL TALK
                      </div>
                      <p style={css("margin:8px 0 0;font-size:13.5px;line-height:1.5;color:#222;")}>
                        {roast.trajectory.real}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={css(
                      "position:relative;overflow:hidden;background:#0f0623;border-radius:18px;padding:22px 20px;",
                    )}
                  >
                    <div
                      style={css(
                        "position:absolute;top:-44px;right:-34px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(249,135,49,.6),rgba(237,50,55,.12) 52%,transparent 70%);filter:blur(6px);animation:ember 4s ease-in-out infinite;",
                      )}
                    ></div>
                    <div style={css("position:relative;")}>
                      <div style={css("font-size:11px;letter-spacing:.16em;font-weight:700;color:#f98731;")}>
                        🌑 DARK-MODE INSIGHT
                      </div>
                      <p style={css("margin:12px 0 0;font-size:19px;line-height:1.42;font-weight:500;color:#fff;")}>
                        {roast.dark_insight}
                      </p>
                      <div style={css("margin-top:16px;font-size:12px;color:rgba(255,255,255,.5);")}>
                        📸 The one you&apos;ll send to the group chat at 1am.
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={css(
                    "display:flex;gap:13px;align-items:center;border:1.5px dashed rgba(15,6,35,.2);border-radius:14px;padding:15px;",
                  )}
                >
                  <div
                    style={css(
                      "flex:none;font-size:10px;font-weight:800;letter-spacing:.08em;color:#ed3237;transform:rotate(-8deg);border:2px solid #ed3237;border-radius:8px;padding:7px 8px;text-align:center;line-height:1.1;",
                    )}
                  >
                    THE
                    <br />
                    VERDICT
                  </div>
                  <p style={css("margin:0;font-size:13.5px;line-height:1.5;font-weight:600;")}>
                    {roast.verdict}
                  </p>
                </div>

                <div
                  style={css(
                    "font-family:ui-monospace,Menlo,monospace;font-size:10.5px;color:#9c9c9c;text-align:center;",
                  )}
                >
                  // résumé roasted and forgotten · never stored
                </div>
              </div>
              <div
                style={css(
                  "position:absolute;bottom:0;left:0;right:0;padding:13px 18px calc(15px + env(safe-area-inset-bottom));background:linear-gradient(to top,#f7f6f4 72%,rgba(247,246,244,0));display:flex;flex-direction:column;gap:9px;",
                )}
              >
                <button
                  onClick={() => go("card")}
                  style={css(
                    "width:100%;border:none;cursor:pointer;padding:16px;border-radius:14px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:16px;box-shadow:0 14px 26px -12px rgba(237,50,55,.6);",
                  )}
                >
                  Make a share card 🔥
                </button>
                <div style={css("display:flex;gap:9px;")}>
                  <button
                    onClick={runGlowup}
                    style={css(
                      "flex:1;border:1.5px solid #4e3188;background:#fff;color:#4e3188;cursor:pointer;padding:13px;border-radius:13px;font-weight:800;font-size:14px;",
                    )}
                  >
                    ✨ The Glow-Up
                    {byok
                      ? ""
                      : hasPass
                        ? glowupsLeft > 0
                          ? ` · ${glowupsLeft} left`
                          : " · ₹49"
                        : " · ₹49"}
                  </button>
                  <button
                    onClick={() => go("input")}
                    style={css(
                      "flex:none;border:1.5px solid rgba(15,6,35,.14);background:#fff;color:#373737;cursor:pointer;padding:13px 16px;border-radius:13px;font-weight:800;font-size:14px;",
                    )}
                  >
                    ↻ Again
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== SHARE CARD ===== */}
          {screen === "card" && (
            <div
              style={css(
                "padding:20px 18px 40px;display:flex;flex-direction:column;gap:18px;align-items:center;",
              )}
            >
              <div
                style={css(
                  "width:100%;display:flex;gap:6px;background:rgba(15,6,35,.05);padding:5px;border-radius:13px;",
                )}
              >
                {["Poster", "Sticker", "Receipt", "Bento"].map((label, n) => (
                  <button
                    key={label}
                    onClick={() => setCardVariant(n)}
                    style={css(tabBtn(cardVariant === n))}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={css("padding:6px 0 4px;")}>
                {cardVariant === 0 && (
                  <div
                    id="burnt-card"
                    style={css(
                      "width:330px;background:#0f0623;border-radius:24px;padding:26px;color:#fff;position:relative;overflow:hidden;box-shadow:0 34px 60px -24px rgba(15,6,35,.55);",
                    )}
                  >
                    <div
                      style={css(
                        "position:absolute;bottom:-60px;left:-30px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(249,135,49,.5),rgba(237,50,55,.1) 55%,transparent 72%);filter:blur(8px);",
                      )}
                    ></div>
                    <div style={css("position:relative;")}>
                      <div style={css("display:flex;align-items:center;justify-content:space-between;")}>
                        <div style={css("display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;")}>
                          🔥 BurntCV
                        </div>
                        <span
                          style={css(
                            "font-size:9px;letter-spacing:.12em;color:#f98731;font-weight:700;border:1px solid rgba(249,135,49,.5);border-radius:999px;padding:3px 8px;",
                          )}
                        >
                          {cardLabel}
                        </span>
                      </div>
                      <p style={css("margin:22px 0 0;font-size:22px;line-height:1.28;font-weight:700;letter-spacing:-.01em;")}>
                        {cardCold}
                      </p>
                      <div style={css("height:1px;background:rgba(255,255,255,.14);margin:22px 0;")}></div>
                      <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;color:#f98731;")}>
                        🌑 DARK TRUTH
                      </div>
                      <p style={css("margin:8px 0 0;font-size:14px;line-height:1.45;color:rgba(255,255,255,.92);")}>
                        {cardDark}
                      </p>
                      {showWatermark && (
                        <div
                          style={css(
                            "display:flex;align-items:center;justify-content:space-between;margin-top:24px;font-size:11px;color:rgba(255,255,255,.55);",
                          )}
                        >
                          <span>burntcv.app</span>
                          <span style={css("color:#fff;font-weight:700;")}>roast yours →</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {cardVariant === 1 && (
                  <div
                    id="burnt-card"
                    style={css(
                      "width:330px;background:#fff;border:1px solid rgba(15,6,35,.1);border-radius:24px;padding:26px;position:relative;overflow:hidden;box-shadow:0 34px 60px -24px rgba(15,6,35,.32);",
                    )}
                  >
                    <div style={css("display:flex;align-items:center;justify-content:space-between;")}>
                      <div style={css("display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;")}>
                        🔥 BurntCV
                      </div>
                      <span
                        style={css(
                          "font-size:9px;letter-spacing:.12em;color:#ed3237;font-weight:800;background:rgba(237,50,55,.1);border-radius:999px;padding:4px 9px;",
                        )}
                      >
                        {cardLabel}
                      </span>
                    </div>
                    <p style={css("margin:20px 0 0;font-size:23px;line-height:1.24;font-weight:800;letter-spacing:-.02em;")}>
                      {cardCold}
                    </p>
                    <div
                      style={css(
                        "height:3px;width:54px;background:linear-gradient(115deg,#f98731,#ed3237);border-radius:3px;margin:20px 0;",
                      )}
                    ></div>
                    <div style={css("background:#0f0623;border-radius:14px;padding:15px;")}>
                      <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;color:#f98731;")}>
                        🌑 DARK TRUTH
                      </div>
                      <p style={css("margin:7px 0 0;font-size:13.5px;line-height:1.45;color:#fff;")}>{cardDark}</p>
                    </div>
                    {showWatermark && (
                      <div style={css("margin-top:18px;font-size:11px;color:#9c9c9c;font-weight:600;")}>
                        burntcv.app · roast yours →
                      </div>
                    )}
                  </div>
                )}
                {cardVariant === 2 && (
                  <div
                    id="burnt-card"
                    style={css(
                      "width:300px;background:#fff;border-radius:8px;border:1px solid rgba(15,6,35,.12);font-family:ui-monospace,Menlo,monospace;overflow:hidden;box-shadow:0 30px 54px -24px rgba(15,6,35,.42);",
                    )}
                  >
                    <div
                      style={css(
                        "text-align:center;padding:18px 18px 12px;border-bottom:1.5px dashed rgba(15,6,35,.2);",
                      )}
                    >
                      <div style={css("font-weight:700;font-size:13px;letter-spacing:.16em;")}>
                        🔥 THE BURNTCV OFFICE
                      </div>
                      <div style={css("font-size:9px;color:#808080;letter-spacing:.14em;margin-top:3px;")}>
                        {cardLabel} · CERTIFIED SCREWED
                      </div>
                    </div>
                    <div
                      style={css(
                        "padding:18px;font-size:15px;line-height:1.45;color:#0f0623;font-family:'Satoshi',sans-serif;font-weight:700;",
                      )}
                    >
                      {cardCold}
                    </div>
                    <div style={css("background:#0f0623;color:#fff;padding:16px 18px;")}>
                      <div style={css("font-size:9px;letter-spacing:.14em;color:#f98731;font-weight:700;")}>
                        ▪ DARK TRUTH
                      </div>
                      <div
                        style={css(
                          "font-family:'Satoshi',sans-serif;font-size:13px;line-height:1.45;margin-top:7px;color:rgba(255,255,255,.92);",
                        )}
                      >
                        {cardDark}
                      </div>
                    </div>
                    {showWatermark && (
                      <div
                        style={css(
                          "text-align:center;padding:11px;font-size:9px;color:#9c9c9c;letter-spacing:.12em;border-top:1.5px dashed rgba(15,6,35,.2);",
                        )}
                      >
                        burntcv.app ▪ roast yours →
                      </div>
                    )}
                  </div>
                )}
                {cardVariant === 3 && (
                  <div
                    id="burnt-card"
                    style={css(
                      "width:330px;background:#0f0623;border-radius:24px;padding:22px;color:#fff;position:relative;overflow:hidden;box-shadow:0 34px 60px -24px rgba(15,6,35,.55);",
                    )}
                  >
                    <div
                      style={css(
                        "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;",
                      )}
                    >
                      <div style={css("display:flex;align-items:center;gap:6px;font-weight:900;font-size:14px;")}>
                        🔥 BurntCV
                      </div>
                      <span
                        style={css(
                          "font-size:9px;letter-spacing:.12em;color:#f98731;font-weight:700;border:1px solid rgba(249,135,49,.5);border-radius:999px;padding:3px 8px;",
                        )}
                      >
                        🔬 BUZZWORD AUTOPSY
                      </span>
                    </div>
                    <div style={css("display:flex;align-items:baseline;gap:7px;margin-bottom:14px;")}>
                      <span style={css("font-size:36px;font-weight:900;color:#f98731;letter-spacing:-.02em;")}>
                        {cardScore.value}
                      </span>
                      <span style={css("font-size:12.5px;color:rgba(255,255,255,.6);font-weight:700;")}>
                        /100 · GRADE {cardScore.grade} · {cardScore.label}
                      </span>
                    </div>
                    <div style={css("display:grid;grid-template-columns:1fr 1fr;gap:7px;")}>
                      {cardBento.slice(0, 6).map((b, i) => (
                        <div
                          key={i}
                          style={css(
                            "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px;display:flex;flex-direction:column;gap:3px;",
                          )}
                        >
                          <div style={css("font-size:18px;line-height:1;")}>{b.emoji}</div>
                          <div style={css("font-size:16px;font-weight:900;color:#f98731;letter-spacing:-.01em;")}>
                            {b.tag}
                          </div>
                          <div style={css("font-size:9.5px;line-height:1.25;color:rgba(255,255,255,.6);font-weight:600;")}>
                            “{b.term}”
                          </div>
                        </div>
                      ))}
                    </div>
                    {showWatermark && (
                      <div
                        style={css(
                          "display:flex;align-items:center;justify-content:space-between;margin-top:16px;font-size:11px;color:rgba(255,255,255,.55);",
                        )}
                      >
                        <span>burntcv.app</span>
                        <span style={css("color:#fff;font-weight:700;")}>roast yours →</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={css("width:100%;max-width:330px;display:flex;flex-direction:column;gap:10px;")}>
                <div style={css("display:flex;gap:9px;")}>
                  <button
                    onClick={downloadCard}
                    style={css(
                      "flex:1;border:none;cursor:pointer;padding:15px;border-radius:13px;background:#0f0623;color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    ↓ Download PNG
                  </button>
                  <button
                    onClick={shareCard}
                    style={css(
                      "flex:1;border:none;cursor:pointer;padding:15px;border-radius:13px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    Share ⇪
                  </button>
                </div>
                <div
                  onClick={copyCaption}
                  style={css(
                    "cursor:pointer;border:1.5px solid rgba(15,6,35,.12);background:#fff;border-radius:13px;padding:13px 15px;display:flex;justify-content:space-between;align-items:center;gap:10px;",
                  )}
                >
                  <span style={css("font-size:12.5px;color:#5a5a5a;line-height:1.4;")}>
                    &quot;I let an AI roast my résumé and I&apos;ve never felt so seen 💀&quot;
                  </span>
                  <span style={css("flex:none;font-size:12px;font-weight:800;color:#4e3188;")}>Copy</span>
                </div>
                <div
                  onClick={toggleWatermark}
                  style={css(
                    "cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:6px 4px;",
                  )}
                >
                  <span style={css("font-size:13px;font-weight:600;color:#373737;")}>
                    Watermark {showWatermark ? "on" : "off"}
                  </span>
                  <span style={css("font-size:11px;font-weight:800;color:#4e3188;")}>
                    {canRemoveWatermark
                      ? wmOff
                        ? "Turn on"
                        : "Remove"
                      : "Pass 🔒"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ===== GLOW-UP ===== */}
          {screen === "glowup" && (
            <div style={css("padding:22px 18px 40px;display:flex;flex-direction:column;gap:18px;")}>
              <div>
                <div
                  style={css(
                    "display:inline-flex;align-items:center;gap:7px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:11px;letter-spacing:.1em;padding:6px 12px;border-radius:999px;",
                  )}
                >
                  ✨ THE GLOW-UP
                </div>
                <h2 style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;margin:14px 0 4px;")}>
                  The same flaws, now fixed.
                </h2>
                <p style={css("margin:0;font-size:14px;color:#5a5a5a;line-height:1.5;")}>
                  The roast found the problems. Here&apos;s the part that gets you the callback.
                </p>
              </div>
              {glowupLoading && (
                <div style={css("display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px 0;")}>
                  <div
                    style={css(
                      "width:54px;height:54px;border-radius:50%;border:4px solid rgba(78,49,136,.14);border-top-color:#4e3188;animation:spin .9s linear infinite;",
                    )}
                  ></div>
                  <div style={css("font-size:14px;font-weight:700;color:#4e3188;")}>
                    Rebuilding your narrative…
                  </div>
                </div>
              )}
              {glowup && (
                <>
                  {/* Hireability arc — the "was X, now Y" payoff, animated up. */}
                  <ScoreArc before={glowup.score_before} after={glowup.score_after} />

                  {/* The single highest-leverage change — start here. */}
                  <div
                    style={css(
                      "border:1.5px solid rgba(237,50,55,.28);background:linear-gradient(180deg,rgba(237,50,55,.06),transparent);border-radius:16px;padding:16px 17px;",
                    )}
                  >
                    <div style={css(GLOW_LABEL + "color:#ed3237;margin-bottom:7px;")}>
                      ⚡ START HERE
                    </div>
                    <p style={css("margin:0;font-size:15.5px;font-weight:700;line-height:1.45;color:#0f0623;")}>
                      {glowup.one_thing}
                    </p>
                  </div>

                  {/* The one storyline every bullet should sell. */}
                  <div style={css("background:#4e3188;color:#fff;border-radius:16px;padding:17px;")}>
                    <div style={css("font-size:10px;letter-spacing:.14em;font-weight:700;opacity:.85;")}>
                      🧵 THE THREAD TO SELL
                    </div>
                    <p style={css("margin:9px 0 0;font-size:15px;line-height:1.5;")}>{glowup.narrative}</p>
                  </div>

                  {/* Pasteable, rewritten professional summary. */}
                  <div style={css("border:1px solid rgba(15,6,35,.1);border-radius:16px;background:#fff;padding:16px 17px;")}>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;")}>
                      <div style={css(GLOW_LABEL)}>📝 YOUR NEW SUMMARY</div>
                      <button
                        onClick={() => copyText(glowup.summary, "Summary copied ✨")}
                        style={css(
                          "border:1px solid rgba(78,49,136,.3);background:#fff;color:#4e3188;cursor:pointer;font-size:11px;font-weight:800;padding:5px 11px;border-radius:999px;",
                        )}
                      >
                        Copy
                      </button>
                    </div>
                    <p style={css("margin:0;font-size:14px;line-height:1.55;color:#222;")}>{glowup.summary}</p>
                  </div>

                  {/* Before → after rewrites, with the blanks-to-fill highlighted. */}
                  <div>
                    <div style={css(GLOW_LABEL + "margin-bottom:10px;")}>REWRITES</div>
                    <div style={css("display:flex;flex-direction:column;gap:10px;")}>
                      {glowup.rewrites.map((g, i) => (
                        <div
                          key={i}
                          style={css(
                            "border:1px solid rgba(15,6,35,.1);border-radius:14px;overflow:hidden;background:#fff;",
                          )}
                        >
                          <div style={css("padding:12px 14px;border-bottom:1px solid rgba(15,6,35,.07);")}>
                            <span style={css("font-size:9px;font-weight:800;letter-spacing:.1em;color:#ed3237;")}>
                              BEFORE
                            </span>
                            <div
                              style={css(
                                "font-size:13px;color:#808080;line-height:1.45;margin-top:5px;text-decoration:line-through;text-decoration-color:rgba(237,50,55,.5);",
                              )}
                            >
                              {g.before}
                            </div>
                          </div>
                          <div style={css("padding:12px 14px;background:rgba(31,138,91,.05);")}>
                            <span style={css("font-size:9px;font-weight:800;letter-spacing:.1em;color:#1f8a5b;")}>
                              AFTER
                            </span>
                            <div
                              style={css(
                                "font-size:13.5px;color:#0f0623;line-height:1.5;margin-top:5px;font-weight:600;",
                              )}
                            >
                              {hlPlaceholders(g.after)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={css("margin:9px 2px 0;font-size:11.5px;color:#9c8a00;line-height:1.4;")}>
                      <span style={css(PH_STYLE + "font-size:11px;")}>[like this]</span> = fill in with a
                      real number from your work. Never a made-up one.
                    </p>
                  </div>

                  {/* Filler to delete, with the reason it hurts. */}
                  <div>
                    <div style={css(GLOW_LABEL + "margin-bottom:10px;")}>✂️ CUT THESE</div>
                    <div style={css("display:flex;flex-direction:column;gap:8px;")}>
                      {glowup.cut.map((c, i) => (
                        <div
                          key={i}
                          style={css(
                            "display:flex;gap:10px;align-items:baseline;background:rgba(237,50,55,.05);border:1px solid rgba(237,50,55,.14);border-radius:12px;padding:10px 13px;",
                          )}
                        >
                          <span
                            style={css(
                              "font-size:13px;font-weight:700;color:#b3245f;text-decoration:line-through;text-decoration-color:rgba(179,36,95,.5);flex:none;",
                            )}
                          >
                            {c.text}
                          </span>
                          <span style={css("font-size:12px;color:#7a5a63;line-height:1.4;")}>— {c.why}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What a recruiter silently assumes — and the reframe. */}
                  <GlowList label="👁️ WHAT RECRUITERS READ" items={glowup.recruiter_read} />

                  {/* Keywords an ATS filters on that are missing. */}
                  <div>
                    <div style={css(GLOW_LABEL + "margin-bottom:10px;")}>🤖 ATS BLIND SPOTS</div>
                    <div style={css("display:flex;flex-wrap:wrap;gap:8px;")}>
                      {glowup.ats_gaps.map((k, i) => (
                        <span
                          key={i}
                          style={css(
                            "background:rgba(78,49,136,.08);color:#4e3188;border:1px solid rgba(78,49,136,.2);border-radius:999px;padding:8px 13px;font-size:12.5px;font-weight:600;line-height:1.3;",
                          )}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pointed questions this résumé invites. */}
                  <GlowList label="💣 INTERVIEW LANDMINES" items={glowup.interview_landmines} />

                  {/* Where this résumé can go next + what to add. */}
                  <div style={css("border:1px solid rgba(15,6,35,.1);border-radius:16px;background:#fff;padding:16px 17px;")}>
                    <div style={css(GLOW_LABEL + "margin-bottom:11px;")}>🚀 WHERE THIS GOES NEXT</div>
                    <div style={css("display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;")}>
                      {glowup.next_moves.roles.map((r, i) => (
                        <span
                          key={i}
                          style={css(
                            "background:#0f0623;color:#fff;border-radius:999px;padding:8px 14px;font-size:12.5px;font-weight:700;",
                          )}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <div style={css("display:flex;flex-direction:column;gap:7px;")}>
                      {glowup.next_moves.gaps.map((g, i) => (
                        <div
                          key={i}
                          style={css("display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#333;line-height:1.45;")}
                        >
                          <span style={css("color:#1f8a5b;font-weight:800;flex:none;")}>+</span>
                          {g}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assemble summary + fixed bullets into one pasteable block. */}
                  <button
                    onClick={copyGlowup}
                    style={css(
                      "width:100%;border:none;cursor:pointer;padding:16px;border-radius:14px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:16px;box-shadow:0 14px 26px -12px rgba(237,50,55,.6);",
                    )}
                  >
                    📋 Copy the whole rewrite
                  </button>
                  <button
                    onClick={() => go("card")}
                    style={css(
                      "width:100%;border:1.5px solid #4e3188;background:#fff;color:#4e3188;cursor:pointer;padding:14px;border-radius:14px;font-weight:800;font-size:15px;",
                    )}
                  >
                    Back to the share card 🔥
                  </button>
                </>
              )}
            </div>
          )}

          {/* ===== PAYWALL ===== */}
          {screen === "paywall" && (
            <div style={css("padding:26px 20px 40px;display:flex;flex-direction:column;gap:20px;")}>
              <div style={css("text-align:center;")}>
                <div style={css("font-size:42px;")}>{paywallEmoji}</div>
                <h2 style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;margin:12px 0 6px;")}>
                  {paywallTitle}
                </h2>
                <p style={css("margin:0 auto;font-size:14.5px;color:#5a5a5a;line-height:1.5;max-width:300px;")}>
                  {paywallSub}
                </p>
              </div>

              {showSingle && (
                <div
                  style={css(
                    "border:1.5px solid rgba(15,6,35,.14);border-radius:18px;padding:17px 18px;display:flex;align-items:center;gap:14px;",
                  )}
                >
                  <div style={css("flex:1;")}>
                    <div style={css("display:flex;align-items:baseline;gap:7px;")}>
                      <span style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;")}>
                        ₹{payRupees}
                      </span>
                      <span style={css("font-size:13px;color:#808080;font-weight:600;")}>
                        {isGlowup ? "the Glow-Up" : isDaily ? "extra roast" : "one roast"}
                      </span>
                    </div>
                    <div style={css("font-size:12.5px;color:#5a5a5a;line-height:1.4;margin-top:3px;")}>
                      {isGlowup
                        ? "Your résumé, actually fixed — the callback edit."
                        : isDaily
                          ? "One more today — your 5 reset tomorrow."
                          : "Pay as you go — this roast, right now."}
                    </div>
                  </div>
                  <button
                    onClick={() => buy(payPlan)}
                    disabled={!!buying}
                    style={css(
                      "flex:none;border:none;cursor:pointer;padding:13px 18px;border-radius:13px;background:#0f0623;color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    {buying === payPlan ? "…" : `Pay ₹${payRupees}`}
                  </button>
                </div>
              )}

              {showLifetime && (
                <div
                  style={css(
                    "border:2px solid #ed3237;border-radius:20px;padding:22px;background:linear-gradient(180deg,rgba(237,50,55,.04),transparent);position:relative;",
                  )}
                >
                  <div
                    style={css(
                      "position:absolute;top:-11px;left:22px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;padding:4px 11px;border-radius:999px;",
                    )}
                  >
                    BEST VALUE · 6 MONTHS
                  </div>
                  <div style={css("display:flex;align-items:baseline;gap:8px;margin-top:6px;")}>
                    <span style={css("font-size:34px;font-weight:900;letter-spacing:-.02em;")}>₹199</span>
                    <span style={css("font-size:14px;color:#808080;font-weight:600;")}>5 a day · 6 months.</span>
                  </div>
                  <div style={css("font-weight:800;font-size:15px;margin:4px 0 14px;")}>BurntCV 6-Month Pass 🔥</div>
                  <div style={css("display:flex;flex-direction:column;gap:9px;")}>
                    {PASS_PERKS.map((perk) => (
                      <div
                        key={perk}
                        style={css(
                          "display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#222;line-height:1.4;",
                        )}
                      >
                        <span style={css("color:#1f8a5b;font-weight:800;")}>✓</span>
                        {perk}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => buy("lifetime")}
                    disabled={!!buying}
                    style={css(
                      "width:100%;border:none;cursor:pointer;padding:16px;border-radius:14px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:16px;margin-top:18px;box-shadow:0 14px 26px -12px rgba(237,50,55,.6);",
                    )}
                  >
                    {buying === "lifetime" ? "Opening checkout…" : "Get the Pass — ₹199"}
                  </button>
                </div>
              )}

              {showCreemGlowup && (
                <div
                  style={css(
                    "border:1.5px solid rgba(15,6,35,.14);border-radius:18px;padding:17px 18px;display:flex;align-items:center;gap:14px;",
                  )}
                >
                  <div style={css("flex:1;")}>
                    <div style={css("display:flex;align-items:baseline;gap:7px;")}>
                      <span style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;")}>
                        $4.99
                      </span>
                      <span style={css("font-size:13px;color:#808080;font-weight:600;")}>the Glow-Up</span>
                    </div>
                    <div style={css("font-size:12.5px;color:#5a5a5a;line-height:1.4;margin-top:3px;")}>
                      Your résumé, actually fixed — the callback edit.
                    </div>
                  </div>
                  <button
                    onClick={buyCreemGlowup}
                    disabled={!!creemLoading}
                    style={css(
                      "flex:none;border:none;cursor:pointer;padding:13px 18px;border-radius:13px;background:#0f0623;color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    {creemLoading === "glowup" ? "…" : "$4.99"}
                  </button>
                </div>
              )}

              {showCreemTopup && (
                <div
                  style={css(
                    "border:1.5px solid rgba(15,6,35,.14);border-radius:18px;padding:17px 18px;display:flex;align-items:center;gap:14px;",
                  )}
                >
                  <div style={css("flex:1;")}>
                    <div style={css("display:flex;align-items:baseline;gap:7px;")}>
                      <span style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;")}>
                        $3.99
                      </span>
                      <span style={css("font-size:13px;color:#808080;font-weight:600;")}>another Glow-Up</span>
                    </div>
                    <div style={css("font-size:12.5px;color:#5a5a5a;line-height:1.4;margin-top:3px;")}>
                      You’ve used your 4 included ones — extras are $3.99 each on the Pass.
                    </div>
                  </div>
                  <button
                    onClick={buyCreemTopup}
                    disabled={!!creemLoading}
                    style={css(
                      "flex:none;border:none;cursor:pointer;padding:13px 18px;border-radius:13px;background:#0f0623;color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    {creemLoading === "glowup_topup" ? "…" : "$3.99"}
                  </button>
                </div>
              )}

              {showCreem && (
                <div
                  style={css(
                    "border:2px solid #ed3237;border-radius:20px;padding:22px;background:linear-gradient(180deg,rgba(237,50,55,.04),transparent);position:relative;",
                  )}
                >
                  <div
                    style={css(
                      "position:absolute;top:-11px;left:22px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;padding:4px 11px;border-radius:999px;",
                    )}
                  >
                    BEST VALUE · 6 MONTHS
                  </div>
                  <div style={css("display:flex;align-items:baseline;gap:8px;margin-top:6px;")}>
                    <span style={css("font-size:34px;font-weight:900;letter-spacing:-.02em;")}>$9.99</span>
                    <span style={css("font-size:14px;color:#808080;font-weight:600;")}>400 roasts · 6 months.</span>
                  </div>
                  <div style={css("font-weight:800;font-size:15px;margin:4px 0 14px;")}>BurntCV 6-Month Pass 🔥</div>
                  <div style={css("display:flex;flex-direction:column;gap:9px;")}>
                    {PASS_PERKS_INTL.map((perk) => (
                      <div
                        key={perk}
                        style={css(
                          "display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#222;line-height:1.4;",
                        )}
                      >
                        <span style={css("color:#1f8a5b;font-weight:800;")}>✓</span>
                        {perk}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={buyCreem}
                    disabled={!!creemLoading}
                    style={css(
                      "width:100%;border:none;cursor:pointer;padding:16px;border-radius:14px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:16px;margin-top:18px;box-shadow:0 14px 26px -12px rgba(237,50,55,.6);",
                    )}
                  >
                    {creemLoading === "pass" ? "Opening checkout…" : "Get the Pass — $9.99"}
                  </button>
                  <div style={css("text-align:center;font-size:11px;color:#9c9c9c;margin-top:9px;")}>
                    Secure global checkout by Creem · cards &amp; more
                  </div>
                </div>
              )}

              <div style={css("display:flex;align-items:center;gap:12px;color:#9c9c9c;font-size:12px;font-weight:600;")}>
                <span style={css("flex:1;height:1px;background:rgba(15,6,35,.1);")}></span>OR
                <span style={css("flex:1;height:1px;background:rgba(15,6,35,.1);")}></span>
              </div>

              <div
                style={css(
                  "border:1.5px solid rgba(78,49,136,.25);border-radius:18px;padding:18px;background:rgba(78,49,136,.03);",
                )}
              >
                <div style={css("display:flex;align-items:center;gap:9px;font-weight:800;font-size:15px;")}>
                  🔑 Bring your own Claude key
                </div>
                <p style={css("margin:8px 0 14px;font-size:13px;color:#5a5a5a;line-height:1.5;")}>
                  Power-user move: plug in your own Anthropic API key and roast{" "}
                  <strong>unlimited</strong>, free. Your key stays on your device.
                </p>
                <button
                  onClick={() => go("settings")}
                  style={css(
                    "width:100%;border:1.5px solid #4e3188;background:#fff;color:#4e3188;cursor:pointer;padding:14px;border-radius:13px;font-weight:800;font-size:15px;",
                  )}
                >
                  Add your API key in Settings →
                </button>
              </div>
              {!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && (
                <div
                  style={css(
                    "font-family:ui-monospace,Menlo,monospace;font-size:10.5px;color:#9c9c9c;text-align:center;",
                  )}
                >
                  demo build · payments simulated until Razorpay keys are added
                </div>
              )}
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {screen === "settings" && (
            <div style={css("padding:22px 18px 40px;display:flex;flex-direction:column;gap:20px;")}>
              <h2 style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;margin:0;")}>Settings</h2>

              <div style={css("background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;padding:17px;")}>
                <div style={css("display:flex;justify-content:space-between;align-items:center;")}>
                  <span style={css("font-weight:800;font-size:15px;")}>
                    {hasPass ? "Today's roasts" : "Your plan"}
                  </span>
                  <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;color:#4e3188;")}>
                    {usageLabel}
                  </span>
                </div>
                <div
                  style={css(
                    "height:8px;background:rgba(15,6,35,.07);border-radius:999px;margin-top:12px;overflow:hidden;",
                  )}
                >
                  <div
                    style={css(
                      `height:100%;width:${usagePct};background:linear-gradient(90deg,#f98731,#ed3237);border-radius:999px;`,
                    )}
                  ></div>
                </div>
                <p style={css("margin:11px 0 0;font-size:12.5px;color:#808080;line-height:1.45;")}>{usageNote}</p>
              </div>

              <div style={css("background:#fff;border:1.5px solid rgba(78,49,136,.25);border-radius:16px;padding:17px;")}>
                <div style={css("display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;")}>
                  🔑 Your Claude API key
                </div>
                <p style={css("margin:8px 0 14px;font-size:13px;color:#5a5a5a;line-height:1.5;")}>
                  Skip paying per roast — add your own Anthropic key and roast unlimited, free. Stored only on this
                  device; we never see it.
                </p>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="sk-ant-api03-…"
                  style={css(
                    "width:100%;border:1.5px solid rgba(15,6,35,.14);border-radius:11px;padding:13px;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#222;background:#faf9f7;",
                  )}
                />
                <div style={css("display:flex;gap:9px;margin-top:11px;")}>
                  <button
                    onClick={saveKey}
                    style={css(
                      "flex:1;border:none;cursor:pointer;padding:13px;border-radius:11px;background:#4e3188;color:#fff;font-weight:800;font-size:14px;",
                    )}
                  >
                    {apiKey ? "Update key" : "Save key"}
                  </button>
                  {apiKey && (
                    <button
                      onClick={removeKey}
                      style={css(
                        "flex:none;border:1.5px solid rgba(237,50,55,.3);background:#fff;color:#ed3237;cursor:pointer;padding:13px 16px;border-radius:11px;font-weight:800;font-size:14px;",
                      )}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {apiKey && (
                  <div
                    style={css(
                      "margin-top:12px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:#1f8a5b;",
                    )}
                  >
                    ✓ Unlimited unlocked — roasting with your key
                  </div>
                )}
              </div>

              {!hasPass && (
                <div
                  onClick={goPaywall}
                  style={css(
                    "cursor:pointer;background:#0f0623;color:#fff;border-radius:16px;padding:17px;display:flex;justify-content:space-between;align-items:center;gap:12px;position:relative;overflow:hidden;",
                  )}
                >
                  <div
                    style={css(
                      "position:absolute;top:-30px;right:-20px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(249,135,49,.45),transparent 68%);",
                    )}
                  ></div>
                  <div style={css("position:relative;")}>
                    <div style={css("font-weight:800;font-size:15px;")}>Get the 6-Month Pass 🔥</div>
                    <div style={css("font-size:12.5px;color:rgba(255,255,255,.65);margin-top:3px;")}>
                      5 roasts/day · {GLOWUPS_PER_PASS} Glow-Ups · no watermark · 6 months
                    </div>
                  </div>
                  <span style={css("position:relative;font-weight:800;font-size:15px;")}>{isIN ? "₹199" : "$9.99"} →</span>
                </div>
              )}
              {hasPass && (
                <div
                  style={css(
                    "background:rgba(31,138,91,.06);border:1px solid rgba(31,138,91,.25);border-radius:16px;padding:16px;display:flex;align-items:center;gap:9px;font-weight:700;font-size:14px;color:#1f8a5b;",
                  )}
                >
                  ✓ 6-Month Pass active — 5 roasts a day · renews {passExpiry} 🔥
                </div>
              )}

              {hasPass && passCode && (
                <div style={css("background:#fff;border:1.5px solid rgba(78,49,136,.25);border-radius:16px;padding:16px;")}>
                  <div style={css("font-weight:800;font-size:14px;display:flex;align-items:center;gap:7px;")}>
                    🔑 Your restore code
                  </div>
                  <p style={css("margin:7px 0 12px;font-size:12.5px;color:#5a5a5a;line-height:1.5;")}>
                    Save this — it restores your Pass on another device or after clearing your browser.
                  </p>
                  <div
                    onClick={() => {
                      navigator.clipboard?.writeText(passCode);
                      toastMsg("Restore code copied 🔗");
                    }}
                    style={css(
                      "cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;background:#faf9f7;border:1px dashed rgba(15,6,35,.2);border-radius:11px;padding:12px 14px;",
                    )}
                  >
                    <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;letter-spacing:.05em;color:#0f0623;")}>
                      {passCode}
                    </span>
                    <span style={css("font-size:12px;font-weight:800;color:#4e3188;")}>Copy</span>
                  </div>
                </div>
              )}

              {!hasPass && !byok && (
                <div style={css("background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;padding:16px;")}>
                  <div style={css("font-weight:800;font-size:14px;display:flex;align-items:center;gap:7px;")}>
                    ↩︎ Restore a purchase
                  </div>
                  <p style={css("margin:7px 0 11px;font-size:12.5px;color:#5a5a5a;line-height:1.5;")}>
                    Bought a Pass on another device? Enter your restore code for instant
                    access — or your email, and we’ll send a one-tap restore link.
                  </p>
                  <div style={css("display:flex;gap:9px;")}>
                    <input
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      placeholder="BURNT-XXXX-XXXX or email"
                      style={css(
                        "flex:1;min-width:0;border:1.5px solid rgba(15,6,35,.14);border-radius:11px;padding:12px;font-size:13px;color:#222;background:#faf9f7;",
                      )}
                    />
                    <button
                      onClick={restorePassFromInput}
                      disabled={restoring}
                      style={css(
                        "flex:none;border:none;cursor:pointer;padding:12px 16px;border-radius:11px;background:#4e3188;color:#fff;font-weight:800;font-size:14px;",
                      )}
                    >
                      {restoring ? "…" : "Restore"}
                    </button>
                  </div>
                </div>
              )}

              <div style={css("font-size:12.5px;color:#9c9c9c;line-height:1.5;text-align:center;padding:0 10px;")}>
                🔒 Your résumé is roasted and forgotten. We process it in memory and never store it. History keeps the
                roast text only — never your document.
              </div>
            </div>
          )}

          {/* ===== HISTORY ===== */}
          {screen === "history" && (
            <div style={css("padding:22px 18px 40px;display:flex;flex-direction:column;gap:16px;")}>
              <div>
                <h2 style={css("font-size:26px;font-weight:900;letter-spacing:-.02em;margin:0 0 5px;")}>
                  Your roasts
                </h2>
                <p style={css("margin:0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#9c9c9c;")}>
                  // we keep the roast, never your résumé
                </p>
              </div>
              {history.length === 0 && (
                <div style={css("text-align:center;padding:50px 20px;color:#9c9c9c;")}>
                  <div style={css("font-size:40px;")}>🗒️</div>
                  <p style={css("font-size:14px;margin:14px 0 18px;")}>No roasts yet. Go get destroyed.</p>
                  <button
                    onClick={() => go("input")}
                    style={css(
                      "border:none;cursor:pointer;padding:13px 22px;border-radius:13px;background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);color:#fff;font-weight:800;font-size:15px;",
                    )}
                  >
                    Roast my résumé 🔥
                  </button>
                </div>
              )}
              {history.map((h) => (
                <div
                  key={h.id}
                  style={css("background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:14px;padding:15px;")}
                >
                  <div style={css("display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;")}>
                    <span
                      style={css(
                        "display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#4e3188;background:rgba(78,49,136,.08);padding:5px 10px;border-radius:999px;",
                      )}
                    >
                      {h.emoji || "🔥"} {h.persona}
                    </span>
                    <span style={css("font-family:ui-monospace,Menlo,monospace;font-size:10.5px;color:#9c9c9c;")}>
                      {whenLabel(h.when)}
                    </span>
                  </div>
                  <p style={css("margin:0;font-size:14px;line-height:1.45;font-weight:600;")}>{h.cold}</p>
                  <div
                    style={css(
                      "margin-top:10px;padding-top:10px;border-top:1px dashed rgba(15,6,35,.12);font-size:12.5px;color:#5a5a5a;line-height:1.45;",
                    )}
                  >
                    <span style={css("color:#f98731;font-weight:700;")}>🌑</span> {h.dark}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MENU SHEET */}
        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              style={css(
                "position:absolute;inset:0;z-index:50;background:rgba(15,6,35,.4);backdrop-filter:blur(2px);",
              )}
            ></div>
            <div
              style={css(
                "position:absolute;left:0;right:0;bottom:0;z-index:60;background:#fff;border-radius:22px 22px 0 0;padding:12px 14px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -20px 50px -20px rgba(15,6,35,.4);",
              )}
            >
              <div
                style={css(
                  "width:40px;height:4px;background:rgba(15,6,35,.15);border-radius:999px;margin:4px auto 14px;",
                )}
              ></div>
              <MenuItem onClick={() => go("input")} label="🔥 New roast" />
              <MenuItem onClick={() => go("history")} label="🗒️ Roast history" />
              <MenuItem onClick={() => go("settings")} label="⚙️ Settings & API key" />
              <MenuItem onClick={goPaywall} label={`⚡ Get the 6-Month Pass · ${isIN ? "₹199" : "$9.99"}`} color="#ed3237" />
              <MenuItem onClick={goHome} label="← Back to home" color="#808080" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Hireability arc: counts the number up from `before` to `after` and grows the
// bar to match — the visible "the ₹49 bought me this" payoff.
function ScoreArc({ before, after }: { before: number; after: number }) {
  const [val, setVal] = useState(before);
  const [fill, setFill] = useState(false);
  useEffect(() => {
    setVal(before);
    setFill(false);
    const grow = setTimeout(() => setFill(true), 60);
    const start = performance.now();
    const dur = 1100;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(before + (after - before) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      clearTimeout(grow);
      cancelAnimationFrame(raf);
    };
  }, [before, after]);
  const delta = Math.max(0, after - before);
  const beforePct = Math.max(0, Math.min(100, before));
  const afterPct = Math.max(0, Math.min(100, after));
  return (
    <div style={css("border:1px solid rgba(15,6,35,.1);border-radius:16px;background:#fff;padding:17px 18px;")}>
      <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;")}>
        <span style={css(GLOW_LABEL)}>HIREABILITY</span>
        {delta > 0 && (
          <span
            style={css(
              "background:rgba(31,138,91,.12);color:#1f8a5b;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;",
            )}
          >
            +{delta} pts
          </span>
        )}
      </div>
      <div style={css("display:flex;align-items:baseline;gap:8px;margin-bottom:12px;")}>
        <span style={css("font-size:40px;font-weight:900;letter-spacing:-.02em;color:#0f0623;line-height:1;")}>
          {val}
        </span>
        <span style={css("font-size:15px;font-weight:700;color:#9c9c9c;")}>/100</span>
        <span style={css("font-size:12.5px;color:#9c9c9c;font-weight:600;margin-left:2px;")}>
          was {before}
        </span>
      </div>
      <div style={css("position:relative;height:10px;border-radius:999px;background:rgba(15,6,35,.08);overflow:hidden;")}>
        <div
          style={css(
            `position:absolute;inset:0 auto 0 0;height:100%;border-radius:999px;background:linear-gradient(90deg,#f98731,#ed3237 55%,#1f8a5b);width:${
              fill ? afterPct : beforePct
            }%;transition:width 1.1s cubic-bezier(.22,1,.36,1);`,
          )}
        ></div>
      </div>
    </div>
  );
}

// A simple titled list card used for the recruiter-read and landmine sections.
function GlowList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div style={css(GLOW_LABEL + "margin-bottom:10px;")}>{label}</div>
      <div style={css("display:flex;flex-direction:column;gap:8px;")}>
        {items.map((it, i) => (
          <div
            key={i}
            style={css(
              "display:flex;gap:9px;align-items:flex-start;background:#fff;border:1px solid rgba(15,6,35,.1);border-radius:12px;padding:11px 13px;font-size:13px;color:#333;line-height:1.45;",
            )}
          >
            <span style={css("color:#4e3188;font-weight:800;flex:none;")}>›</span>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: string }) {
  return (
    <div
      style={css(
        "position:fixed;bottom:26px;left:50%;transform:translateX(-50%);z-index:200;background:#0f0623;color:#fff;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:600;box-shadow:0 18px 34px -12px rgba(0,0,0,.5);animation:fadeup .3s ease;",
      )}
    >
      {toast}
    </div>
  );
}

function MenuItem({
  onClick,
  label,
  color,
}: {
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={css(
        "width:100%;text-align:left;border:none;background:transparent;cursor:pointer;padding:15px 12px;border-radius:12px;font-size:16px;font-weight:700;display:flex;gap:12px;align-items:center;" +
          (color ? `color:${color};` : ""),
      )}
    >
      {label}
    </button>
  );
}
