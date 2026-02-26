import { NextResponse } from "next/server";
import { runAutomationCycle } from "@/lib/server/automation";
import { requireInternalApiKey } from "@/lib/server/internalGuard";

export async function POST(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  const result = await runAutomationCycle("manual");
  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Automation run skipped (already running or misconfigured)." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, result });
}
