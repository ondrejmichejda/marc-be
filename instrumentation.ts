export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getTelegramConfig, isTelegramConfigured } = await import(
      "@/lib/telegram/config"
    );
    const { TelegramService } = await import("@/lib/telegram/service");

    if (!isTelegramConfigured()) {
      console.warn(
        "⚠️ [Telegram Setup] TELEGRAM_BOT_TOKEN is not configured. Webhook setup skipped."
      );
      return;
    }

    try {
      const config = getTelegramConfig();

      if (!config.appUrl) {
        console.warn(
          "⚠️ [Telegram Setup] APP_URL is not set. Webhook registration skipped. Please set APP_URL in .env."
        );
        return;
      }

      // Format full webhook endpoint URL
      const baseUrl = config.appUrl.replace(/\/+$/, "");
      const webhookUrl = `${baseUrl}/api/telegram/webhook`;

      console.log(`📡 [Telegram Setup] Registering webhook at: ${webhookUrl}`);
      const success = await TelegramService.setWebhook(
        webhookUrl,
        config.webhookSecret
      );

      if (success) {
        console.log(
          "✅ [Telegram Setup] Telegram webhook registered successfully."
        );
      } else {
        console.error(
          "❌ [Telegram Setup] Telegram webhook registration returned false."
        );
      }
    } catch (error) {
      console.error(
        "❌ [Telegram Setup] Failed to register Telegram webhook on startup:",
        (error as Error).message
      );
    }
  }
}
