import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { appendAudit, getRole, newId, saveRole } from "@/lib/hire/store";
import type { ReqCategory, Requirement } from "@/lib/hire/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ roleId: string }> };

const CATEGORIES = new Set<string>(["MUST_HAVE", "PREFERRED", "IMPLICIT"]);

// PUT /api/hire/roles/:roleId/requirements — THE human gate (PRD-Hire §8.3).
// The recruiter reviews the drafted requirements, adjusts weights, promotes/
// demotes categories, adds/removes lines, and — only here — confirms
// knockouts. After this call the role is scoreable. Provenance: any edited or
// added requirement flips to source=RECRUITER; untouched AI drafts stay AI.
export async function PUT(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { roleId } = await params;
  const role = await getRole(ctx.account.id, roleId);
  if (!role) return jsonError(404, "not_found");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "bad_request");
  }
  const list = (raw as { requirements?: unknown })?.requirements;
  if (!Array.isArray(list) || list.length === 0 || list.length > 20) {
    return jsonError(400, "bad_requirements");
  }

  const existing = new Map(role.requirements.map((r) => [r.id, r]));
  const next: Requirement[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (typeof item !== "object" || item === null) return jsonError(400, "bad_requirements");
    const d = item as Record<string, unknown>;

    const label = typeof d.label === "string" ? d.label.trim().slice(0, 120) : "";
    if (!label) return jsonError(400, "bad_requirements", { field: `requirements[${i}].label` });
    const category = (
      typeof d.category === "string" && CATEGORIES.has(d.category) ? d.category : "PREFERRED"
    ) as ReqCategory;
    const weight = Math.min(10, Math.max(1, Math.round(Number(d.weight) || 5)));
    const isKnockout = d.isKnockout === true;
    const detail = typeof d.detail === "string" ? d.detail.slice(0, 600) : "";

    const id = typeof d.id === "string" && existing.has(d.id) ? d.id : newId("req");
    if (seen.has(id)) continue;
    seen.add(id);

    const prev = existing.get(id);
    const edited =
      !prev ||
      prev.label !== label ||
      prev.category !== category ||
      prev.weight !== weight ||
      prev.isKnockout !== isKnockout ||
      prev.detail !== detail;

    next.push({
      id,
      label,
      category,
      weight,
      isKnockout, // recruiter-set — this PUT is the explicit confirmation
      knockoutSuggested: prev?.knockoutSuggested ?? false,
      detail,
      rationale: prev?.rationale ?? "",
      source: edited ? "RECRUITER" : (prev?.source ?? "RECRUITER"),
      orderIndex: i,
    });
  }

  role.requirements = next;
  role.confirmed = true;
  await saveRole(role);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "role.requirements_confirmed",
    targetType: "role",
    targetId: role.id,
    meta: {
      requirements: next.length,
      knockouts: next.filter((r) => r.isKnockout).length,
      recruiterEdited: next.filter((r) => r.source === "RECRUITER").length,
    },
  });

  return NextResponse.json({ role });
}
