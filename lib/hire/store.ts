// BurntCV Hire — tenant-scoped data plane.
//
// THE FIREWALL (PRD-Hire §16): Hire is the stateful sibling of a stateless
// roast product. Everything Hire stores lives under the `hire:` keyspace and
// every key embeds the owning accountId — the storage API takes accountId on
// every call, so cross-tenant reads are impossible by construction (the
// Redis-era analog of row-level security). No roast code path imports this
// module; no Hire code path touches roast data. Résumés from the roast side
// never flow here, ever.
//
// Durability: Upstash Redis when configured (prod), else a best-effort
// in-memory map (dev). Retention (DPDP §15.4) is enforced two ways: candidate
// keys carry a TTL equal to their purgeAfter deadline, and every read lazily
// filters records past the deadline.
//
// Upgrade path: this module is the only place that knows where Hire data
// lives. Swapping to Postgres/Supabase+RLS later means reimplementing these
// functions, nothing else.

import { randomBytes } from "node:crypto";
import { getRedis } from "../redis";
import { RETENTION_DAYS_DEFAULT } from "./config";
import type {
  AuditEvent,
  Candidate,
  HireAccount,
  Role,
} from "./types";

const redis = getRedis();

// Account + role records shouldn't outlive usefulness forever, but they hold
// no candidate PII — keep them a year past last write.
const ACCOUNT_TTL_S = 366 * 24 * 60 * 60;
const AUDIT_MAX_EVENTS = 500;

// ---- KV primitives (Upstash, else shared in-memory fallback) ----
const g = globalThis as unknown as {
  __burntHire?: Map<string, { v: string; exp: number }>;
};
const mem = g.__burntHire ?? (g.__burntHire = new Map());

async function kvSet(key: string, val: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, val, { ex: ttlSeconds });
    return;
  }
  mem.set(key, { v: val, exp: Date.now() + ttlSeconds * 1000 });
}

async function kvGet(key: string): Promise<string | null> {
  if (redis) return (await redis.get<string>(key)) ?? null;
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.v;
}

async function kvDel(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  mem.delete(key);
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

// ---- keys (every data key embeds the owning account) ----
const kAcct = (acctId: string) => `hire:acct:${acctId}`;
const kEmail = (email: string) => `hire:acctemail:${email.toLowerCase().trim()}`;
const kRole = (acctId: string, roleId: string) => `hire:role:${acctId}:${roleId}`;
const kRoleIdx = (acctId: string) => `hire:roleidx:${acctId}`;
const kCand = (acctId: string, candId: string) => `hire:cand:${acctId}:${candId}`;
const kCandIdx = (acctId: string, roleId: string) => `hire:candidx:${acctId}:${roleId}`;
const kAudit = (acctId: string) => `hire:audit:${acctId}`;
const kScreens = (acctId: string) => `hire:screens:${acctId}:${new Date().toISOString().slice(0, 7)}`;

// ---- accounts ----

export async function getAccount(accountId: string): Promise<HireAccount | null> {
  const raw = await kvGet(kAcct(accountId));
  return raw ? (JSON.parse(raw) as HireAccount) : null;
}

export async function getAccountIdByEmail(email: string): Promise<string | null> {
  return kvGet(kEmail(email));
}

export async function saveAccount(acct: HireAccount): Promise<void> {
  await kvSet(kAcct(acct.id), JSON.stringify(acct), ACCOUNT_TTL_S);
  await kvSet(kEmail(acct.ownerEmail), acct.id, ACCOUNT_TTL_S);
}

export async function ensureAccount(email: string, orgName: string): Promise<HireAccount> {
  const existingId = await getAccountIdByEmail(email);
  if (existingId) {
    const acct = await getAccount(existingId);
    if (acct) return acct;
  }
  const acct: HireAccount = {
    id: newId("acct"),
    orgName: orgName || "My team",
    ownerEmail: email.toLowerCase().trim(),
    dpdpAccepted: true, // accepting the Hire terms is part of sign-in copy
    retentionDays: RETENTION_DAYS_DEFAULT,
    createdAt: Date.now(),
  };
  await saveAccount(acct);
  return acct;
}

// ---- index helpers (JSON string[] under one key) ----

async function readIdx(key: string): Promise<string[]> {
  const raw = await kvGet(key);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function writeIdx(key: string, ids: string[]): Promise<void> {
  await kvSet(key, JSON.stringify(ids), ACCOUNT_TTL_S);
}

// ---- roles ----

export async function saveRole(role: Role): Promise<void> {
  await kvSet(kRole(role.accountId, role.id), JSON.stringify(role), ACCOUNT_TTL_S);
  const idx = await readIdx(kRoleIdx(role.accountId));
  if (!idx.includes(role.id)) {
    idx.unshift(role.id);
    await writeIdx(kRoleIdx(role.accountId), idx);
  }
}

export async function getRole(accountId: string, roleId: string): Promise<Role | null> {
  const raw = await kvGet(kRole(accountId, roleId));
  return raw ? (JSON.parse(raw) as Role) : null;
}

export async function listRoles(accountId: string): Promise<Role[]> {
  const idx = await readIdx(kRoleIdx(accountId));
  const roles: Role[] = [];
  for (const id of idx) {
    const r = await getRole(accountId, id);
    if (r) roles.push(r);
  }
  return roles;
}

export async function deleteRole(accountId: string, roleId: string): Promise<void> {
  // Hard-delete the role AND all its candidates (cascade, like the Prisma schema would).
  const candIds = await readIdx(kCandIdx(accountId, roleId));
  for (const cid of candIds) await kvDel(kCand(accountId, cid));
  await kvDel(kCandIdx(accountId, roleId));
  await kvDel(kRole(accountId, roleId));
  const idx = await readIdx(kRoleIdx(accountId));
  await writeIdx(kRoleIdx(accountId), idx.filter((id) => id !== roleId));
}

// ---- candidates ----

export async function saveCandidate(cand: Candidate): Promise<void> {
  // TTL = time to the retention deadline → storage-level auto-purge (DPDP).
  const ttl = Math.max(60, Math.ceil((cand.purgeAfter - Date.now()) / 1000));
  await kvSet(kCand(cand.accountId, cand.id), JSON.stringify(cand), ttl);
  const key = kCandIdx(cand.accountId, cand.roleId);
  const idx = await readIdx(key);
  if (!idx.includes(cand.id)) {
    idx.push(cand.id);
    await writeIdx(key, idx);
  }
}

export async function getCandidate(
  accountId: string,
  candId: string,
): Promise<Candidate | null> {
  const raw = await kvGet(kCand(accountId, candId));
  if (!raw) return null;
  const cand = JSON.parse(raw) as Candidate;
  if (cand.purgeAfter && cand.purgeAfter < Date.now()) {
    // Past the retention deadline — treat as purged even if the TTL hasn't fired.
    await kvDel(kCand(accountId, candId));
    return null;
  }
  return cand;
}

export async function listCandidates(
  accountId: string,
  roleId: string,
): Promise<Candidate[]> {
  const idx = await readIdx(kCandIdx(accountId, roleId));
  const out: Candidate[] = [];
  for (const id of idx) {
    const c = await getCandidate(accountId, id);
    if (c) out.push(c);
  }
  return out;
}

export async function deleteCandidate(accountId: string, cand: Candidate): Promise<void> {
  await kvDel(kCand(accountId, cand.id));
  const key = kCandIdx(accountId, cand.roleId);
  const idx = await readIdx(key);
  await writeIdx(key, idx.filter((id) => id !== cand.id));
}

// ---- full-account erasure (DPDP right, PRD §15.2) ----

export async function deleteAllAccountData(accountId: string): Promise<number> {
  const acct = await getAccount(accountId);
  const roleIds = await readIdx(kRoleIdx(accountId));
  let deleted = 0;
  for (const rid of roleIds) {
    const candIds = await readIdx(kCandIdx(accountId, rid));
    for (const cid of candIds) {
      await kvDel(kCand(accountId, cid));
      deleted++;
    }
    await kvDel(kCandIdx(accountId, rid));
    await kvDel(kRole(accountId, rid));
  }
  await kvDel(kRoleIdx(accountId));
  await kvDel(kAudit(accountId));
  await kvDel(kScreens(accountId));
  if (acct) await kvDel(kEmail(acct.ownerEmail));
  await kvDel(kAcct(accountId));
  return deleted;
}

// ---- audit trail (append-only list per account, newest first) ----

export async function appendAudit(
  accountId: string,
  ev: Omit<AuditEvent, "id" | "at">,
): Promise<void> {
  const key = kAudit(accountId);
  const raw = await kvGet(key);
  let events: AuditEvent[] = [];
  if (raw) {
    try {
      events = JSON.parse(raw) as AuditEvent[];
    } catch {
      events = [];
    }
  }
  events.unshift({ ...ev, id: newId("evt"), at: Date.now() });
  if (events.length > AUDIT_MAX_EVENTS) events = events.slice(0, AUDIT_MAX_EVENTS);
  await kvSet(key, JSON.stringify(events), ACCOUNT_TTL_S);
}

export async function listAudit(accountId: string, limit = 100): Promise<AuditEvent[]> {
  const raw = await kvGet(kAudit(accountId));
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as AuditEvent[]).slice(0, limit);
  } catch {
    return [];
  }
}

// ---- screen metering (per-account, monthly) ----
// Atomically consume one candidate-screen; reverts on overshoot so a burst
// can't blow past the cap (same pattern as Pass roast quota).

export async function consumeScreen(
  accountId: string,
  cap: number,
): Promise<{ allowed: boolean; used: number }> {
  const key = kScreens(accountId);
  if (redis) {
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 35 * 24 * 60 * 60);
    if (used > cap) {
      await redis.decr(key);
      return { allowed: false, used: used - 1 };
    }
    return { allowed: true, used };
  }
  const cur = Number((await kvGet(key)) || 0) + 1;
  if (cur > cap) return { allowed: false, used: cur - 1 };
  mem.set(key, { v: String(cur), exp: Date.now() + 35 * 24 * 60 * 60 * 1000 });
  return { allowed: true, used: cur };
}

export async function screensUsed(accountId: string): Promise<number> {
  const raw = await kvGet(kScreens(accountId));
  return raw ? parseInt(raw, 10) || 0 : 0;
}
