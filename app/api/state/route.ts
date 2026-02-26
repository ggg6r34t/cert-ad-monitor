import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { readState, StateConflictError, writeState } from "@/lib/server/stateStore";
import type { Client, TriageStatus } from "@/types";

interface UpdateStateBody {
  clients?: Client[];
  triageMap?: Record<string, TriageStatus>;
  version?: number;
}

export async function GET() {
  const state = await readState();
  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as UpdateStateBody;
    const next = await writeState({
      clients: Array.isArray(body.clients) ? body.clients : [],
      triageMap:
        body.triageMap && typeof body.triageMap === "object" ? body.triageMap : {},
      expectedVersion: typeof body.version === "number" ? body.version : undefined,
    });
    return NextResponse.json(next);
  } catch (err) {
    if (err instanceof StateConflictError) {
      return NextResponse.json(
        { error: err.message, code: "state_conflict" },
        { status: 409 }
      );
    }
    logger.error("Failed to update state", {
      error: err instanceof Error ? err.message : "Unknown state update error",
    });
    return NextResponse.json({ error: "Unable to persist state" }, { status: 500 });
  }
}
