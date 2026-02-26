import { NextResponse } from "next/server";
import { requireInternalApiKey } from "@/lib/server/internalGuard";
import {
  readAutomationState,
  writeAutomationState,
  type AutomationRuntimeConfig,
} from "@/lib/server/automationStore";

interface RuntimeBody {
  enabled?: boolean;
  intervalMinutes?: number;
  maxPages?: number;
  maxQueries?: number;
}

function sanitizeRuntimeConfig(
  body: RuntimeBody,
  current: AutomationRuntimeConfig
): AutomationRuntimeConfig {
  return {
    enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    intervalMinutes: Math.min(
      360,
      Math.max(1, Number(body.intervalMinutes ?? current.intervalMinutes))
    ),
    maxPages: Math.min(10, Math.max(1, Number(body.maxPages ?? current.maxPages))),
    maxQueries: Math.min(25, Math.max(1, Number(body.maxQueries ?? current.maxQueries))),
  };
}

export async function GET(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;
  const state = await readAutomationState();
  return NextResponse.json({
    runtimeConfig: state.runtimeConfig,
    schedulerAllowedByEnv: process.env.AUTO_SCAN_ENABLED === "true",
  });
}

export async function PUT(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  let body: RuntimeBody;
  try {
    body = (await request.json()) as RuntimeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const state = await readAutomationState();
  const runtimeConfig = sanitizeRuntimeConfig(body, state.runtimeConfig);
  await writeAutomationState({
    ...state,
    runtimeConfig,
  });

  return NextResponse.json({
    ok: true,
    runtimeConfig,
    schedulerAllowedByEnv: process.env.AUTO_SCAN_ENABLED === "true",
  });
}

