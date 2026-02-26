export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutomationScheduler } = await import("@/lib/server/automation");
    startAutomationScheduler();
  }
}

