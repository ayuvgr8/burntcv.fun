"use client";

// BurntCV Hire — the recruiter workspace (PRD-Hire §17).
//
// One client component driving the whole v0 flow:
//   sign in (magic link) → create role (JD → draft requirements) → confirm the
//   bar (weights/categories/knockouts — THE human gate) → add candidates
//   (paste/PDF + consent attestation) → pipeline progress → fit report
//   (evidence-cited, per-requirement) → decision (Advance/Hold/Pass) → data
//   controls (export / delete / delete-all) + audit trail.
//
// Design language: audit tool, not comedy. White cards, slate ink, one blue.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "../css";
import ProductMenu from "../ProductMenu";
import type {
  AuditEvent,
  Candidate,
  DecisionOutcome,
  DimensionScore,
  FitBand,
  Requirement,
  Role,
} from "@/lib/hire/types";

const BLUE = "#1a56db";
const INK = "#101828";
const MUTED = "#475467";
const FAINT = "#98a2b3";
const BG = "#f7f8fa";
const LINE = "rgba(16,24,40,.09)";

const TOKEN_KEY = "burntcv_hire_token";

// ---------- small shared bits ----------

const BAND_META: Record<FitBand, { label: string; fg: string; bg: string }> = {
  STRONG: { label: "Strong fit", fg: "#067647", bg: "rgba(6,118,71,.09)" },
  POSSIBLE: { label: "Possible fit", fg: "#175cd3", bg: "rgba(23,92,211,.09)" },
  WEAK: { label: "Weak fit", fg: "#b42318", bg: "rgba(180,35,24,.08)" },
  INSUFFICIENT_EVIDENCE: { label: "Needs human review", fg: "#b54708", bg: "rgba(181,71,8,.1)" },
};

const CATEGORY_META: Record<string, { label: string; fg: string; bg: string }> = {
  MUST_HAVE: { label: "Must-have", fg: "#b42318", bg: "rgba(180,35,24,.08)" },
  PREFERRED: { label: "Preferred", fg: "#175cd3", bg: "rgba(23,92,211,.09)" },
  IMPLICIT: { label: "Implicit", fg: "#6941c6", bg: "rgba(105,65,198,.09)" },
};

const STAGE_LABEL: Record<string, string> = {
  new: "Queued",
  extracted: "Extracted",
  rated: "Rated",
  scored: "Scored",
  review: "Needs review",
};

function Chip({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return (
    <span
      style={css(
        `display:inline-flex;align-items:center;font-size:11px;font-weight:800;letter-spacing:.03em;color:${fg};background:${bg};padding:3px 9px;border-radius:999px;white-space:nowrap;`,
      )}
    >
      {text}
    </span>
  );
}

function Card({ children, pad = 22 }: { children: React.ReactNode; pad?: number }) {
  return (
    <div
      style={css(
        `background:#fff;border:1px solid ${LINE};border-radius:16px;padding:${pad}px;`,
      )}
    >
      {children}
    </div>
  );
}

function Btn({
  children,
  onClick,
  kind = "primary",
  disabled = false,
  small = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger" | "dark";
  disabled?: boolean;
  small?: boolean;
}) {
  const base = `border:none;cursor:${disabled ? "default" : "pointer"};font-family:inherit;font-weight:800;font-size:${small ? 12.5 : 14}px;padding:${small ? "8px 13px" : "12px 20px"};border-radius:10px;opacity:${disabled ? 0.5 : 1};`;
  const kinds: Record<string, string> = {
    primary: `background:${BLUE};color:#fff;`,
    ghost: `background:#fff;color:${INK};border:1px solid rgba(16,24,40,.14);`,
    danger: `background:rgba(180,35,24,.07);color:#b42318;border:1px solid rgba(180,35,24,.2);`,
    dark: `background:${INK};color:#fff;`,
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={css(base + kinds[kind])}>
      {children}
    </button>
  );
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={css(
        `font-family:ui-monospace,Menlo,monospace;font-size:10.5px;letter-spacing:.12em;color:${FAINT};text-transform:uppercase;margin:0 0 7px;`,
      )}
    >
      {children}
    </div>
  );
}

const inputStyle = `width:100%;box-sizing:border-box;background:#fff;border:1px solid rgba(16,24,40,.14);border-radius:10px;padding:11px 13px;font-size:14px;font-family:inherit;color:${INK};outline:none;`;

// ---------- API helper ----------

class ApiError extends Error {
  status: number;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
  }
}

async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`/api/hire${path}`, {
    method: opts.method ?? (body !== undefined ? "POST" : "GET"),
    headers,
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || "request_failed");
  return data as T;
}

// ---------- types for API payloads ----------

interface RoleSummary {
  id: string;
  title: string;
  status: string;
  confirmed: boolean;
  requirementCount: number;
  candidateCount: number;
  createdAt: number;
}

interface CandidateSummary {
  id: string;
  displayName: string;
  stage: string;
  stageError: string | null;
  band: FitBand | null;
  overallScore: number | null;
  confidence: number | null;
  knockoutFailures: number;
  needsReview: boolean;
  decision: { outcome: DecisionOutcome } | null;
  createdAt: number;
  purgeAfter: number;
}

// ---------- root component ----------

type View =
  | { kind: "roles" }
  | { kind: "newRole" }
  | { kind: "role"; roleId: string }
  | { kind: "candidate"; candId: string }
  | { kind: "audit" };

export default function HireConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [view, setView] = useState<View>({ kind: "roles" });
  const [banner, setBanner] = useState<string | null>(null);

  // Boot: claim a magic link if present, else load the stored session.
  useEffect(() => {
    const url = new URL(window.location.href);
    const ht = url.searchParams.get("ht");
    const stored = localStorage.getItem(TOKEN_KEY);
    (async () => {
      if (ht) {
        try {
          const res = await api<{ token: string; account: { orgName: string; email: string } }>(
            "/auth/claim",
            { body: { token: ht } },
          );
          localStorage.setItem(TOKEN_KEY, res.token);
          setToken(res.token);
          setAccountEmail(res.account.email);
          setOrgName(res.account.orgName);
        } catch {
          setBanner("That sign-in link is invalid or expired — request a fresh one.");
        }
        url.searchParams.delete("ht");
        window.history.replaceState({}, "", url.toString());
      } else if (stored) {
        try {
          const res = await api<{ account: { email: string; orgName: string } }>("/account", {
            token: stored,
          });
          setToken(stored);
          setAccountEmail(res.account.email);
          setOrgName(res.account.orgName);
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setBooted(true);
    })();
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setView({ kind: "roles" });
  }, []);

  if (!booted) {
    return (
      <div style={css(`min-height:100vh;background:${BG};display:flex;align-items:center;justify-content:center;color:${FAINT};font-size:14px;`)}>
        Loading…
      </div>
    );
  }

  return (
    <div style={css(`min-height:100vh;background:${BG};`)}>
      {/* header */}
      <div
        style={css(
          `border-bottom:1px solid ${LINE};background:#fff;`,
        )}
      >
        <div
          style={css(
            "max-width:1080px;margin:0 auto;padding:14px 26px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;",
          )}
        >
          <Link href="/hire" style={css("text-decoration:none;display:flex;align-items:center;gap:8px;")}>
            <span
              style={css(
                "width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1a56db,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:13px;",
              )}
            >
              🎯
            </span>
            <span style={css(`font-weight:900;font-size:16px;letter-spacing:-.02em;color:${INK};`)}>
              BurntCV <span style={css(`color:${BLUE};`)}>Hire</span>
            </span>
          </Link>
          <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap;")}>
            <ProductMenu />
            {token && (
              <>
                <button
                  onClick={() => setView({ kind: "audit" })}
                  style={css(
                    `border:none;background:transparent;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;color:${MUTED};padding:8px 6px;`,
                  )}
                >
                  Audit trail
                </button>
                <span
                  style={css(
                    `font-size:12.5px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`,
                  )}
                >
                  {accountEmail}
                </span>
                <Btn kind="ghost" small onClick={signOut}>
                  Sign out
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={css("max-width:1080px;margin:0 auto;padding:30px 26px 70px;")}>
        {banner && (
          <div
            style={css(
              "background:rgba(181,71,8,.08);border:1px solid rgba(181,71,8,.25);color:#b54708;border-radius:12px;padding:12px 16px;font-size:13.5px;font-weight:600;margin:0 0 20px;display:flex;justify-content:space-between;gap:12px;",
            )}
          >
            <span>{banner}</span>
            <button
              onClick={() => setBanner(null)}
              style={css("border:none;background:none;cursor:pointer;color:inherit;font-weight:800;")}
            >
              ✕
            </button>
          </div>
        )}
        {!token ? (
          <AuthView
            onSignedIn={(t, email, org) => {
              setToken(t);
              setAccountEmail(email);
              setOrgName(org);
            }}
          />
        ) : view.kind === "roles" ? (
          <RolesView orgName={orgName} token={token} onNew={() => setView({ kind: "newRole" })} onOpen={(id) => setView({ kind: "role", roleId: id })} onSignOut={signOut} />
        ) : view.kind === "newRole" ? (
          <NewRoleView token={token} onBack={() => setView({ kind: "roles" })} onCreated={(id) => setView({ kind: "role", roleId: id })} />
        ) : view.kind === "role" ? (
          <RoleView token={token} roleId={view.roleId} onBack={() => setView({ kind: "roles" })} onOpenCandidate={(id) => setView({ kind: "candidate", candId: id })} />
        ) : view.kind === "candidate" ? (
          <CandidateView token={token} candId={view.candId} onBack={(roleId) => setView(roleId ? { kind: "role", roleId } : { kind: "roles" })} />
        ) : (
          <AuditView token={token} onBack={() => setView({ kind: "roles" })} />
        )}
      </div>
    </div>
  );
}

// ---------- auth ----------

function AuthView({
  onSignedIn,
}: {
  onSignedIn: (token: string, email: string, orgName: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!email.includes("@") || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ sent: boolean; devMode?: boolean; devLink?: string }>(
        "/auth/request",
        { body: { email, orgName: org } },
      );
      if (res.devMode && res.devLink) {
        // Local dev without email config: the link comes back directly —
        // complete the claim in place so the flow stays testable.
        const ht = new URL(res.devLink).searchParams.get("ht");
        const claim = await api<{ token: string; account: { email: string; orgName: string } }>(
          "/auth/claim",
          { body: { token: ht } },
        );
        localStorage.setItem(TOKEN_KEY, claim.token);
        onSignedIn(claim.token, claim.account.email, claim.account.orgName);
      } else {
        setSent(true);
      }
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "";
      setErr(
        code === "rate_limited"
          ? "Too many attempts — wait a minute."
          : code === "email_not_configured"
            ? "Sign-in email isn't configured on this server yet — we're on it. Try again later."
            : "Could not send the sign-in link. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={css("max-width:440px;margin:40px auto 0;")}>
      <Card pad={28}>
        {sent ? (
          <>
            <div style={css("font-size:34px;")}>📬</div>
            <h1 style={css(`font-size:21px;font-weight:900;letter-spacing:-.02em;margin:12px 0 8px;color:${INK};`)}>
              Check your email
            </h1>
            <p style={css(`font-size:14px;line-height:1.6;color:${MUTED};margin:0;`)}>
              We sent a sign-in link to <strong>{email}</strong>. It works once and
              expires in 15 minutes.
            </p>
          </>
        ) : (
          <>
            <h1 style={css(`font-size:22px;font-weight:900;letter-spacing:-.02em;margin:0 0 6px;color:${INK};`)}>
              Recruiter workspace
            </h1>
            <p style={css(`font-size:13.5px;line-height:1.6;color:${MUTED};margin:0 0 20px;`)}>
              Sign in with your work email — no password. Free pilot: 1 role, 5
              candidates, full fit reports.
            </p>
            <MonoLabel>Work email</MonoLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="you@company.com"
              style={css(inputStyle + "margin:0 0 14px;")}
            />
            <MonoLabel>Team / org name (optional)</MonoLabel>
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Acme Talent"
              style={css(inputStyle + "margin:0 0 18px;")}
            />
            {err && (
              <div style={css("font-size:13px;color:#b42318;font-weight:600;margin:0 0 12px;")}>{err}</div>
            )}
            <Btn onClick={submit} disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Email me a sign-in link →"}
            </Btn>
            <p style={css(`font-size:11.5px;line-height:1.55;color:${FAINT};margin:16px 0 0;`)}>
              By signing in you accept that candidate data you upload is processed
              solely for role screening under your direction — see the{" "}
              <Link href="/hire/privacy" style={css(`color:${BLUE};`)}>
                Hire data promise
              </Link>
              .
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

// ---------- roles list ----------

function RolesView({
  orgName,
  token,
  onNew,
  onOpen,
  onSignOut,
}: {
  orgName: string;
  token: string;
  onNew: () => void;
  onOpen: (roleId: string) => void;
  onSignOut: () => void;
}) {
  const [roles, setRoles] = useState<RoleSummary[] | null>(null);
  const [usage, setUsage] = useState<{ screensUsed: number; limits: { screensPerMonth: number } } | null>(null);

  useEffect(() => {
    api<{ roles: RoleSummary[] }>("/roles", { token }).then((r) => setRoles(r.roles)).catch(() => setRoles([]));
    api<{ usage: { screensUsed: number; limits: { screensPerMonth: number } } }>("/account", { token })
      .then((r) => setUsage(r.usage))
      .catch(() => {});
  }, [token]);

  const deleteAll = async () => {
    if (
      !window.confirm(
        "Delete ALL data in this workspace — every role, candidate, report and the audit trail? This cannot be undone.",
      )
    )
      return;
    await api("/account", { method: "DELETE", token });
    onSignOut();
  };

  return (
    <>
      <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 22px;")}>
        <div>
          <MonoLabel>{orgName || "Workspace"}</MonoLabel>
          <h1 style={css(`font-size:26px;font-weight:900;letter-spacing:-.025em;margin:0;color:${INK};`)}>
            Roles
          </h1>
        </div>
        <div style={css("display:flex;align-items:center;gap:12px;")}>
          {usage && (
            <span style={css(`font-size:12px;color:${FAINT};font-family:ui-monospace,Menlo,monospace;`)}>
              {usage.screensUsed}/{usage.limits.screensPerMonth} screens this month
            </span>
          )}
          <Btn onClick={onNew}>+ New role</Btn>
        </div>
      </div>

      {roles === null ? (
        <div style={css(`color:${FAINT};font-size:14px;`)}>Loading roles…</div>
      ) : roles.length === 0 ? (
        <Card pad={36}>
          <div style={css("text-align:center;max-width:420px;margin:0 auto;")}>
            <div style={css("font-size:36px;")}>🗂️</div>
            <div style={css(`font-weight:800;font-size:17px;margin:12px 0 6px;color:${INK};`)}>
              No roles yet
            </div>
            <div style={css(`font-size:13.5px;line-height:1.6;color:${MUTED};margin:0 0 18px;`)}>
              Paste a job description and we&apos;ll decompose it into weighted,
              editable requirements — then you screen candidates against the bar{" "}
              <em>you</em> confirmed.
            </div>
            <Btn onClick={onNew}>Create your first role</Btn>
          </div>
        </Card>
      ) : (
        <div style={css("display:flex;flex-direction:column;gap:12px;")}>
          {roles.map((r) => (
            <div
              key={r.id}
              onClick={() => onOpen(r.id)}
              style={css(
                `background:#fff;border:1px solid ${LINE};border-radius:14px;padding:18px 20px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;`,
              )}
            >
              <div>
                <div style={css(`font-weight:800;font-size:16px;color:${INK};`)}>{r.title}</div>
                <div style={css(`font-size:12.5px;color:${FAINT};margin-top:3px;`)}>
                  {r.requirementCount} requirements · {r.candidateCount} candidate
                  {r.candidateCount === 1 ? "" : "s"}
                </div>
              </div>
              <div style={css("display:flex;gap:8px;align-items:center;")}>
                {!r.confirmed && <Chip text="Bar not confirmed" fg="#b54708" bg="rgba(181,71,8,.1)" />}
                {r.status === "CLOSED" && <Chip text="Closed" fg={MUTED} bg="rgba(16,24,40,.06)" />}
                <span style={css(`color:${FAINT};font-size:16px;`)}>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={css("margin:40px 0 0;display:flex;justify-content:flex-end;")}>
        <Btn kind="danger" small onClick={deleteAll}>
          Delete all workspace data
        </Btn>
      </div>
    </>
  );
}

// ---------- new role ----------

function NewRoleView({
  token,
  onBack,
  onCreated,
}: {
  token: string;
  onBack: () => void;
  onCreated: (roleId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (jd.trim().length < 80 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ role: Role }>("/roles", { token, body: { title, jdText: jd } });
      onCreated(res.role.id);
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "";
      setErr(
        code === "role_limit_reached"
          ? "Role limit reached for the pilot — delete an old role first."
          : code === "rate_limited"
            ? "Too many requests — give it a minute."
            : "Could not decompose that JD. Check the text and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={css("max-width:720px;margin:0 auto;")}>
      <button onClick={onBack} style={css(`border:none;background:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:${BLUE};padding:0;margin:0 0 16px;`)}>
        ← Roles
      </button>
      <Card pad={26}>
        <h1 style={css(`font-size:21px;font-weight:900;letter-spacing:-.02em;margin:0 0 4px;color:${INK};`)}>
          New role
        </h1>
        <p style={css(`font-size:13.5px;line-height:1.6;color:${MUTED};margin:0 0 20px;`)}>
          Paste the full job description. We&apos;ll draft weighted requirements —
          nothing is scored until <strong>you</strong> review and confirm them.
        </p>
        <MonoLabel>Role title (optional — we&apos;ll detect it)</MonoLabel>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior Backend Engineer"
          style={css(inputStyle + "margin:0 0 14px;")}
        />
        <MonoLabel>Job description</MonoLabel>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the JD here…"
          rows={12}
          style={css(inputStyle + "resize:vertical;line-height:1.55;margin:0 0 6px;")}
        />
        <div style={css(`font-size:11.5px;color:${FAINT};margin:0 0 16px;font-family:ui-monospace,Menlo,monospace;`)}>
          {jd.trim().length} chars · min 80
        </div>
        {err && <div style={css("font-size:13px;color:#b42318;font-weight:600;margin:0 0 12px;")}>{err}</div>}
        <Btn onClick={create} disabled={busy || jd.trim().length < 80}>
          {busy ? "Decomposing the JD…" : "Decompose into requirements →"}
        </Btn>
      </Card>
    </div>
  );
}

// ---------- role view: requirements editor + candidates ----------

function RoleView({
  token,
  roleId,
  onBack,
  onOpenCandidate,
}: {
  token: string;
  roleId: string;
  onBack: () => void;
  onOpenCandidate: (candId: string) => void;
}) {
  const [role, setRole] = useState<Role | null>(null);
  const [cands, setCands] = useState<CandidateSummary[]>([]);
  const [editingBar, setEditingBar] = useState(false);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [savingBar, setSavingBar] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const processing = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await api<{ role: Role; candidates: CandidateSummary[] }>(`/roles/${roleId}`, { token });
    setRole(res.role);
    setCands(res.candidates);
    setReqs(res.role.requirements);
    if (!res.role.confirmed) setEditingBar(true);
    return res;
  }, [roleId, token]);

  useEffect(() => {
    load().catch(() => setErr("Could not load this role."));
  }, [load]);

  // Drive the pipeline for any candidate that isn't done yet.
  const drive = useCallback(
    async (candId: string) => {
      if (processing.current.has(candId)) return;
      processing.current.add(candId);
      try {
        for (let hops = 0; hops < 6; hops++) {
          const res = await api<{ stage: string; done: boolean }>(`/candidates/${candId}/process`, {
            token,
            method: "POST",
            body: {},
          });
          setCands((cur) => cur.map((c) => (c.id === candId ? { ...c, stage: res.stage } : c)));
          if (res.done) break;
        }
      } catch {
        /* stage errors already routed to review server-side; refresh below */
      } finally {
        processing.current.delete(candId);
        load().catch(() => {});
      }
    },
    [token, load],
  );

  useEffect(() => {
    for (const c of cands) {
      if (c.stage !== "scored" && c.stage !== "review") void drive(c.id);
    }
    // Kick the pipeline for unfinished candidates whenever the list refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cands.map((c) => `${c.id}:${c.stage}`).join(","), drive]);

  const saveBar = async () => {
    setSavingBar(true);
    setErr(null);
    try {
      const res = await api<{ role: Role }>(`/roles/${roleId}/requirements`, {
        token,
        method: "PUT",
        body: {
          requirements: reqs.map((r, i) => ({
            id: r.id,
            label: r.label,
            category: r.category,
            weight: r.weight,
            isKnockout: r.isKnockout,
            detail: r.detail,
            orderIndex: i,
          })),
        },
      });
      setRole(res.role);
      setReqs(res.role.requirements);
      setEditingBar(false);
    } catch {
      setErr("Could not save the requirements — check every row has a label.");
    } finally {
      setSavingBar(false);
    }
  };

  const deleteRole = async () => {
    if (!window.confirm(`Delete "${role?.title}" and all its candidates? This cannot be undone.`)) return;
    await api(`/roles/${roleId}`, { method: "DELETE", token });
    onBack();
  };

  if (!role) {
    return <div style={css(`color:${FAINT};font-size:14px;`)}>{err ?? "Loading role…"}</div>;
  }

  const knockouts = reqs.filter((r) => r.isKnockout).length;

  return (
    <>
      <button onClick={onBack} style={css(`border:none;background:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:${BLUE};padding:0;margin:0 0 14px;`)}>
        ← Roles
      </button>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 20px;")}>
        <div>
          <h1 style={css(`font-size:25px;font-weight:900;letter-spacing:-.025em;margin:0;color:${INK};`)}>
            {role.title}
          </h1>
          <div style={css(`font-size:12.5px;color:${FAINT};margin-top:5px;`)}>
            Seniority: {role.seniority} · {reqs.length} requirements
            {knockouts > 0 ? ` · ${knockouts} knockout${knockouts === 1 ? "" : "s"}` : ""}
          </div>
        </div>
        <Btn kind="danger" small onClick={deleteRole}>
          Delete role
        </Btn>
      </div>

      {role.decompositionNotes && !role.confirmed && (
        <div
          style={css(
            "background:rgba(105,65,198,.06);border:1px solid rgba(105,65,198,.18);color:#53389e;border-radius:12px;padding:12px 16px;font-size:13px;line-height:1.55;margin:0 0 18px;",
          )}
        >
          <strong>Worth clarifying:</strong> {role.decompositionNotes}
        </div>
      )}

      {/* ---- the bar ---- */}
      <Card>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 6px;")}>
          <div>
            <div style={css(`font-weight:900;font-size:17px;color:${INK};letter-spacing:-.01em;`)}>
              The hiring bar
            </div>
            <div style={css(`font-size:12.5px;color:${MUTED};margin-top:3px;`)}>
              {role.confirmed
                ? "Confirmed by you — scoring uses exactly these weights."
                : "Drafted by AI from the JD. Review, adjust, confirm — nothing scores until you do."}
            </div>
          </div>
          {editingBar ? (
            <div style={css("display:flex;gap:8px;")}>
              <Btn
                kind="ghost"
                small
                onClick={() =>
                  setReqs((cur) => [
                    ...cur,
                    {
                      id: `new_${Date.now()}_${cur.length}`,
                      label: "",
                      category: "PREFERRED",
                      weight: 5,
                      isKnockout: false,
                      knockoutSuggested: false,
                      detail: "",
                      rationale: "",
                      source: "RECRUITER",
                      orderIndex: cur.length,
                    } as Requirement,
                  ])
                }
              >
                + Add requirement
              </Btn>
              <Btn small onClick={saveBar} disabled={savingBar || reqs.some((r) => !r.label.trim())}>
                {savingBar ? "Saving…" : role.confirmed ? "Save changes" : "Confirm the bar ✓"}
              </Btn>
            </div>
          ) : (
            <Btn kind="ghost" small onClick={() => setEditingBar(true)}>
              Edit
            </Btn>
          )}
        </div>

        <div style={css("display:flex;flex-direction:column;")}>
          {reqs.map((r, i) => {
            const cat = CATEGORY_META[r.category];
            return editingBar ? (
              <div
                key={r.id}
                style={css(
                  `border-top:1px solid ${LINE};padding:14px 0;display:flex;flex-direction:column;gap:10px;`,
                )}
              >
                <div style={css("display:flex;gap:10px;flex-wrap:wrap;align-items:center;")}>
                  <input
                    value={r.label}
                    onChange={(e) =>
                      setReqs((cur) => cur.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder="Requirement label"
                    style={css(inputStyle + "flex:1;min-width:200px;font-weight:700;")}
                  />
                  <select
                    value={r.category}
                    onChange={(e) =>
                      setReqs((cur) =>
                        cur.map((x, j) => (j === i ? { ...x, category: e.target.value as Requirement["category"] } : x)),
                      )
                    }
                    style={css(inputStyle + "width:auto;font-weight:700;")}
                  >
                    <option value="MUST_HAVE">Must-have</option>
                    <option value="PREFERRED">Preferred</option>
                    <option value="IMPLICIT">Implicit</option>
                  </select>
                  <button
                    onClick={() => setReqs((cur) => cur.filter((_, j) => j !== i))}
                    aria-label="Remove requirement"
                    style={css(
                      "border:none;background:rgba(16,24,40,.05);cursor:pointer;width:34px;height:34px;border-radius:9px;color:#98a2b3;font-size:14px;",
                    )}
                  >
                    ✕
                  </button>
                </div>
                <div style={css("display:flex;gap:16px;flex-wrap:wrap;align-items:center;")}>
                  <label style={css(`display:flex;align-items:center;gap:10px;font-size:12.5px;color:${MUTED};font-weight:700;`)}>
                    Weight
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={r.weight}
                      onChange={(e) =>
                        setReqs((cur) =>
                          cur.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)),
                        )
                      }
                      style={css("width:140px;accent-color:#1a56db;")}
                    />
                    <span style={css(`font-family:ui-monospace,Menlo,monospace;color:${INK};width:18px;`)}>
                      {r.weight}
                    </span>
                  </label>
                  <label
                    style={css(
                      `display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:700;color:${r.isKnockout ? "#b42318" : MUTED};cursor:pointer;`,
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={r.isKnockout}
                      onChange={(e) =>
                        setReqs((cur) =>
                          cur.map((x, j) => (j === i ? { ...x, isKnockout: e.target.checked } : x)),
                        )
                      }
                      style={css("accent-color:#b42318;width:15px;height:15px;")}
                    />
                    Knockout{r.knockoutSuggested && !r.isKnockout ? " (AI suggests)" : ""}
                  </label>
                </div>
                <input
                  value={r.detail}
                  onChange={(e) =>
                    setReqs((cur) => cur.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))
                  }
                  placeholder="What good evidence looks like (feeds the rating rubric)"
                  style={css(inputStyle + "font-size:13px;")}
                />
              </div>
            ) : (
              <div
                key={r.id}
                style={css(
                  `border-top:1px solid ${LINE};padding:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;`,
                )}
              >
                <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                  <span style={css(`font-weight:700;font-size:14px;color:${INK};`)}>{r.label}</span>
                  <Chip text={cat.label} fg={cat.fg} bg={cat.bg} />
                  {r.isKnockout && <Chip text="Knockout" fg="#b42318" bg="rgba(180,35,24,.08)" />}
                  {r.source === "RECRUITER" && <Chip text="Edited by you" fg="#067647" bg="rgba(6,118,71,.08)" />}
                </div>
                <div style={css(`font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${MUTED};`)}>
                  w{r.weight}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---- candidates ---- */}
      <div style={css("margin:26px 0 0;")}>
        <CandidatesSection
          token={token}
          role={role}
          cands={cands}
          onAdded={() => load()}
          onOpen={onOpenCandidate}
        />
      </div>
    </>
  );
}

// ---------- candidates list + intake ----------

function CandidatesSection({
  token,
  role,
  cands,
  onAdded,
  onOpen,
}: {
  token: string;
  role: Role;
  cands: CandidateSummary[];
  onAdded: () => void;
  onOpen: (candId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [basis, setBasis] = useState("candidate_application");
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !attested || (!text.trim() && !file)) return;
    setBusy(true);
    setErr(null);
    try {
      const form = new FormData();
      form.set("displayName", name);
      form.set("consentBasis", basis);
      if (text.trim()) form.set("text", text);
      else if (file) form.set("file", file);
      await api(`/roles/${role.id}/candidates`, { token, form });
      setAdding(false);
      setName("");
      setText("");
      setFile(null);
      setAttested(false);
      onAdded();
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "";
      setErr(
        code === "no_text"
          ? "That résumé has too little machine-readable text (scanned PDF?). Paste the text instead."
          : code === "candidate_limit_reached"
            ? "Candidate limit reached for this role in the pilot."
            : code === "screen_quota_reached"
              ? "Monthly screen quota reached."
              : code === "requirements_not_confirmed"
                ? "Confirm the hiring bar first — the human gate comes before scoring."
                : "Could not add that candidate. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 10px;")}>
        <div style={css(`font-weight:900;font-size:17px;color:${INK};letter-spacing:-.01em;`)}>
          Candidates{" "}
          <span style={css(`font-weight:600;font-size:13px;color:${FAINT};`)}>({cands.length})</span>
        </div>
        {!adding && (
          <Btn small onClick={() => setAdding(true)} disabled={!role.confirmed}>
            + Add candidate
          </Btn>
        )}
      </div>
      {!role.confirmed && (
        <div style={css(`font-size:13px;color:#b54708;font-weight:600;`)}>
          Confirm the hiring bar above before adding candidates — the recruiter
          defines what matters, then the AI evaluates against it.
        </div>
      )}

      {adding && (
        <div style={css(`border:1px dashed rgba(26,86,219,.35);border-radius:13px;padding:18px;margin:8px 0 16px;display:flex;flex-direction:column;gap:12px;background:rgba(26,86,219,.02);`)}>
          <div style={css("display:flex;gap:10px;flex-wrap:wrap;")}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Candidate name / label (optional)"
              style={css(inputStyle + "flex:1;min-width:200px;")}
            />
            <label
              style={css(
                `display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:${file ? "#067647" : MUTED};background:#fff;border:1px solid rgba(16,24,40,.14);border-radius:10px;padding:0 14px;cursor:pointer;`,
              )}
            >
              {file ? `📄 ${file.name.slice(0, 24)}` : "📎 Attach PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={css("display:none;")}
              />
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="…or paste the résumé text here (takes precedence over the PDF)"
            rows={6}
            style={css(inputStyle + "resize:vertical;line-height:1.55;")}
          />
          <div style={css("display:flex;gap:12px;flex-wrap:wrap;align-items:center;")}>
            <select value={basis} onChange={(e) => setBasis(e.target.value)} style={css(inputStyle + "width:auto;font-weight:700;")}>
              <option value="candidate_application">Candidate applied to this role</option>
              <option value="recruiter_attestation">I otherwise hold the candidate&apos;s consent</option>
            </select>
            <label style={css(`display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:${MUTED};cursor:pointer;max-width:460px;line-height:1.45;`)}>
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                style={css("accent-color:#1a56db;width:15px;height:15px;flex-shrink:0;")}
              />
              I attest this lawful basis. Data is used only to screen for this role and
              auto-deletes per the retention window.
            </label>
          </div>
          {err && <div style={css("font-size:13px;color:#b42318;font-weight:600;")}>{err}</div>}
          <div style={css("display:flex;gap:8px;")}>
            <Btn onClick={submit} disabled={busy || !attested || (!text.trim() && !file)}>
              {busy ? "Adding…" : "Add & screen →"}
            </Btn>
            <Btn kind="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      <div style={css("display:flex;flex-direction:column;")}>
        {cands.map((c) => {
          const running = c.stage !== "scored" && c.stage !== "review";
          const band = c.band ? BAND_META[c.band] : null;
          return (
            <div
              key={c.id}
              onClick={() => (c.stage === "scored" || c.stage === "review" ? onOpen(c.id) : undefined)}
              style={css(
                `border-top:1px solid ${LINE};padding:14px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;cursor:${running ? "default" : "pointer"};`,
              )}
            >
              <div style={css("display:flex;align-items:center;gap:11px;flex-wrap:wrap;")}>
                <span style={css(`font-weight:800;font-size:14.5px;color:${INK};`)}>{c.displayName}</span>
                {running ? (
                  <Chip text={`⏳ ${STAGE_LABEL[c.stage] ?? c.stage} — screening…`} fg="#175cd3" bg="rgba(23,92,211,.08)" />
                ) : c.stage === "review" ? (
                  <Chip text="⚠ Needs human review" fg="#b54708" bg="rgba(181,71,8,.1)" />
                ) : (
                  band && <Chip text={`${band.label} · ${c.overallScore}`} fg={band.fg} bg={band.bg} />
                )}
                {c.knockoutFailures > 0 && (
                  <Chip text={`${c.knockoutFailures} knockout flag${c.knockoutFailures === 1 ? "" : "s"}`} fg="#b42318" bg="rgba(180,35,24,.08)" />
                )}
                {c.decision && (
                  <Chip
                    text={`Decided: ${c.decision.outcome}`}
                    fg={c.decision.outcome === "ADVANCE" ? "#067647" : c.decision.outcome === "PASS" ? "#b42318" : "#b54708"}
                    bg="rgba(16,24,40,.05)"
                  />
                )}
              </div>
              {!running && <span style={css(`color:${FAINT};font-size:16px;`)}>→</span>}
            </div>
          );
        })}
        {cands.length === 0 && role.confirmed && !adding && (
          <div style={css(`font-size:13.5px;color:${FAINT};padding:8px 0 2px;`)}>
            No candidates yet — add the first one to see an evidence-cited fit report.
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------- candidate fit report ----------

function CandidateView({
  token,
  candId,
  onBack,
}: {
  token: string;
  candId: string;
  onBack: (roleId: string | null) => void;
}) {
  const [cand, setCand] = useState<Candidate | null>(null);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [roleTitle, setRoleTitle] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api<{
      candidate: Candidate;
      role: { id: string; title: string; requirements: Requirement[] } | null;
    }>(`/candidates/${candId}`, { token });
    setCand(res.candidate);
    setReqs(res.role?.requirements ?? []);
    setRoleTitle(res.role?.title ?? "");
    setRoleId(res.role?.id ?? null);
    setNote(res.candidate.decision?.note ?? "");
  }, [candId, token]);

  useEffect(() => {
    load().catch(() => setErr("Could not load this candidate."));
  }, [load]);

  const decide = async (outcome: DecisionOutcome) => {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/candidates/${candId}/decision`, { token, body: { outcome, note } });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const exportData = () => {
    // Signed download via fetch (Authorization header), then save.
    fetch(`/api/hire/candidates/${candId}/export`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((b) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `burntcv-hire-candidate-${candId}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  const del = async () => {
    if (!window.confirm(`Hard-delete ${cand?.displayName}'s data now? This is immediate and logged.`)) return;
    await api(`/candidates/${candId}`, { method: "DELETE", token });
    onBack(roleId);
  };

  if (!cand) return <div style={css(`color:${FAINT};font-size:14px;`)}>{err ?? "Loading candidate…"}</div>;

  const report = cand.fitReport;
  const reqById = new Map(reqs.map((r) => [r.id, r]));
  const band = report ? BAND_META[report.band] : null;
  const purgeDate = new Date(cand.purgeAfter).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <button onClick={() => onBack(roleId)} style={css(`border:none;background:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:${BLUE};padding:0;margin:0 0 14px;`)}>
        ← {roleTitle || "Role"}
      </button>

      {/* header */}
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 18px;")}>
        <div>
          <h1 style={css(`font-size:25px;font-weight:900;letter-spacing:-.025em;margin:0;color:${INK};`)}>
            {cand.displayName}
          </h1>
          <div style={css(`font-size:12.5px;color:${FAINT};margin-top:5px;`)}>
            Consent: {cand.consent.basis === "candidate_application" ? "candidate applied" : "recruiter attestation"} ·
            auto-deletes {purgeDate}
          </div>
        </div>
        <div style={css("display:flex;gap:8px;")}>
          <Btn kind="ghost" small onClick={exportData}>
            ⬇ Export data
          </Btn>
          <Btn kind="danger" small onClick={del}>
            Delete now
          </Btn>
        </div>
      </div>

      {cand.stage === "review" ? (
        <Card>
          <div style={css("font-size:30px;")}>🧐</div>
          <div style={css(`font-weight:800;font-size:17px;margin:10px 0 6px;color:${INK};`)}>
            This candidate needs a human read
          </div>
          <div style={css(`font-size:14px;line-height:1.6;color:${MUTED};`)}>
            The pipeline couldn&apos;t process this résumé reliably
            {cand.stageError ? ` (${cand.stageError})` : ""} — rather than guess, we
            stopped. Read the résumé manually and record your decision below; nothing
            was scored.
          </div>
        </Card>
      ) : !report ? (
        <Card>
          <div style={css(`font-size:14px;color:${MUTED};`)}>Screening in progress…</div>
        </Card>
      ) : (
        <>
          {/* verdict header */}
          <Card>
            <div style={css("display:flex;align-items:center;gap:18px;flex-wrap:wrap;")}>
              {band && (
                <div
                  style={css(
                    `background:${band.bg};color:${band.fg};font-weight:900;font-size:17px;padding:12px 20px;border-radius:12px;`,
                  )}
                >
                  {band.label}
                </div>
              )}
              <div>
                <div style={css(`font-size:30px;font-weight:900;letter-spacing:-.03em;color:${INK};line-height:1;`)}>
                  {report.overallScore}
                  <span style={css(`font-size:15px;color:${FAINT};font-weight:700;`)}> /100</span>
                </div>
                <div style={css(`font-size:12px;color:${FAINT};margin-top:4px;font-family:ui-monospace,Menlo,monospace;`)}>
                  confidence {Math.round(report.confidence * 100)}% · {report.engineVersion}
                </div>
              </div>
              <div style={css("flex:1;min-width:220px;font-size:12.5px;line-height:1.55;color:" + MUTED + ";")}>
                Weighted mean of the per-requirement scores below, using{" "}
                <strong>your confirmed weights</strong> — pure math, reproducible, no
                model in the verdict. N/A dimensions are excluded, not zeroed.
              </div>
            </div>
            {report.knockoutFailures.length > 0 && (
              <div
                style={css(
                  "margin:16px 0 0;background:rgba(180,35,24,.06);border:1px solid rgba(180,35,24,.22);border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;color:#b42318;font-weight:600;",
                )}
              >
                ⚠ Knockout flagged:{" "}
                {report.knockoutFailures
                  .map((id) => reqById.get(id)?.label ?? id)
                  .join(" · ")}{" "}
                — flagged for your review, <em>not</em> auto-rejected. The decision is yours.
              </div>
            )}
            {report.needsReview && (
              <div
                style={css(
                  "margin:16px 0 0;background:rgba(181,71,8,.07);border:1px solid rgba(181,71,8,.25);border-radius:12px;padding:13px 16px;font-size:13.5px;line-height:1.55;color:#b54708;font-weight:600;",
                )}
              >
                Extraction confidence was low (non-standard résumé?) — treat this report
                as a starting point and verify against the original document.
              </div>
            )}
          </Card>

          {/* dimensions */}
          <div style={css("margin:18px 0 0;display:flex;flex-direction:column;gap:12px;")}>
            {report.dimensionScores
              .slice()
              .sort((a, b) => (reqById.get(a.requirementId)?.orderIndex ?? 0) - (reqById.get(b.requirementId)?.orderIndex ?? 0))
              .map((d: DimensionScore) => {
                const req = reqById.get(d.requirementId);
                if (!req) return null;
                const cat = CATEGORY_META[req.category];
                const scoreColor =
                  d.score === null ? FAINT : d.score >= 3 ? "#067647" : d.score === 2 ? "#b54708" : "#b42318";
                return (
                  <Card key={d.requirementId} pad={18}>
                    <div style={css("display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;")}>
                      <div style={css("display:flex;align-items:center;gap:9px;flex-wrap:wrap;")}>
                        <span style={css(`font-weight:800;font-size:14.5px;color:${INK};`)}>{req.label}</span>
                        <Chip text={`${cat.label} · w${req.weight}`} fg={cat.fg} bg={cat.bg} />
                        {req.isKnockout && <Chip text="Knockout" fg="#b42318" bg="rgba(180,35,24,.08)" />}
                      </div>
                      <div style={css(`font-weight:900;font-size:16px;color:${scoreColor};font-family:ui-monospace,Menlo,monospace;`)}>
                        {d.score === null ? "N/A" : `${d.score}/4`}
                      </div>
                    </div>
                    <div style={css(`font-size:13px;line-height:1.55;color:${MUTED};margin:8px 0 0;`)}>
                      {d.reasoning}
                    </div>
                    {d.supportingEvidence.length > 0 && (
                      <div style={css("margin:10px 0 0;display:flex;flex-direction:column;gap:6px;")}>
                        {d.supportingEvidence.map((ev, i) => (
                          <div
                            key={i}
                            style={css(
                              `border-left:3px solid rgba(6,118,71,.5);background:rgba(6,118,71,.04);border-radius:0 9px 9px 0;padding:8px 12px;font-size:12.5px;line-height:1.5;color:${INK};font-style:italic;`,
                            )}
                          >
                            &ldquo;{ev}&rdquo;
                          </div>
                        ))}
                      </div>
                    )}
                    {d.contradictingEvidence.length > 0 && (
                      <div style={css("margin:8px 0 0;display:flex;flex-direction:column;gap:6px;")}>
                        {d.contradictingEvidence.map((ev, i) => (
                          <div
                            key={i}
                            style={css(
                              `border-left:3px solid rgba(180,35,24,.5);background:rgba(180,35,24,.04);border-radius:0 9px 9px 0;padding:8px 12px;font-size:12.5px;line-height:1.5;color:${INK};`,
                            )}
                          >
                            ⚠ {ev}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>

          {/* interview questions */}
          {report.interviewQuestions.length > 0 && (
            <div style={css("margin:22px 0 0;")}>
              <Card>
                <div style={css(`font-weight:900;font-size:17px;color:${INK};letter-spacing:-.01em;margin:0 0 4px;`)}>
                  Interview questions — aimed at the gaps
                </div>
                <div style={css(`font-size:12.5px;color:${MUTED};margin:0 0 8px;`)}>
                  Each question lets the candidate prove or disprove a specific gap. They
                  help you probe — they don&apos;t pre-judge.
                </div>
                {report.interviewQuestions.map((q, i) => (
                  <div key={i} style={css(`border-top:1px solid ${LINE};padding:13px 0;`)}>
                    <div style={css(`font-weight:700;font-size:14px;color:${INK};line-height:1.5;`)}>
                      {i + 1}. {q.question}
                    </div>
                    <div style={css("display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 0;")}>
                      <div style={css("flex:1;min-width:220px;font-size:12.5px;line-height:1.5;color:#067647;")}>
                        <strong>Good:</strong> {q.whatGoodLooksLike}
                      </div>
                      <div style={css("flex:1;min-width:220px;font-size:12.5px;line-height:1.5;color:#b42318;")}>
                        <strong>Weak:</strong> {q.whatWeakLooksLike}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}

      {/* decision bar — the accountable human action */}
      <div style={css("margin:22px 0 0;")}>
        <Card>
          <div style={css(`font-weight:900;font-size:17px;color:${INK};letter-spacing:-.01em;margin:0 0 4px;`)}>
            Your decision
          </div>
          <div style={css(`font-size:12.5px;color:${MUTED};margin:0 0 12px;`)}>
            The system never decides. Whatever you choose is recorded with your name in
            the audit trail.
          </div>
          {cand.decision && (
            <div style={css(`font-size:13px;font-weight:700;color:${INK};margin:0 0 12px;`)}>
              Recorded: <span style={css(`color:${cand.decision.outcome === "ADVANCE" ? "#067647" : cand.decision.outcome === "PASS" ? "#b42318" : "#b54708"};`)}>{cand.decision.outcome}</span>{" "}
              by {cand.decision.decidedBy} — you can change it below.
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (kept in the audit trail)…"
            rows={2}
            style={css(inputStyle + "resize:vertical;line-height:1.5;margin:0 0 12px;")}
          />
          <div style={css("display:flex;gap:10px;flex-wrap:wrap;")}>
            <button onClick={() => decide("ADVANCE")} disabled={busy} style={css("border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:14px;padding:12px 22px;border-radius:10px;background:#067647;color:#fff;")}>
              ✓ Advance
            </button>
            <button onClick={() => decide("HOLD")} disabled={busy} style={css("border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:14px;padding:12px 22px;border-radius:10px;background:rgba(181,71,8,.1);color:#b54708;")}>
              ⏸ Hold
            </button>
            <button onClick={() => decide("PASS")} disabled={busy} style={css("border:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:14px;padding:12px 22px;border-radius:10px;background:rgba(180,35,24,.08);color:#b42318;")}>
              ✕ Pass
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ---------- audit trail ----------

function AuditView({ token, onBack }: { token: string; onBack: () => void }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    api<{ events: AuditEvent[] }>("/audit", { token }).then((r) => setEvents(r.events)).catch(() => setEvents([]));
  }, [token]);

  return (
    <>
      <button onClick={onBack} style={css(`border:none;background:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:700;color:${BLUE};padding:0;margin:0 0 14px;`)}>
        ← Roles
      </button>
      <h1 style={css(`font-size:24px;font-weight:900;letter-spacing:-.025em;margin:0 0 6px;color:${INK};`)}>
        Audit trail
      </h1>
      <p style={css(`font-size:13px;color:${MUTED};margin:0 0 18px;`)}>
        Append-only. Every score, decision, export and deletion in this workspace —
        who, what, when.
      </p>
      <Card pad={10}>
        {events === null ? (
          <div style={css(`color:${FAINT};font-size:13.5px;padding:12px;`)}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={css(`color:${FAINT};font-size:13.5px;padding:12px;`)}>No events yet.</div>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              style={css(
                `display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 12px;border-top:1px solid ${LINE};font-size:12.5px;`,
              )}
            >
              <span style={css(`font-family:ui-monospace,Menlo,monospace;color:${FAINT};white-space:nowrap;`)}>
                {new Date(e.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={css(`font-weight:800;color:${INK};font-family:ui-monospace,Menlo,monospace;`)}>
                {e.action}
              </span>
              <span style={css(`color:${MUTED};`)}>
                {e.targetType} {e.targetId.slice(0, 14)}…
              </span>
              <span style={css(`color:${FAINT};margin-left:auto;`)}>{e.actor ?? "system"}</span>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
