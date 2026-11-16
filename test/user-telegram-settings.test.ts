import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  UserTelegramSettingsService,
  TelegramService,
  SubscriberService,
} from "../lib/telegram";
import {
  BASE_MENU_ITEMS,
  DEFAULT_MENU_MAPPINGS,
  getMenuItemsForRole,
  hasMenuAccess,
} from "../lib/auth/roles";
import {
  GET as getUserTelegramSettingsApi,
  POST as postUserTelegramSettingsApi,
  DELETE as deleteUserTelegramSettingsApi,
} from "../app/api/user/telegram-settings/route";
import { POST as testUserTelegramNotificationApi } from "../app/api/user/telegram-settings/test/route";
import { ScheduledPromptService } from "../lib/prompts/service";
import { UserService } from "../lib/auth/userService";

test("UserTelegramSettingsService: Save, Retrieve, Status Config, and Clear", async () => {
  const userId = `test_usr_tg_${Date.now()}`;

  // 1. Initial state: not configured
  const initialConfig = await UserTelegramSettingsService.getUserTelegramConfig(userId);
  assert.equal(initialConfig.isConfigured, false);
  assert.equal(initialConfig.telegramId, undefined);
  assert.equal(initialConfig.notificationsEnabled, true);

  // 2. Save settings with numeric telegram ID, username, notifications
  const saved = await UserTelegramSettingsService.saveSettings(userId, {
    telegramId: "987654321",
    telegramUsername: "@testuser",
    notificationsEnabled: true,
  });

  assert.equal(saved.userId, userId);
  assert.equal(saved.telegramId, "987654321");
  assert.equal(saved.telegramUsername, "testuser");
  assert.equal(saved.notificationsEnabled, true);

  // 3. Verify client status config
  const loadedConfig = await UserTelegramSettingsService.getUserTelegramConfig(userId);
  assert.equal(loadedConfig.isConfigured, true);
  assert.equal(loadedConfig.telegramId, "987654321");
  assert.equal(loadedConfig.telegramUsername, "testuser");
  assert.equal(loadedConfig.notificationsEnabled, true);

  // 4. Verify getTelegramIdForUser
  const tgId = await UserTelegramSettingsService.getTelegramIdForUser(userId);
  assert.equal(tgId, "987654321");

  // 5. Update settings without removing existing telegramId
  const updated = await UserTelegramSettingsService.saveSettings(userId, {
    telegramUsername: "updated_username",
  });
  assert.equal(updated.telegramId, "987654321");
  assert.equal(updated.telegramUsername, "updated_username");

  // 6. Delete / Clear settings
  const deleted = await UserTelegramSettingsService.deleteSettings(userId);
  assert.equal(deleted, true);

  const afterDeleteConfig = await UserTelegramSettingsService.getUserTelegramConfig(userId);
  assert.equal(afterDeleteConfig.isConfigured, false);
  assert.equal(afterDeleteConfig.telegramId, undefined);
});

test("User Telegram Settings REST API: GET, POST, Test Ping, and DELETE", async () => {
  // 1. GET /api/user/telegram-settings
  const getReq = new NextRequest("http://localhost:3000/api/user/telegram-settings");
  const getRes = await getUserTelegramSettingsApi(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(getData.config);

  // 2. POST /api/user/telegram-settings (Save settings)
  const postReq = new NextRequest("http://localhost:3000/api/user/telegram-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: "1122334455",
      telegramUsername: "tg_tester",
      notificationsEnabled: true,
    }),
  });
  const postRes = await postUserTelegramSettingsApi(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.config.isConfigured, true);
  assert.equal(postData.config.telegramId, "1122334455");

  // 3. POST /api/user/telegram-settings/test (Send test ping over Johan bot)
  const testReq = new NextRequest("http://localhost:3000/api/user/telegram-settings/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      telegramId: "1122334455",
      customMessage: "Hello from unit test!",
    }),
  });
  const testRes = await testUserTelegramNotificationApi(testReq);
  assert.equal(testRes.status, 200);
  const testData = await testRes.json();
  assert.equal(testData.success, true);
  assert.equal(String(testData.chatId), "1122334455");

  // 4. DELETE /api/user/telegram-settings
  const delReq = new NextRequest("http://localhost:3000/api/user/telegram-settings", {
    method: "DELETE",
  });
  const delRes = await deleteUserTelegramSettingsApi(delReq);
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.success, true);
  assert.equal(delData.config.isConfigured, false);
});

test("TelegramService: sendResponseToUserById and sendResponseToUser using configured User ID", async () => {
  const userId = `usr_tg_service_test_${Date.now()}`;
  const targetTelegramId = "5544332211";

  // Configure user's personal Telegram ID
  await UserTelegramSettingsService.saveSettings(userId, {
    telegramId: targetTelegramId,
    telegramUsername: "johantest",
    notificationsEnabled: true,
  });

  // 1. Direct sendResponseToUserById using userId lookup
  const sendByIdRes = await TelegramService.sendResponseToUserById({
    userId,
    text: "Test notification via userId lookup",
  });
  assert.equal(sendByIdRes.success, true);
  assert.equal(String(sendByIdRes.chatId), targetTelegramId);

  // 2. Direct sendResponseToUser using telegramId
  const sendByTgIdRes = await TelegramService.sendResponseToUser({
    telegramId: targetTelegramId,
    text: "Test direct telegramId message",
  });
  assert.equal(sendByTgIdRes.success, true);
  assert.equal(String(sendByTgIdRes.chatId), targetTelegramId);

  // 3. sendResponseToUserByName prioritizing userId
  const sendByNameWithUserIdRes = await TelegramService.sendResponseToUserByName({
    userId,
    name: "NonexistentName",
    text: "Message that should route via configured userId",
  });
  assert.equal(sendByNameWithUserIdRes.success, true);
  assert.equal(String(sendByNameWithUserIdRes.chatId), targetTelegramId);

  // 4. sendAiPromptResponse delivering via configured userId
  const aiPromptRes = await TelegramService.sendAiPromptResponse({
    userId,
    userName: "Unknown User",
    completion: "Here is your calculated AI response for Johan bot.",
  });
  assert.equal(aiPromptRes.success, true);
  assert.equal(String(aiPromptRes.chatId), targetTelegramId);
});

test("ScheduledPromptService: executePromptNow delivers using configured user Telegram ID", async () => {
  const userEmail = `scheduled.tg.user.${Date.now()}@example.com`;
  const { user } = await UserService.registerOrLoginGoogleUser({
    id: `g_tg_${Date.now()}`,
    email: userEmail,
    name: "Telegram Scheduled Tester",
    emailVerified: true,
  });

  const configuredTgId = "7788990011";
  await UserTelegramSettingsService.saveSettings(user.id, {
    telegramId: configuredTgId,
    telegramUsername: "scheduled_tester",
    notificationsEnabled: true,
  });

  // Create scheduled prompt for this user
  const createdPrompt = await ScheduledPromptService.createPrompt({
    userId: user.id,
    scheduledTime: "09:00",
    title: "Morning Security Briefing",
    prompt: "Provide a quick summary of safety status.",
    isActive: true,
    userEmail: user.email,
  });

  // Execute prompt now
  const execResult = await ScheduledPromptService.executePromptNow(createdPrompt.id, user.id);
  assert.ok(execResult.completion);
  assert.equal(execResult.telegramDelivery?.sent, true);
});

test("Menu & Role Authorization: telegram_settings menu item configuration", () => {
  // 1. Check BASE_MENU_ITEMS includes telegram_settings
  const tgMenuItem = BASE_MENU_ITEMS.find((m) => m.id === "telegram_settings");
  assert.ok(tgMenuItem, "BASE_MENU_ITEMS must include 'telegram_settings'");
  assert.equal(tgMenuItem?.category, "Administration");
  assert.equal(tgMenuItem?.badge, "Personal");

  // 2. Check role permissions
  assert.equal(hasMenuAccess("admin", "telegram_settings"), true);
  assert.equal(hasMenuAccess("operator", "telegram_settings"), true);
  assert.equal(hasMenuAccess("user", "telegram_settings"), true);

  const adminMenu = getMenuItemsForRole("admin");
  assert.ok(adminMenu.some((m) => m.id === "telegram_settings"));

  const userMenu = getMenuItemsForRole("user");
  assert.ok(userMenu.some((m) => m.id === "telegram_settings"));

  const operatorMenu = getMenuItemsForRole("operator");
  assert.ok(operatorMenu.some((m) => m.id === "telegram_settings"));
});
