import test from "node:test";
import assert from "node:assert/strict";
import { UserService } from "../lib/auth/userService";
import type { User } from "../lib/auth/types";
import { TelegramService } from "../lib/telegram/service";
import { UserTelegramSettingsService } from "../lib/telegram/userSettings";
import type { UserTelegramSettings } from "../lib/telegram/userSettings";

function makeUser(id: string, role = "admin"): User {
  const now = new Date().toISOString();
  return {
    id,
    email: `${id}@example.com`,
    name: id,
    role,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
}

test("UserService: returns every normalized system administrator", async () => {
  const databaseEnvironment = ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL"] as const;
  const previousEnvironment = databaseEnvironment.map((name) => process.env[name]);
  databaseEnvironment.forEach((name) => delete process.env[name]);

  const userServiceState = UserService as unknown as {
    localUsers: Map<string, User>;
    initialized: boolean;
  };
  const previousUsers = userServiceState.localUsers;
  const previousInitialized = userServiceState.initialized;
  userServiceState.localUsers = new Map();
  userServiceState.initialized = true;

  for (let index = 0; index < 55; index++) {
    userServiceState.localUsers.set(`admin-${index}`, makeUser(`admin-${index}`));
  }
  userServiceState.localUsers.set("administrator-alias", makeUser("administrator-alias", "Administrator"));
  userServiceState.localUsers.set("superuser-alias", makeUser("superuser-alias", "Superuser"));
  userServiceState.localUsers.set("operator", makeUser("operator", "operator"));
  userServiceState.localUsers.set("member", makeUser("member", "user"));

  try {
    const admins = await UserService.getSystemAdministrators();
    assert.equal(admins.length, 57, "all administrators should be returned, not just the first 50 users");
    assert.ok(admins.every((user) => user.role === "admin"));
    assert.ok(admins.some((user) => user.id === "administrator-alias"));
    assert.ok(admins.some((user) => user.id === "superuser-alias"));
  } finally {
    userServiceState.localUsers = previousUsers;
    userServiceState.initialized = previousInitialized;
    databaseEnvironment.forEach((name, index) => {
      if (previousEnvironment[index] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousEnvironment[index];
      }
    });
  }
});

test("TelegramService: notifies configured administrators safely and continues after delivery failures", async () => {
  const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";

  const admins = [makeUser("enabled-failing"), makeUser("no-telegram-id"), makeUser("disabled"), makeUser("enabled-success")];
  const settingsByUser: Record<string, UserTelegramSettings | null> = {
    "enabled-failing": {
      userId: "enabled-failing",
      telegramId: "100",
      notificationsEnabled: true,
      createdAt: "",
      updatedAt: "",
    },
    "no-telegram-id": null,
    disabled: {
      userId: "disabled",
      telegramId: "300",
      notificationsEnabled: false,
      createdAt: "",
      updatedAt: "",
    },
    "enabled-success": {
      userId: "enabled-success",
      telegramId: "400",
      notificationsEnabled: true,
      createdAt: "",
      updatedAt: "",
    },
  };
  const originalGetAdmins = UserService.getSystemAdministrators;
  const originalGetSettings = UserTelegramSettingsService.getSettings;
  const originalSendMessage = TelegramService.sendMessage;
  const deliveries: Array<{ chatId: number | string; text: string; parseMode?: "Markdown" | "HTML" }> = [];

  UserService.getSystemAdministrators = async () => admins;
  UserTelegramSettingsService.getSettings = async (userId) => settingsByUser[userId] ?? null;
  TelegramService.sendMessage = async (chatId, text, options) => {
    deliveries.push({ chatId, text, parseMode: options?.parseMode });
    if (chatId === "100") throw new Error("Telegram unavailable");
  };

  try {
    await TelegramService.notifySystemAdministratorsOfRegistration({
      name: "A&B <new user>",
      email: "new&user@example.com",
    });

    assert.deepEqual(deliveries.map((delivery) => delivery.chatId), ["100", "400"]);
    assert.ok(deliveries.every((delivery) => delivery.parseMode === "HTML"));
    assert.ok(deliveries.every((delivery) => delivery.text.includes("A&amp;B &lt;new user&gt;")));
    assert.ok(deliveries.every((delivery) => delivery.text.includes("new&amp;user@example.com")));
  } finally {
    UserService.getSystemAdministrators = originalGetAdmins;
    UserTelegramSettingsService.getSettings = originalGetSettings;
    TelegramService.sendMessage = originalSendMessage;
    if (previousBotToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = previousBotToken;
    }
  }
});

test("TelegramService: skips registration messages when the bot is not configured", async () => {
  const previousBotToken = process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_BOT_TOKEN;
  const originalSendMessage = TelegramService.sendMessage;
  let sendAttempts = 0;
  TelegramService.sendMessage = async () => {
    sendAttempts++;
  };

  try {
    await TelegramService.notifySystemAdministratorsOfRegistration(makeUser("new-user"));
    assert.equal(sendAttempts, 0);
  } finally {
    TelegramService.sendMessage = originalSendMessage;
    if (previousBotToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = previousBotToken;
  }
});

test("UserService: notifies only for a newly registered Google user", async () => {
  const originalNotify = (TelegramService as unknown as {
    notifySystemAdministratorsOfRegistration: (user: User) => Promise<void>;
  }).notifySystemAdministratorsOfRegistration;
  const notifiedUserIds: string[] = [];
  let userWasPersistedBeforeNotification = false;
  (TelegramService as unknown as {
    notifySystemAdministratorsOfRegistration: (user: User) => Promise<void>;
  }).notifySystemAdministratorsOfRegistration = async (user) => {
    notifiedUserIds.push(user.id);
    userWasPersistedBeforeNotification = Boolean(await UserService.getUserById(user.id));
  };

  const profile = {
    id: `google-registration-notification-${Date.now()}`,
    email: `registration-notification-${Date.now()}@gmail.com`,
    name: "Registration Test",
    emailVerified: true,
  };
  let createdUserId: string | undefined;

  try {
    const registration = await UserService.registerOrLoginGoogleUser(profile);
    createdUserId = registration.user.id;
    assert.equal(registration.isNewUser, true);

    const login = await UserService.registerOrLoginGoogleUser(profile);
    assert.equal(login.isNewUser, false);
    assert.deepEqual(notifiedUserIds, [registration.user.id]);
    assert.equal(userWasPersistedBeforeNotification, true);
  } finally {
    (TelegramService as unknown as {
      notifySystemAdministratorsOfRegistration: (user: User) => Promise<void>;
    }).notifySystemAdministratorsOfRegistration = originalNotify;
    if (createdUserId) await UserService.deleteUser(createdUserId);
  }
});