/**
 * User state management for interactive multi-step Telegram bot flows.
 */

export interface UserFlowState {
  state: "idle" | "awaiting_task_input";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// In-memory store for active conversational states (TTL: 15 minutes)
const STATE_TTL_MS = 15 * 60 * 1000;
const userStates = new Map<number, UserFlowState>();

/**
 * Gets the current flow state for a given chat or user ID.
 */
export function getUserState(chatId: number): UserFlowState {
  const current = userStates.get(chatId);
  if (!current) {
    return { state: "idle", timestamp: Date.now() };
  }

  // Check TTL expiration
  if (Date.now() - current.timestamp > STATE_TTL_MS) {
    userStates.delete(chatId);
    return { state: "idle", timestamp: Date.now() };
  }

  return current;
}

/**
 * Sets the flow state for a given chat or user ID.
 */
export function setUserState(
  chatId: number,
  flowState: Omit<UserFlowState, "timestamp"> & { timestamp?: number }
): void {
  userStates.set(chatId, {
    ...flowState,
    timestamp: flowState.timestamp || Date.now(),
  });
}

/**
 * Clears the active flow state for a given chat or user ID.
 */
export function clearUserState(chatId: number): void {
  userStates.delete(chatId);
}
