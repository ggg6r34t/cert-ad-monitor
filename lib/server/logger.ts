type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function safeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const redacted: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase();
    if (lower.includes("token") || lower.includes("secret") || lower.includes("password")) {
      redacted[key] = "[REDACTED]";
      continue;
    }
    redacted[key] = value;
  }
  return redacted;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    ts: nowIso(),
    level,
    message,
    context: safeContext(context),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

