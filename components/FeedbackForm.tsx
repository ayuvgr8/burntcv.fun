"use client";

import { useState } from "react";
import { css } from "./css";

const TYPES: { id: string; label: string }[] = [
  { id: "idea", label: "💡 Idea" },
  { id: "bug", label: "🐞 Bug" },
  { id: "other", label: "💬 Other" },
];

// Shared feedback form — used both in the in-app "feedback" screen and on the
// standalone /feedback page. Posts to /api/feedback, which archives to Redis and
// emails FEEDBACK_TO. Always shows a friendly success (the endpoint can't fail
// loudly for the user).
export default function FeedbackForm({ compact }: { compact?: boolean }) {
  const [type, setType] = useState("idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — hidden from users
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSend = message.trim().length >= 3 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, email, type, website }),
      });
    } catch {
      /* the endpoint archives server-side; show success regardless */
    }
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div
        style={css(
          "background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;padding:28px 22px;text-align:center;",
        )}
      >
        <div style={css("font-size:38px;")}>🙏</div>
        <div style={css("font-weight:800;font-size:17px;margin:10px 0 4px;")}>
          Thanks — got it.
        </div>
        <p style={css("font-size:13.5px;color:#5a5a5a;line-height:1.5;margin:0;")}>
          Your feedback landed with us{email.trim() ? " — we may reply to your email" : ""}.
          It genuinely shapes what we build next.
        </p>
      </div>
    );
  }

  const label = "font-size:12.5px;font-weight:700;color:#5a5a5a;margin-bottom:7px;display:block;";

  return (
    <div
      style={css(
        `background:#fff;border:1px solid rgba(15,6,35,.08);border-radius:16px;padding:${compact ? "18px" : "22px"};`,
      )}
    >
      {/* Type */}
      <span style={css(label)}>What&apos;s this about?</span>
      <div style={css("display:flex;gap:8px;margin-bottom:16px;")}>
        {TYPES.map((t) => {
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              style={css(
                "flex:1;cursor:pointer;padding:10px 8px;border-radius:11px;font-weight:700;font-size:13px;" +
                  (active
                    ? "border:1.5px solid #4e3188;background:rgba(78,49,136,.08);color:#4e3188;"
                    : "border:1.5px solid rgba(15,6,35,.12);background:#faf9f7;color:#5a5a5a;"),
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Message */}
      <span style={css(label)}>Your feedback</span>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={4000}
        rows={5}
        placeholder="What worked, what didn't, what you wish it did…"
        style={css(
          "width:100%;box-sizing:border-box;resize:vertical;border:1.5px solid rgba(15,6,35,.14);border-radius:11px;padding:12px;font-size:14px;line-height:1.5;color:#222;background:#faf9f7;font-family:inherit;",
        )}
      />

      {/* Email (optional) */}
      <span style={css(label + "margin-top:14px;")}>Your email (optional)</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="so we can reply — leave blank to stay anonymous"
        style={css(
          "width:100%;box-sizing:border-box;border:1.5px solid rgba(15,6,35,.14);border-radius:11px;padding:12px;font-size:14px;color:#222;background:#faf9f7;",
        )}
      />

      {/* Honeypot — visually hidden, off-screen; bots fill it, humans don't. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        aria-hidden="true"
        style={css("position:absolute;left:-9999px;width:1px;height:1px;opacity:0;")}
      />

      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        style={css(
          "width:100%;margin-top:16px;border:none;cursor:pointer;padding:15px;border-radius:13px;font-weight:800;font-size:15px;color:#fff;" +
            (canSend
              ? "background:linear-gradient(115deg,#f98731,#ed3237 62%,#ea4c89);"
              : "background:#c9c4d0;cursor:not-allowed;"),
        )}
      >
        {sending ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
