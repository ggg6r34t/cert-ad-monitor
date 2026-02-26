import { NextResponse } from "next/server";
import { requireInternalApiKey } from "@/lib/server/internalGuard";
import {
  clearStoredMetaToken,
  getMetaTokenStatus,
  setStoredMetaToken,
} from "@/lib/server/metaTokenStore";

interface SetTokenBody {
  token?: string;
}

export async function GET(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;
  const status = await getMetaTokenStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  let body: SetTokenBody;
  try {
    body = (await request.json()) as SetTokenBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    await setStoredMetaToken(token);
    const status = await getMetaTokenStatus();
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to store token" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;
  await clearStoredMetaToken();
  const status = await getMetaTokenStatus();
  return NextResponse.json({ ok: true, status });
}

