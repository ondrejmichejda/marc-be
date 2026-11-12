import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  UserAiSettingsService,
  ALL_KNOWN_OPENAI_MODELS,
  executeChatCompletion,
} from "../lib/openai";
import {
  BASE_MENU_ITEMS,
  DEFAULT_MENU_MAPPINGS,
  getMenuItemsForRole,
  hasMenuAccess,
} from "../lib/auth/roles";
import {
  GET as getUserAiSettingsApi,
  POST as postUserAiSettingsApi,
  DELETE as deleteUserAiSettingsApi,
} from "../app/api/user/ai-settings/route";
import { POST as validateUserAiKeyApi } from "../app/api/user/ai-settings/validate/route";
import { GET as getAvailableModelsApi } from "../app/api/user/ai-settings/models/route";
import {
  GET as getUserAiUsageApi,
  POST as postUserAiUsageApi,
} from "../app/api/user/ai-settings/usage/route";

test("UserAiSettingsService: Save, Retrieve, Masked Config, and Clear", async () => {
  const userId = `test_usr_${Date.now()}`;

  // 1. Initial state: not configured
  const initialConfig = await UserAiSettingsService.getUserOpenAiConfig(userId);
  assert.equal(initialConfig.isConfigured, false);
  assert.equal(initialConfig.apiKeyConfigured, false);
  assert.equal(initialConfig.maskedKey, undefined);
  assert.equal(initialConfig.defaultModel, "gpt-4o");
  assert.equal(initialConfig.webSearchEnabled, true);

  // 2. Save settings with API key, custom model, web search, and organization
  const saved = await UserAiSettingsService.saveSettings(userId, {
    apiKey: "sk-proj-userSecretApiKey1234567890",
    defaultModel: "o3-mini",
    customModel: "o3-mini",
    webSearchEnabled: true,
    organization: "org-test-enterprise",
    temperature: 0.2,
    reasoningEffort: "high",
  });

  assert.equal(saved.userId, userId);
  assert.equal(saved.apiKey, "sk-proj-userSecretApiKey1234567890");
  assert.equal(saved.defaultModel, "o3-mini");
  assert.equal(saved.webSearchEnabled, true);
  assert.equal(saved.organization, "org-test-enterprise");

  // 3. Verify client-safe masked configuration
  const loadedConfig = await UserAiSettingsService.getUserOpenAiConfig(userId);
  assert.equal(loadedConfig.isConfigured, true);
  assert.equal(loadedConfig.apiKeyConfigured, true);
  assert.ok(loadedConfig.maskedKey?.startsWith("sk-"));
  assert.ok(loadedConfig.maskedKey?.endsWith("7890"));
  assert.ok(loadedConfig.maskedKey?.includes("..."));
  assert.equal(loadedConfig.defaultModel, "o3-mini");
  assert.equal(loadedConfig.organization, "org-test-enterprise");
  assert.deepEqual(loadedConfig.availableModels, ALL_KNOWN_OPENAI_MODELS);

  // 4. Update without overwriting existing key when masked or omitted
  const updatedWithoutKey = await UserAiSettingsService.saveSettings(userId, {
    defaultModel: "gpt-4o",
    apiKey: "sk-...7890", // masked input should not overwrite
  });
  assert.equal(updatedWithoutKey.apiKey, "sk-proj-userSecretApiKey1234567890");
  assert.equal(updatedWithoutKey.defaultModel, "gpt-4o");

  // 5. Delete / Clear settings
  const deleted = await UserAiSettingsService.deleteSettings(userId);
  assert.equal(deleted, true);

  const afterDeleteConfig = await UserAiSettingsService.getUserOpenAiConfig(userId);
  assert.equal(afterDeleteConfig.isConfigured, false);
  assert.equal(afterDeleteConfig.apiKeyConfigured, false);
});

test("User AI Settings REST API: GET, POST, Validate, and DELETE", async () => {
  // 1. GET /api/user/ai-settings
  const getReq = new NextRequest("http://localhost:3000/api/user/ai-settings");
  const getRes = await getUserAiSettingsApi(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(getData.config);

  // 2. POST /api/user/ai-settings (Save settings)
  const postReq = new NextRequest("http://localhost:3000/api/user/ai-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: "sk-proj-apiEndpointKeyForTesting1234",
      defaultModel: "gpt-4o-mini",
      webSearchEnabled: true,
      organization: "org-unit-test",
    }),
  });
  const postRes = await postUserAiSettingsApi(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.config.isConfigured, true);
  assert.equal(postData.config.defaultModel, "gpt-4o-mini");
  assert.ok(postData.config.maskedKey?.includes("..."));

  // 3. POST /api/user/ai-settings/validate (Validate key endpoint with empty key check)
  const emptyValReq = new NextRequest("http://localhost:3000/api/user/ai-settings/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: "" }),
  });
  const emptyValRes = await validateUserAiKeyApi(emptyValReq);
  assert.equal(emptyValRes.status, 400);

  // 4. POST /api/user/ai-settings with clear: true
  const clearReq = new NextRequest("http://localhost:3000/api/user/ai-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear: true }),
  });
  const clearRes = await postUserAiSettingsApi(clearReq);
  assert.equal(clearRes.status, 200);
  const clearData = await clearRes.json();
  assert.equal(clearData.success, true);
  assert.equal(clearData.config.isConfigured, false);

  // 5. DELETE /api/user/ai-settings
  const delReq = new NextRequest("http://localhost:3000/api/user/ai-settings", {
    method: "DELETE",
  });
  const delRes = await deleteUserAiSettingsApi(delReq);
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.success, true);
  assert.equal(delData.config.isConfigured, false);

  // 6. GET /api/user/ai-settings/models (Retrieve available models dynamically)
  const modelsReq = new NextRequest("http://localhost:3000/api/user/ai-settings/models");
  const modelsRes = await getAvailableModelsApi(modelsReq);
  assert.equal(modelsRes.status, 200);
  const modelsData = await modelsRes.json();
  assert.equal(modelsData.success, true);
  assert.ok(Array.isArray(modelsData.models));
  assert.ok(modelsData.models.length >= 10);
  assert.ok(modelsData.models.includes("gpt-4o"));
  assert.ok(modelsData.models.includes("o3-mini"));
  assert.ok(modelsData.models.includes("gpt-4.5-preview"));
  assert.ok(Array.isArray(modelsData.modelDetails));
  assert.ok(modelsData.modelDetails.length >= 10);
  const gpt4oDetail = modelsData.modelDetails.find((d: { id: string }) => d.id === "gpt-4o");
  assert.ok(gpt4oDetail);
  assert.equal(gpt4oDetail.isReasoning, false);
  const o3MiniDetail = modelsData.modelDetails.find((d: { id: string }) => d.id === "o3-mini");
  assert.ok(o3MiniDetail);
  assert.equal(o3MiniDetail.isReasoning, true);
});

test("Menu Architecture: FSS AI Prompts as separated menu item and AI Settings page", () => {
  // 1. Verify FSS AI Prompts is a standalone menu item
  const fssPromptsItem = BASE_MENU_ITEMS.find((item) => item.id === "fss_ai_prompts");
  assert.ok(fssPromptsItem, "FSS AI Prompts must be present in BASE_MENU_ITEMS as a separated menu item");
  assert.equal(fssPromptsItem.label, "FSS AI Prompts");
  assert.equal(fssPromptsItem.category, "Administration");
  assert.deepEqual(fssPromptsItem.allowedRoles, ["admin"]);

  // 2. Verify AI Settings is a standalone menu item in Administration section
  const aiSettingsItem = BASE_MENU_ITEMS.find((item) => item.id === "openai_settings");
  assert.ok(aiSettingsItem, "AI Settings must be present in BASE_MENU_ITEMS");
  assert.equal(aiSettingsItem.label, "AI Settings");
  assert.equal(aiSettingsItem.category, "Administration");
  assert.deepEqual(aiSettingsItem.allowedRoles, ["admin", "operator", "user"]);

  // 3. Verify DEFAULT_MENU_MAPPINGS
  assert.deepEqual(DEFAULT_MENU_MAPPINGS.fss_ai_prompts, ["admin"]);
  assert.deepEqual(DEFAULT_MENU_MAPPINGS.openai_settings, ["admin", "operator", "user"]);

  // 4. Check role menu access
  const adminMenu = getMenuItemsForRole("admin");
  const userMenu = getMenuItemsForRole("user");

  assert.ok(adminMenu.some((item) => item.id === "fss_ai_prompts"), "Admin must have access to FSS AI Prompts");
  assert.ok(adminMenu.some((item) => item.id === "openai_settings"), "Admin must have access to AI Settings");
  assert.ok(!userMenu.some((item) => item.id === "fss_ai_prompts"), "Standard user must not see FSS AI Prompts in sidebar menu");
  assert.ok(userMenu.some((item) => item.id === "openai_settings"), "Standard user must see AI Settings menu item");

  assert.equal(hasMenuAccess("admin", "fss_ai_prompts"), true);
  assert.equal(hasMenuAccess("user", "fss_ai_prompts"), false);
  assert.equal(hasMenuAccess("user", "openai_settings"), true);
  assert.equal(hasMenuAccess("operator", "openai_settings"), true);
});

test("OpenAI Execution uses User Personal AI Token and Settings", async () => {
  const userId = `exec_usr_${Date.now()}`;

  // Configure personal token and model for user
  await UserAiSettingsService.saveSettings(userId, {
    apiKey: "sk-test-mockUserPersonalApiKey123",
    defaultModel: "gpt-4o-mini",
    temperature: 0.3,
    webSearchEnabled: true,
  });

  // Execute chat completion by passing userId without an explicit apiKey param
  const result = await executeChatCompletion({
    prompt: "Vypočítej požární riziko pro únikový východ",
    userId,
    userIdentifier: "engineer@company.cz",
    source: "personal_token_test",
  });

  assert.ok(result.completion);
  assert.ok(result.log);
  assert.equal(result.log.model, "gpt-4o-mini");
  assert.equal(result.log.status, "success");
});

test("User AI Usage & Credit Balance Overview: Service and API Endpoint", async () => {
  const userId = `usage_usr_${Date.now()}`;

  // 1. Check overview computation via Service
  const usage = await UserAiSettingsService.getUserUsageOverview(
    userId,
    "sk-test-mockUserCreditKey"
  );

  assert.ok(usage);
  assert.equal(typeof usage.totalRequests, "number");
  assert.equal(typeof usage.totalTokens, "number");
  assert.equal(typeof usage.estimatedTotalCostUsd, "number");
  assert.equal(typeof usage.estimatedTotalCostCzk, "number");
  assert.equal(typeof usage.successRate, "number");
  assert.ok(Array.isArray(usage.modelsUsed));
  assert.ok(Array.isArray(usage.recentDailyUsage));
  assert.ok(Array.isArray(usage.pricingGuide));
  assert.ok(usage.pricingGuide.length >= 4);
  assert.ok(usage.fssStats);
  assert.equal(typeof usage.fssStats.totalFssProjects, "number");

  // Verify credit info structure
  assert.ok(usage.creditInfo);
  assert.equal(usage.creditInfo.status, "available");
  assert.equal(typeof usage.creditInfo.totalAvailableUsd, "number");
  assert.ok(usage.creditInfo.totalAvailableUsd! > 0);

  // 2. Test GET /api/user/ai-settings/usage
  const getReq = new NextRequest("http://localhost:3000/api/user/ai-settings/usage");
  const getRes = await getUserAiUsageApi(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(getData.usage);
  assert.equal(typeof getData.usage.totalRequests, "number");
  assert.equal(typeof getData.usage.estimatedTotalCostUsd, "number");
  assert.ok(Array.isArray(getData.usage.pricingGuide));

  // 3. Test POST /api/user/ai-settings/usage with custom key
  const postReq = new NextRequest("http://localhost:3000/api/user/ai-settings/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: "sk-test-customUsageTestToken123",
      organization: "org-test-corp",
    }),
  });
  const postRes = await postUserAiUsageApi(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.ok(postData.usage);
  assert.equal(postData.usage.creditInfo.status, "available");
  assert.equal(postData.usage.creditInfo.totalGrantedUsd, 20.0);
});
