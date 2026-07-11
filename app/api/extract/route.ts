import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { ipFrom, limitPublic } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Extract text from an uploaded PDF, server-side (PRD §9: keep extraction on
// the server, process ephemerally, never persist the file).
export async function POST(req: Request) {
  // Moderate per-IP limit — PDF parsing is CPU-heavy, so cap the burst rate.
  const gate = await limitPublic(ipFrom(req), "extract");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: gate.retryAfter },
      { status: 429, headers: { "retry-after": String(gate.retryAfter) } },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    return NextResponse.json({ error: "not_pdf" }, { status: 415 });
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text: raw } = await extractText(pdf, { mergePages: true });
    const text = (raw || "")
      .replace(/[^\x09\x0A\x0D\x20-\x7E -￿]/g, " ")
      .replace(/\s{3,}/g, "  ")
      .trim()
      .slice(0, 6000);

    if (text.length < 30) {
      return NextResponse.json({ error: "no_text" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[extract] parse failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 422 });
  }
}
