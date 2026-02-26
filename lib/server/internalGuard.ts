import { NextResponse } from "next/server";

export function requireInternalApiKey(request: Request): NextResponse | null {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "INTERNAL_API_KEY is not configured." },
      { status: 503 }
    );
  }
  const provided = request.headers.get("x-internal-api-key");
  if (provided !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function maybeRequireInternalApiKey(request: Request): NextResponse | null {
  if (!process.env.INTERNAL_API_KEY) return null;
  return requireInternalApiKey(request);
}
