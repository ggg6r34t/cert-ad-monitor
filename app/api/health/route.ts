import { NextResponse } from "next/server";
import { stateStoreHealth } from "@/lib/server/stateStore";
import { getAutomationRuntimeStatus } from "@/lib/server/automation";
import { getMetaTokenStatus } from "@/lib/server/metaTokenStore";
import { getMetaCircuitBreakerStatus } from "@/lib/server/metaAds";
import { readAutomationState } from "@/lib/server/automationStore";

export async function GET() {
  const store = await stateStoreHealth();
  const tokenStatus = await getMetaTokenStatus();
  const tokenConfigured = tokenStatus.configured;
  const slackConfigured = Boolean(process.env.SLACK_WEBHOOK_URL);
  const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const automationState = await readAutomationState();
  const automation = getAutomationRuntimeStatus(automationState);
  const metaApi = getMetaCircuitBreakerStatus();
  const internalApiKeyConfigured = Boolean(process.env.INTERNAL_API_KEY);
  const ok = store.ok;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      tokenConfigured,
      tokenSource: tokenStatus.source,
      tokenStorageReady: tokenStatus.storageReady,
      tokenStatusError: tokenStatus.error,
      internalApiKeyConfigured,
      notifier: {
        slackConfigured,
        telegramConfigured,
      },
      automation,
      metaApi,
      datastore: store,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
