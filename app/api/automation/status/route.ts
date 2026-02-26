import { NextResponse } from "next/server";
import { getAutomationRuntimeStatus } from "@/lib/server/automation";
import { requireInternalApiKey } from "@/lib/server/internalGuard";
import { readAutomationState } from "@/lib/server/automationStore";

export async function GET(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;
  const store = await readAutomationState();
  const runtime = getAutomationRuntimeStatus(store);
  return NextResponse.json({
    ...runtime,
    recentRuns: store.runs.slice(0, 20),
    lock: store.lock ?? null,
    alertPolicy: store.alertPolicy,
    runtimeConfig: store.runtimeConfig,
  });
}
