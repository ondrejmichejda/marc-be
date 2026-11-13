export type MessageDirection = "incoming" | "outgoing";

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface TelegramStatusResponse {
  bot?: TelegramBotInfo;
  webhook?: TelegramWebhookInfo;
  error?: string;
}

export interface TelegramSubscriber {
  chatId: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  chatType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramMessageLog {
  id: number | string;
  updateId?: number;
  messageId?: number;
  chatId: number;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  chatType: string;
  text?: string;
  direction: MessageDirection;
  messageType: string;
  rawPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface DeploymentNotificationOptions {
  version?: string;
  message?: string;
  releaseNotes?: string;
  deployId?: string;
  force?: boolean;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  deactivated: number;
  errors?: Array<{ chatId: number; error: string }>;
}
