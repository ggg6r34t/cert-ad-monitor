import { logger } from "@/lib/server/logger";

export interface NotificationResult {
  channel: "slack" | "telegram";
  success: boolean;
  error?: string;
  skipped?: boolean;
}

export interface AlertRoutingOptions {
  channels?: {
    slack: boolean;
    telegram: boolean;
  };
}

export function configuredChannels(): Array<"slack" | "telegram"> {
  const channels: Array<"slack" | "telegram"> = [];
  if (process.env.SLACK_WEBHOOK_URL) channels.push("slack");
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) channels.push("telegram");
  return channels;
}

function buildText(title: string, lines: string[]): string {
  return [title, ...lines].join("\n");
}

async function sendSlack(text: string): Promise<NotificationResult> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { channel: "slack", success: false, error: "SLACK_WEBHOOK_URL not configured" };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      const body = await response.text();
      return { channel: "slack", success: false, error: `Slack HTTP ${response.status}: ${body}` };
    }
    return { channel: "slack", success: true };
  } catch (err) {
    return {
      channel: "slack",
      success: false,
      error: err instanceof Error ? err.message : "Unknown Slack error",
    };
  }
}

async function sendTelegram(text: string): Promise<NotificationResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return {
      channel: "telegram",
      success: false,
      error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured",
    };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      return {
        channel: "telegram",
        success: false,
        error: `Telegram HTTP ${response.status}: ${body}`,
      };
    }
    return { channel: "telegram", success: true };
  } catch (err) {
    return {
      channel: "telegram",
      success: false,
      error: err instanceof Error ? err.message : "Unknown Telegram error",
    };
  }
}

export async function sendAlert(
  title: string,
  lines: string[],
  options?: AlertRoutingOptions
): Promise<NotificationResult[]> {
  const text = buildText(title, lines);
  const shouldSlack = options?.channels?.slack ?? true;
  const shouldTelegram = options?.channels?.telegram ?? true;
  const results: NotificationResult[] = await Promise.all([
    shouldSlack
      ? sendSlack(text)
      : Promise.resolve<NotificationResult>({ channel: "slack", success: true, skipped: true }),
    shouldTelegram
      ? sendTelegram(text)
      : Promise.resolve<NotificationResult>({ channel: "telegram", success: true, skipped: true }),
  ]);
  for (const result of results) {
    if (!result.success && !result.skipped) {
      logger.warn("Alert channel failed", { channel: result.channel, error: result.error });
    }
  }
  return results;
}
