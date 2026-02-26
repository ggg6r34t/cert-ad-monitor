import { NextResponse } from "next/server";
import { requireInternalApiKey } from "@/lib/server/internalGuard";
import { readAutomationState, writeAutomationState } from "@/lib/server/automationStore";

interface PolicyBody {
  channels?: {
    slack?: boolean;
    telegram?: boolean;
  };
  minNewFlaggedForAlert?: number;
  quietHoursUtc?: {
    enabled?: boolean;
    startHour?: number;
    endHour?: number;
  };
}

export async function GET(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;
  const state = await readAutomationState();
  return NextResponse.json({
    alertPolicy: state.alertPolicy,
  });
}

export async function PUT(request: Request) {
  const guard = requireInternalApiKey(request);
  if (guard) return guard;

  let body: PolicyBody;
  try {
    body = (await request.json()) as PolicyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const state = await readAutomationState();
  const current = state.alertPolicy;
  const next = {
    channels: {
      slack: body.channels?.slack ?? current?.channels.slack ?? true,
      telegram: body.channels?.telegram ?? current?.channels.telegram ?? true,
    },
    minNewFlaggedForAlert: Math.max(
      1,
      Number(body.minNewFlaggedForAlert ?? current?.minNewFlaggedForAlert ?? 1)
    ),
    quietHoursUtc: {
      enabled: body.quietHoursUtc?.enabled ?? current?.quietHoursUtc.enabled ?? false,
      startHour: Math.min(
        23,
        Math.max(0, Number(body.quietHoursUtc?.startHour ?? current?.quietHoursUtc.startHour ?? 0))
      ),
      endHour: Math.min(
        23,
        Math.max(0, Number(body.quietHoursUtc?.endHour ?? current?.quietHoursUtc.endHour ?? 6))
      ),
    },
  };

  await writeAutomationState({
    ...state,
    alertPolicy: next,
  });

  return NextResponse.json({
    ok: true,
    alertPolicy: next,
  });
}

