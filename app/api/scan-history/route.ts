import { NextResponse } from "next/server";
import {
  appendScanSnapshot,
  getClientScanHistory,
  type ClientScanSnapshot,
} from "@/lib/server/scanHistoryStore";
import { maybeRequireInternalApiKey } from "@/lib/server/internalGuard";

interface AppendBody extends Omit<ClientScanSnapshot, "scannedAt"> {
  scannedAt?: string;
}

export async function GET(request: Request) {
  const guard = maybeRequireInternalApiKey(request);
  if (guard) return guard;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const limit = Number(url.searchParams.get("limit") ?? 20);
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }
  const scans = await getClientScanHistory(clientId, limit);
  return NextResponse.json({ scans });
}

export async function POST(request: Request) {
  const guard = maybeRequireInternalApiKey(request);
  if (guard) return guard;

  let body: AppendBody;
  try {
    body = (await request.json()) as AppendBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.clientId || !body.clientName || !Array.isArray(body.activeIds) || !Array.isArray(body.flaggedActiveIds)) {
    return NextResponse.json(
      { error: "Missing required fields: clientId, clientName, activeIds, flaggedActiveIds" },
      { status: 400 }
    );
  }
  const source: "manual" | "automation" = body.source === "automation" ? "automation" : "manual";

  await appendScanSnapshot({
    clientId: body.clientId,
    clientName: body.clientName,
    source,
    scannedAt: body.scannedAt ?? new Date().toISOString(),
    activeIds: body.activeIds,
    flaggedActiveIds: body.flaggedActiveIds,
  });
  return NextResponse.json({ ok: true });
}
