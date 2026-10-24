/**
 * Telegram Configuration
 * Handles environment variables and validation for the Telegram bot.
 */

export interface TelegramConfig {
  botToken: string;
  webhookSecret?: string;
  appUrl?: string;
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

  return {
    botToken,
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
    appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Checks if the Telegram bot token is present in the environment.
 */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}
