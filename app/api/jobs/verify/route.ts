import { NextResponse } from "next/server";
import { checkAndIncrement, ipFrom, limitUser } from "@/lib/ratelimit";
import { verifyToken } from "@/lib/entitlements";
import { verifyJob } from "@/lib/firecrawl";
import { canVerify, isJunkUrl } from "@/lib/jobs";
import { parseJsonBody, vString } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 20;

const JOBS_ENABLED = process.env.JOBS_ENABLED !== "false";

const verifySchema = {
  url: vString({ trim: true, min: 8, max: 1000 }),
  passToken: vString({ optional: true, max: 4096 }),
};

function unverifiable(): NextResponse {
  return NextResponse.json({ status: "unverifiable", checkedAt: new Date().toISOString() });
}

// Lazy verification — the client calls this when a user expands a job card, not
// for all five up front. Most users open one or two, so this cuts Firecrawl
// consumption roughly 4× versus verifying eagerly. On the free tier that is the
// difference between ~200 and ~2,000 reports a month (docs/jobs-feed-spec.md §3).
export async function POST(req: Request) {
  if (!JOBS_ENABLED) return unverifiable();

  const parsed = await parseJsonBody(req, verifySchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: parsed.status });
  }
  const { url, passToken } = parsed.value;

  // Only ever fetch an http(s) URL we'd have shown ourselves. This endpoint
  // takes a URL from the client and fetches it server-side, so without this it
  // would be an open proxy — internal addresses, file schemes and anything else
  // a caller felt like pointing us at.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return unverifiable();
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") return unverifiable();
  if (isJunkUrl(url) || !canVerify(url)) return unverifiable();

  const pass = verifyToken(passToken);
  if (pass) {
    const burst = await limitUser(pass.code, "jobverify");
    if (!burst.allowed) return unverifiable();
  } else {
    const { allowed } = await checkAndIncrement(ipFrom(req));
    if (!allowed) return unverifiable();
  }

  try {
    return NextResponse.json(await verifyJob(url));
  } catch (err) {
    console.error("[jobs/verify] failed:", err instanceof Error ? err.message : err);
    return unverifiable();
  }
}
