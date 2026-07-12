// Strict input validation. Every request body is checked against an explicit
// schema — type, length, format, allowed values — and ANYTHING that doesn't
// match is rejected with a 400 rather than coerced, truncated, or silently
// accepted. Zero-dependency + hand-rolled to match the rest of lib/.
//
// Design notes:
//  • Only whitelisted fields are read (unknown keys are ignored, never passed
//    through) — this prevents mass-assignment. The parsed object contains
//    exactly the declared fields, nothing else.
//  • Distinct, stable error codes (missing / wrong_type / too_short / too_long /
//    bad_format / not_allowed / bad_email) let clients react precisely and keep
//    the codes the existing UI already relies on (e.g. "too_short", "bad_email").

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; field: string; error: string };
export type Result<T> = Ok<T> | Err;

// A field validator maps (fieldName, rawValue) → parsed value or an error.
export type FieldValidator<T> = (name: string, value: unknown) => Result<T>;

type StringOpts = {
  min?: number;
  max?: number;
  trim?: boolean;
  lower?: boolean;
  pattern?: RegExp;
  optional?: boolean;
  default?: string;
};

// Required string by default. Reject non-strings and anything outside [min,max]
// or not matching `pattern`. `trim`/`lower` normalise BEFORE the length checks.
export function vString(opts: StringOpts = {}): FieldValidator<string> {
  return (name, value) => {
    if (value === undefined || value === null) {
      if (opts.optional) return { ok: true, value: opts.default ?? "" };
      return { ok: false, field: name, error: "missing" };
    }
    if (typeof value !== "string") return { ok: false, field: name, error: "wrong_type" };
    let s = value;
    if (opts.trim) s = s.trim();
    if (opts.lower) s = s.toLowerCase();
    if (opts.max !== undefined && s.length > opts.max) return { ok: false, field: name, error: "too_long" };
    if (opts.min !== undefined && s.length < opts.min) return { ok: false, field: name, error: "too_short" };
    if (opts.pattern && !opts.pattern.test(s)) return { ok: false, field: name, error: "bad_format" };
    return { ok: true, value: s };
  };
}

// Simple, deliberately conservative email shape + length cap (RFC max is 254).
// Not a full RFC 5322 parser — just enough to reject obviously-invalid input.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function vEmail(opts: { max?: number; optional?: boolean } = {}): FieldValidator<string> {
  const max = opts.max ?? 254;
  return (name, value) => {
    if (value === undefined || value === null || value === "") {
      if (opts.optional) return { ok: true, value: "" };
      return { ok: false, field: name, error: "missing" };
    }
    if (typeof value !== "string") return { ok: false, field: name, error: "wrong_type" };
    const s = value.trim().toLowerCase();
    if (s.length > max) return { ok: false, field: name, error: "too_long" };
    if (!EMAIL_RE.test(s)) return { ok: false, field: name, error: "bad_email" };
    return { ok: true, value: s };
  };
}

type BoolOpts = { optional?: boolean; default?: boolean };

// Strict boolean — no truthy/"true"/1 coercion. Must be an actual boolean.
export function vBool(opts: BoolOpts = {}): FieldValidator<boolean> {
  return (name, value) => {
    if (value === undefined || value === null) {
      if (opts.optional) return { ok: true, value: opts.default ?? false };
      return { ok: false, field: name, error: "missing" };
    }
    if (typeof value !== "boolean") return { ok: false, field: name, error: "wrong_type" };
    return { ok: true, value };
  };
}

type EnumOpts<V extends string> = { optional?: boolean; default?: V; lower?: boolean };

// Value must be one of `values`. Anything else → "not_allowed".
export function vEnum<V extends string>(
  values: readonly V[],
  opts: EnumOpts<V> = {},
): FieldValidator<V> {
  const set = new Set<string>(values);
  return (name, value) => {
    if (value === undefined || value === null || value === "") {
      if (opts.optional && opts.default !== undefined) return { ok: true, value: opts.default };
      if (opts.optional) return { ok: false, field: name, error: "missing" };
      return { ok: false, field: name, error: "missing" };
    }
    if (typeof value !== "string") return { ok: false, field: name, error: "wrong_type" };
    const s = opts.lower ? value.toLowerCase() : value;
    if (!set.has(s)) return { ok: false, field: name, error: "not_allowed" };
    return { ok: true, value: s as V };
  };
}

export type Schema = Record<string, FieldValidator<unknown>>;
type Infer<S extends Schema> = { [K in keyof S]: S[K] extends FieldValidator<infer U> ? U : never };

// Validate a parsed JSON value against a schema. The input MUST be a plain
// object (not an array, null, string, or number). Returns a typed object
// containing exactly the declared fields.
export function validate<S extends Schema>(schema: S, input: unknown): Result<Infer<S>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, field: "_body", error: "not_object" };
  }
  const rec = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(schema)) {
    const r = schema[key](key, rec[key]);
    if (!r.ok) return r;
    out[key] = r.value;
  }
  return { ok: true, value: out as Infer<S> };
}

export type ParseFailure = { ok: false; status: number; error: string; field?: string };
export type ParseSuccess<T> = { ok: true; value: T };

// Read a JSON request body and validate it in one step. Guards the raw size
// (via Content-Length) before parsing so an oversized payload is rejected with
// 413 instead of being buffered. On any failure returns a status + error code
// the route can hand straight to the client.
export async function parseJsonBody<S extends Schema>(
  req: Request,
  schema: S,
  opts: { maxBytes?: number } = {},
): Promise<ParseSuccess<Infer<S>> | ParseFailure> {
  const maxBytes = opts.maxBytes ?? 64 * 1024; // 64 KB default — JSON bodies are small
  const len = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > maxBytes) {
    return { ok: false, status: 413, error: "too_large" };
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, status: 400, error: "bad_request" };
  }

  const result = validate(schema, raw);
  if (!result.ok) return { ok: false, status: 400, error: result.error, field: result.field };
  return { ok: true, value: result.value };
}
