import { NextResponse } from "next/server";
import { requireInternalApiKey } from "@/lib/server/internalGuard";
import { readState, replaceState } from "@/lib/server/stateStore";
import type { Client, TriageStatus } from "@/types";

interface RestoreBody {
  state?: {
    clients?: Client[];
    triageMap?: Record<string, TriageStatus>;
    version?: number;
  };
}

export async function GET(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  const state = await readState();
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    state,
  });
}

export async function POST(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  let body: RestoreBody;
  try {
    body = (await request.json()) as RestoreBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.state || !Array.isArray(body.state.clients) || typeof body.state.triageMap !== "object") {
    return NextResponse.json(
      { error: "Body must include state.clients[] and state.triageMap{}" },
      { status: 400 }
    );
  }

  const restored = await replaceState({
    clients: body.state.clients,
    triageMap: body.state.triageMap,
    version: body.state.version,
  });

  return NextResponse.json({
    ok: true,
    restoredAt: new Date().toISOString(),
    state: restored,
  });
}

