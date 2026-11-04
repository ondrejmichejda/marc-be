import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { signSessionToken, verifySessionToken } from "../lib/auth/crypto";
import { UserService } from "../lib/auth/userService";
import {
  getGoogleAuthorizationUrl,
  getMenuItemsForRole,
  hasMenuAccess,
  hasRoleLevel,
  normalizeRole,
  getRoleBadgeInfo,
  RolesService,
  BASE_MENU_ITEMS,
} from "../lib/auth";
import { GET as getMe } from "../app/api/auth/me/route";
import { POST as logoutUser } from "../app/api/auth/logout/route";
import { GET as listUsersApi, PATCH as updateUserRoleApi } from "../app/api/auth/users/route";
import {
  GET as getRolesApi,
  POST as createRoleApi,
  PUT as updateMappingsApi,
  DELETE as deleteRoleApi,
} from "../app/api/auth/roles/route";
import { GET as getGoogleAuthApi } from "../app/api/auth/google/route";
import { GET as getTelegramMessagesApi } from "../app/api/telegram/messages/route";
import { MessageService } from "../lib/telegram/messages";
import { AUTH_COOKIE_NAME } from "../lib/auth/config";

test("JWT Session Token Signing and Verification", () => {
  const secret = "test-secret-key-1234567890123456";
  const payload = {
    userId: "usr_12345",
    email: "user@gmail.com",
    name: "John Doe",
    picture: "https://example.com/avatar.jpg",
  };

  const token = signSessionToken(payload, secret, 3600);
  assert.ok(token, "Token should be generated");
  assert.equal(token.split(".").length, 3, "Token should have 3 segments");

  const verified = verifySessionToken(token, secret);
  assert.ok(verified, "Token should verify successfully");
  assert.equal(verified?.userId, payload.userId);
  assert.equal(verified?.email, payload.email);
  assert.equal(verified?.name, payload.name);

  // Test tampered token
  const tamperedToken = token.slice(0, -4) + "abcd";
  const invalid = verifySessionToken(tamperedToken, secret);
  assert.equal(invalid, null, "Tampered token must fail verification");

  // Test wrong secret
  const wrongSecret = verifySessionToken(token, "different-secret-key");
  assert.equal(wrongSecret, null, "Wrong secret must fail verification");

  // Test expired token
  const expiredToken = signSessionToken(payload, secret, -10);
  const expiredResult = verifySessionToken(expiredToken, secret);
  assert.equal(expiredResult, null, "Expired token must fail verification");
});

test("Google OAuth Authorization URL Builder", () => {
  process.env.GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "mock-client-secret";
  process.env.APP_URL = "http://localhost:3000";

  const { url, state } = getGoogleAuthorizationUrl({
    prompt: "select_account",
  });

  assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("client_id"), "mock-client-id.apps.googleusercontent.com");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("scope"), "openid email profile");
  assert.equal(parsed.searchParams.get("prompt"), "select_account");
  assert.equal(parsed.searchParams.get("state"), state);
  assert.equal(parsed.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/google/callback");
});

test("UserService: Gmail Registration (Default 'user' Role, Admin Set Only in DB)", async () => {
  const googleProfile = {
    id: `google_id_${Date.now()}`,
    email: `test.user.${Date.now()}@gmail.com`,
    name: "Alex Smith",
    picture: "https://lh3.googleusercontent.com/a/photo",
    emailVerified: true,
  };

  // Step 1: Register new user with Gmail - should always default to 'user'
  const registerResult = await UserService.registerOrLoginGoogleUser(googleProfile);
  assert.equal(registerResult.isNewUser, true, "First authentication must be marked as new user registration");
  assert.ok(registerResult.user.id.startsWith("usr_"), "User ID should be generated");
  assert.equal(registerResult.user.email, googleProfile.email);
  assert.equal(registerResult.user.name, googleProfile.name);
  assert.equal(registerResult.user.role, "user", "New user role must default to 'user'");
  assert.equal(registerResult.user.emailVerified, true);
  assert.ok(registerResult.token, "Auth session token should be issued");

  const createdUserId = registerResult.user.id;

  // Step 2: Elevating to admin is only done via DB update / UserService.updateUserRole
  const promotedAdmin = await UserService.updateUserRole(createdUserId, "admin");
  assert.equal(promotedAdmin?.role, "admin", "User role in DB should now be 'admin'");

  // Step 3: Login existing user - must preserve their DB role
  const updatedProfile = {
    ...googleProfile,
    name: "Alex Smith Updated",
  };

  const loginResult = await UserService.registerOrLoginGoogleUser(updatedProfile);
  assert.equal(loginResult.isNewUser, false, "Subsequent authentication must be recognized as existing user");
  assert.equal(loginResult.user.id, createdUserId);
  assert.equal(loginResult.user.role, "admin", "User must retain 'admin' role stored in DB");

  // Cleanup
  await UserService.deleteUser(createdUserId);
});

test("Authentication API Endpoints: /api/auth/me, /api/auth/users, /api/auth/logout, /api/auth/google", async () => {
  // Create test user
  const testProfile = {
    id: `api_test_${Date.now()}`,
    email: `api.test.${Date.now()}@gmail.com`,
    name: "API Test User",
    emailVerified: true,
  };
  const { user, token } = await UserService.registerOrLoginGoogleUser(testProfile);

  // Test authenticated /api/auth/me using Bearer token
  const authReq = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const authRes = await getMe(authReq);
  const authData = await authRes.json();
  assert.equal(authData.authenticated, true);
  assert.equal(authData.user.id, user.id);
  assert.equal(authData.user.email, user.email);
  assert.equal(authData.role, "user");
  assert.ok(Array.isArray(authData.menu));

  // Test /api/auth/users
  const usersReq = new NextRequest("http://localhost:3000/api/auth/users");
  const usersRes = await listUsersApi(usersReq);
  const usersData = await usersRes.json();
  assert.ok(Array.isArray(usersData.users));
  assert.ok(usersData.count >= 1);

  // Test /api/auth/logout
  const logoutRes = await logoutUser();
  assert.equal(logoutRes.status, 200);
  const logoutData = await logoutRes.json();
  assert.equal(logoutData.success, true);
  const cookieHeader = logoutRes.headers.get("set-cookie");
  assert.ok(cookieHeader && cookieHeader.includes(AUTH_COOKIE_NAME));

  // Test /api/auth/google?json=true
  process.env.GOOGLE_CLIENT_ID = "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  const googleApiReq = new NextRequest("http://localhost:3000/api/auth/google?json=true");
  const googleApiRes = await getGoogleAuthApi(googleApiReq);
  assert.equal(googleApiRes.status, 200);
  const googleApiData = await googleApiRes.json();
  assert.ok(googleApiData.url.includes("accounts.google.com"));
  assert.ok(googleApiData.state);

  // Cleanup
  await UserService.deleteUser(user.id);
});

test("Mock Menu Items A, B, C and Administrator-Only System Menu", async () => {
  // Check master menu items catalog
  const baseIds = BASE_MENU_ITEMS.map((m) => m.id);
  assert.ok(baseIds.includes("mock_a"), "Must include Mock Menu Item A");
  assert.ok(baseIds.includes("mock_b"), "Must include Mock Menu Item B");
  assert.ok(baseIds.includes("mock_c"), "Must include Mock Menu Item C");
  assert.ok(baseIds.includes("system"), "Must include System Menu Item");

  // 1. Admin Role Access: Can access Mock A, B, C and System
  const adminMenu = getMenuItemsForRole("admin");
  const adminMenuIds = adminMenu.map((m) => m.id);
  assert.ok(adminMenuIds.includes("mock_a"));
  assert.ok(adminMenuIds.includes("mock_b"));
  assert.ok(adminMenuIds.includes("mock_c"));
  assert.ok(adminMenuIds.includes("system"), "Administrator MUST have access to System menu");

  // 2. Standard User Access: Can access Mock A, but NOT System
  const userMenu = getMenuItemsForRole("user");
  const userMenuIds = userMenu.map((m) => m.id);
  assert.ok(userMenuIds.includes("mock_a"));
  assert.equal(userMenuIds.includes("system"), false, "Standard user must NOT have access to System menu");

  // 3. Operator Access: Can access Mock A and B, but NOT System
  const operatorMenu = getMenuItemsForRole("operator");
  const operatorMenuIds = operatorMenu.map((m) => m.id);
  assert.ok(operatorMenuIds.includes("mock_a"));
  assert.ok(operatorMenuIds.includes("mock_b"));
  assert.equal(operatorMenuIds.includes("system"), false, "Operator must NOT have access to System menu");

  // 4. Permission Helpers
  assert.equal(hasMenuAccess("admin", "system"), true);
  assert.equal(hasMenuAccess("operator", "system"), false);
  assert.equal(hasMenuAccess("user", "system"), false);
  assert.equal(hasMenuAccess("user", "mock_a"), true);

  assert.equal(hasRoleLevel("admin", "operator"), true);
  assert.equal(hasRoleLevel("operator", "admin"), false);
  assert.equal(hasRoleLevel("user", "admin"), false);

  assert.equal(normalizeRole("ADMINISTRATOR"), "admin");
  assert.equal(normalizeRole("Manager"), "operator");
  assert.equal(normalizeRole("unknown_role"), "unknown_role");

  const badge = getRoleBadgeInfo("admin");
  assert.equal(badge.name, "Administrator");
  assert.equal(badge.level, 3);
});

test("Roles Management: Create Roles, Assign Users to Roles, and Map Menu Items to Roles", async () => {
  // Create admin user for testing authenticated management calls
  const adminProfile = {
    id: `admin_tester_${Date.now()}`,
    email: `admin.tester.${Date.now()}@gmail.com`,
    name: "Admin Tester",
    emailVerified: true,
  };
  const { user: adminUser, token: adminToken } = await UserService.registerOrLoginGoogleUser(adminProfile);
  await UserService.updateUserRole(adminUser.id, "admin");

  // 1. Test GET /api/auth/roles
  const rolesRes = await getRolesApi();
  assert.equal(rolesRes.status, 200);
  const rolesData = await rolesRes.json();
  assert.ok(rolesData.roles.includes("admin"));
  assert.ok(rolesData.roles.includes("user"));
  assert.ok(rolesData.mappings);

  // 2. Test POST /api/auth/roles (Create new role)
  const customRoleId = `tester_${Date.now()}`;
  const createRoleReq = new NextRequest("http://localhost:3000/api/auth/roles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      id: customRoleId,
      name: "Quality Tester",
      description: "Custom role for QA testing",
      badgeColor: {
        bg: "bg-amber-500/10",
        text: "text-amber-300",
        border: "border-amber-500/30",
        dot: "bg-amber-400",
      },
    }),
  });

  const createRoleRes = await createRoleApi(createRoleReq);
  assert.equal(createRoleRes.status, 200);
  const createRoleData = await createRoleRes.json();
  assert.equal(createRoleData.success, true);
  assert.equal(createRoleData.role.id, customRoleId);
  assert.equal(createRoleData.role.name, "Quality Tester");

  // 3. Test Assign User to Role (PATCH /api/auth/users)
  const targetProfile = {
    id: `target_user_${Date.now()}`,
    email: `target.user.${Date.now()}@gmail.com`,
    name: "Target User",
    emailVerified: true,
  };
  const { user: targetUser } = await UserService.registerOrLoginGoogleUser(targetProfile);

  const assignReq = new NextRequest("http://localhost:3000/api/auth/users", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      userId: targetUser.id,
      role: customRoleId,
    }),
  });

  const assignRes = await updateUserRoleApi(assignReq);
  assert.equal(assignRes.status, 200);
  const assignData = await assignRes.json();
  assert.equal(assignData.success, true);
  assert.equal(assignData.user.role, customRoleId);

  // 4. Test Map Menu Items to Roles (PUT /api/auth/roles)
  const updateMappingsReq = new NextRequest("http://localhost:3000/api/auth/roles", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      mappings: {
        mock_a: ["admin", "operator", "user", customRoleId],
        mock_b: ["admin", "operator", customRoleId],
        mock_c: ["admin"],
        system: ["admin"],
      },
    }),
  });

  const updateMappingsRes = await updateMappingsApi(updateMappingsReq);
  assert.equal(updateMappingsRes.status, 200);
  const updateMappingsData = await updateMappingsRes.json();
  assert.equal(updateMappingsData.success, true);
  assert.ok(updateMappingsData.mappings.mock_b.includes(customRoleId));

  // Verify custom role now has access to Mock A and Mock B via RolesService
  const customRoleMenu = await RolesService.getMenuItemsForRole(customRoleId);
  const customMenuIds = customRoleMenu.map((m) => m.id);
  assert.ok(customMenuIds.includes("mock_a"));
  assert.ok(customMenuIds.includes("mock_b"));
  assert.equal(customMenuIds.includes("mock_c"), false);
  assert.equal(customMenuIds.includes("system"), false);

  // 5. Test DELETE /api/auth/roles (Delete custom role)
  const deleteReq = new NextRequest(`http://localhost:3000/api/auth/roles?roleId=${customRoleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const deleteRes = await deleteRoleApi(deleteReq);
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);

  // Cleanup
  await UserService.deleteUser(adminUser.id);
  await UserService.deleteUser(targetUser.id);
});

test("Session Access Gate: Unauthenticated vs Authenticated User Resolution", async () => {
  const { getCurrentUser } = await import("../lib/auth/session");

  // Unauthenticated request
  const unauthReq = new NextRequest("http://localhost:3000/");
  const unauthUser = await getCurrentUser(unauthReq);
  assert.equal(unauthUser, null, "Guest request should resolve to null user (shows only login)");

  // Authenticated request with session cookie
  const testProfile = {
    id: `gate_user_${Date.now()}`,
    email: `gate.test.${Date.now()}@gmail.com`,
    name: "Gate User",
    emailVerified: true,
  };
  const { user, token } = await UserService.registerOrLoginGoogleUser(testProfile);

  const authReq = new NextRequest("http://localhost:3000/", {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
    },
  });
  const authUser = await getCurrentUser(authReq);
  assert.ok(authUser, "Authenticated request must resolve valid User session");
  assert.equal(authUser?.id, user.id);
  assert.equal(authUser?.email, user.email);

  // Cleanup
  await UserService.deleteUser(user.id);
});

test("Telegram Bot Subsystem: Message Logging, Retrieval API & Filtering", async () => {
  const testChatId = 987654321;
  const testUserId = 123456789;

  // 1. Log an incoming message from a user
  await MessageService.logMessage({
    updateId: 1001,
    messageId: 2001,
    chatId: testChatId,
    userId: testUserId,
    username: "telegram_tester",
    firstName: "Test",
    lastName: "User",
    text: "Hello Bot, test incoming message",
    direction: "incoming",
    messageType: "text",
  });

  // 2. Log an outgoing message from the bot
  await MessageService.logMessage({
    messageId: 2002,
    chatId: testChatId,
    userId: testUserId,
    username: "telegram_tester",
    firstName: "Test",
    lastName: "User",
    text: "Hello User! This is an outgoing bot reply",
    direction: "outgoing",
    messageType: "message",
  });

  // 3. Test GET /api/telegram/messages (All messages)
  const allReq = new NextRequest(`http://localhost:3000/api/telegram/messages?chatId=${testChatId}&limit=10`);
  const allRes = await getTelegramMessagesApi(allReq);
  assert.equal(allRes.status, 200);
  const allData = await allRes.json();
  assert.ok(allData.count >= 2, "Should return at least 2 logged messages");
  assert.ok(Array.isArray(allData.messages));

  // 4. Test GET /api/telegram/messages with direction=incoming filter
  const inReq = new NextRequest(`http://localhost:3000/api/telegram/messages?chatId=${testChatId}&direction=incoming&limit=10`);
  const inRes = await getTelegramMessagesApi(inReq);
  assert.equal(inRes.status, 200);
  const inData = await inRes.json();
  assert.ok(inData.messages.every((m: { direction: string }) => m.direction === "incoming"));
  assert.ok(inData.messages.some((m: { text?: string }) => m.text?.includes("test incoming message")));

  // 5. Test GET /api/telegram/messages with direction=outgoing filter
  const outReq = new NextRequest(`http://localhost:3000/api/telegram/messages?chatId=${testChatId}&direction=outgoing&limit=10`);
  const outRes = await getTelegramMessagesApi(outReq);
  assert.equal(outRes.status, 200);
  const outData = await outRes.json();
  assert.ok(outData.messages.every((m: { direction: string }) => m.direction === "outgoing"));
  assert.ok(outData.messages.some((m: { text?: string }) => m.text?.includes("outgoing bot reply")));
});
