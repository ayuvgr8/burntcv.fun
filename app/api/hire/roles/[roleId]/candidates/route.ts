import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { isErrorResponse, jsonError, requireAccount } from "@/lib/hire/api";
import { HIRE_LIMITS } from "@/lib/hire/config";
import {
  appendAudit,
  consumeScreen,
  getRole,
  listCandidates,
  newId,
  saveCandidate,
} from "@/lib/hire/store";
import type { Candidate, ConsentBasis } from "@/lib/hire/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = { params: Promise<{ roleId: string }> };

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const CONSENT_BASES = new Set<string>(["candidate_application", "recruiter_attestation"]);

// POST /api/hire/roles/:roleId/candidates — add a candidate (paste or PDF).
// Multipart: file=<pdf>, or JSON-ish fields as form values / JSON body with
// { text }. Consent attestation is REQUIRED (DPDP §15.2): the recruiter
// declares the lawful basis before any processing happens.
export async function POST(req: Request, { params }: Params) {
  const ctx = await requireAccount(req);
  if (isErrorResponse(ctx)) return ctx;
  const { roleId } = await params;
  const role = await getRole(ctx.account.id, roleId);
  if (!role) return jsonError(404, "not_found");
  // Scoring is gated on the recruiter having confirmed the hiring bar.
  if (!role.confirmed) return jsonError(409, "requirements_not_confirmed");
  if (role.status !== "OPEN") return jsonError(409, "role_closed");

  const existing = await listCandidates(ctx.account.id, roleId);
  if (existing.length >= HIRE_LIMITS.maxCandidatesPerRole) {
    return jsonError(403, "candidate_limit_reached", {
      limit: HIRE_LIMITS.maxCandidatesPerRole,
    });
  }

  // Intake: multipart (PDF upload) or JSON (pasted text).
  let resumeText = "";
  let displayName = "";
  let consentBasis = "";
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError(400, "bad_request");
    }
    displayName = String(form.get("displayName") || "").slice(0, 80);
    consentBasis = String(form.get("consentBasis") || "");
    const pasted = form.get("text");
    const file = form.get("file");
    if (typeof pasted === "string" && pasted.trim()) {
      resumeText = pasted;
    } else if (file instanceof File) {
      if (file.size > MAX_PDF_BYTES) return jsonError(413, "too_large");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isPdf) return jsonError(415, "not_pdf");
      try {
        const buf = new Uint8Array(await file.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text } = await extractText(pdf, { mergePages: true });
        resumeText = (text || "")
          .replace(/[^\x09\x0A\x0D\x20-\x7E -￿]/g, " ")
          .replace(/\s{3,}/g, "  ")
          .trim();
      } catch (err) {
        console.error("[hire:candidates] pdf parse failed:", err);
        return jsonError(422, "parse_failed");
      }
    }
  } else {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError(400, "bad_request");
    }
    const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    resumeText = typeof d.text === "string" ? d.text : "";
    displayName = typeof d.displayName === "string" ? d.displayName.slice(0, 80) : "";
    consentBasis = typeof d.consentBasis === "string" ? d.consentBasis : "";
  }

  if (!CONSENT_BASES.has(consentBasis)) return jsonError(400, "consent_required");
  resumeText = resumeText.trim().slice(0, HIRE_LIMITS.maxResumeChars);
  if (resumeText.length < 120) {
    // Image-only PDFs / empty pastes land here: refuse rather than guess
    // (PRD §9.3 — unparseable input must route to a human, not to the model).
    return jsonError(422, "no_text", {
      hint: "This résumé has too little machine-readable text. If it is a scanned PDF, paste the text instead.",
    });
  }

  // Metering: one candidate-screen per intake (the §18 unit).
  const meter = await consumeScreen(ctx.account.id, HIRE_LIMITS.screensPerMonth);
  if (!meter.allowed) {
    return jsonError(403, "screen_quota_reached", { limit: HIRE_LIMITS.screensPerMonth });
  }

  const now = Date.now();
  const cand: Candidate = {
    id: newId("cand"),
    accountId: ctx.account.id,
    roleId,
    displayName:
      displayName || `Candidate ${String.fromCharCode(65 + (existing.length % 26))}`,
    resumeText,
    stage: "new",
    stageError: null,
    extraction: null,
    ratings: null,
    fitReport: null,
    decision: null,
    consent: {
      basis: consentBasis as ConsentBasis,
      purpose: "role_screening",
      attestedBy: ctx.session.email,
      attestedAt: now,
    },
    modelVersions: {},
    createdAt: now,
    purgeAfter: now + ctx.account.retentionDays * 24 * 60 * 60 * 1000,
  };
  await saveCandidate(cand);
  await appendAudit(ctx.account.id, {
    actor: ctx.session.email,
    action: "candidate.created",
    targetType: "candidate",
    targetId: cand.id,
    meta: {
      roleId,
      consentBasis,
      chars: resumeText.length,
      purgeAfter: cand.purgeAfter,
    },
  });

  return NextResponse.json({
    candidate: { id: cand.id, displayName: cand.displayName, stage: cand.stage },
  });
}
