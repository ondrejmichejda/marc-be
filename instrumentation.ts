export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDatabase, isDbConfigured } = await import("@/lib/db");
    if (isDbConfigured()) {
      try {
        await initDatabase();
      } catch (dbError) {
        console.error(
          "❌ [Database Setup] Failed to initialize database on startup:",
          (dbError as Error).message
        );
      }
    }

    const { getTelegramConfig, isTelegramConfigured } = await import(
      "@/lib/telegram/config"
    );
    const { TelegramService } = await import("@/lib/telegram/service");
    const { SubscriberService } = await import("@/lib/telegram/subscribers");

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
      } else {
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
      }

      // Check if automatic deployment broadcast is enabled
      if (config.autoNotifyDeployment) {
        const deployId =
          process.env.DEPLOYMENT_ID ||
          process.env.VERCEL_GIT_COMMIT_SHA ||
          process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
          process.env.npm_package_version;

        if (deployId) {
          const alreadyNotified = await SubscriberService.hasNotifiedDeployment(
            deployId
          );
          if (!alreadyNotified) {
            console.log(
              `📢 [Telegram Deployment] Broadcasting deployment notification for ${deployId}...`
            );
            const broadcast = await TelegramService.broadcastDeploymentNotification({
              deployId,
              version: process.env.npm_package_version,
            });
            console.log(
              `✅ [Telegram Deployment] Broadcast complete: sent to ${broadcast.sent} subscribers.`
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "❌ [Telegram Setup] Failed to register Telegram webhook on startup:",
        (error as Error).message
      );
    }
  }
}
