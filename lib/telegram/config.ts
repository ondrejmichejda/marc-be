/**
 * Telegram Configuration
 * Handles environment variables and validation for the Telegram bot.
 */

export interface TelegramConfig {
  botToken: string;
  webhookSecret?: string;
  appUrl?: string;
  adminApiKey?: string;
  adminIds?: number[];
  autoNotifyDeployment?: boolean;
}

/**
 * Retrieves and validates the Telegram configuration from environment variables.
 */
export function getTelegramConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "Missing TELEGRAM_BOT_TOKEN environment variable. Please set it in .env.local"
    );
  }

  const adminIdsStr = process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID;
  const adminIds = adminIdsStr
    ? adminIdsStr
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id))
    : [];

  return {
    botToken,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    adminApiKey: process.env.ADMIN_API_KEY || process.env.TELEGRAM_WEBHOOK_SECRET,
    adminIds,
    autoNotifyDeployment:
      process.env.AUTO_NOTIFY_DEPLOYMENT === "true" ||
      process.env.NOTIFY_ON_DEPLOY === "true",
  };
}

/**
 * Checks if the Telegram bot token is present in the environment.
 */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}
