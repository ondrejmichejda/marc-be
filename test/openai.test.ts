import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  OpenAiLogService,
  estimateCostUsd,
  isOpenAiConfigured,
  getOpenAiConfig,
  executeChatCompletion,
  generateFunnyInsult,
} from "../lib/openai";
import { GET as getUsageApi } from "../app/api/openai/usage/route";
import {
  GET as getMessagesApi,
  DELETE as deleteMessagesApi,
} from "../app/api/openai/messages/route";
import { POST as postTestApi } from "../app/api/openai/test/route";

test("OpenAI Cost Estimation across Models", () => {
  const config = getOpenAiConfig();
  assert.ok(config, "Config should return status object");
  assert.equal(typeof isOpenAiConfigured(), "boolean");

  // gpt-4o-mini ($0.15 prompt / $0.60 completion per 1M tokens)
  const costMini = estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000);
  assert.equal(costMini, 0.75);

  // gpt-4o ($2.50 prompt / $10.00 completion per 1M tokens)
  const cost4o = estimateCostUsd("gpt-4o", 1_000_000, 1_000_000);
  assert.equal(cost4o, 12.5);

  // Small token sample
  const sampleCost = estimateCostUsd("gpt-4o-mini", 50, 50);
  assert.ok(sampleCost >= 0);
  assert.ok(sampleCost < 0.001);
});

test("OpenAiLogService: Log interaction, list with filters, and aggregate usage", async () => {
  const testId = `test_run_${Date.now()}`;

  // Log a successful interaction
  const log1 = await OpenAiLogService.logInteraction({
    model: "gpt-4o-mini",
    prompt: `Test prompt 1 for ${testId}`,
    completion: "Test completion 1 output",
    promptTokens: 25,
    completionTokens: 30,
    totalTokens: 55,
    durationMs: 340,
    status: "success",
    userIdentifier: "user@test.com",
    source: "unit_test",
  });

  assert.ok(log1.id, "Log must have an ID");
  assert.equal(log1.model, "gpt-4o-mini");
  assert.equal(log1.status, "success");
  assert.equal(log1.totalTokens, 55);

  // Log an error interaction
  const log2 = await OpenAiLogService.logInteraction({
    model: "gpt-4o",
    prompt: `Test prompt 2 for ${testId}`,
    completion: "",
    promptTokens: 10,
    completionTokens: 0,
    totalTokens: 10,
    durationMs: 120,
    status: "error",
    errorMessage: "Rate limit exceeded test",
    userIdentifier: "admin@test.com",
    source: "unit_test",
  });

  assert.equal(log2.status, "error");
  assert.equal(log2.errorMessage, "Rate limit exceeded test");

  // List with search filter
  const searchResults = await OpenAiLogService.listLogs({ search: testId });
  assert.equal(searchResults.length, 2, "Search should find both created logs");

  // List with status filter
  const errorResults = await OpenAiLogService.listLogs({
    search: testId,
    status: "error",
  });
  assert.equal(errorResults.length, 1);
  assert.equal(errorResults[0].id, log2.id);

  // Compute aggregate usage summary
  const summary = await OpenAiLogService.getUsageSummary();
  assert.ok(summary.totalRequests >= 2);
  assert.ok(summary.totalTokens >= 65);
  assert.ok(summary.modelsUsed.length >= 2);

  const miniStats = summary.modelsUsed.find((m) => m.model === "gpt-4o-mini");
  assert.ok(miniStats, "gpt-4o-mini stats should exist");
  assert.ok(miniStats.totalTokens >= 55);
});

test("OpenAI Service: executeChatCompletion and generateFunnyInsult", async () => {
  const result = await executeChatCompletion({
    prompt: "Vtipná hláška pro ranní trénink",
    model: "gpt-4o-mini",
    userIdentifier: "test_service_user",
  });

  assert.ok(result.completion, "Completion should be generated");
  assert.ok(result.log, "Interaction log must be created");
  assert.equal(result.log.model, "gpt-4o-mini");
  assert.equal(result.log.status, "success");
  assert.ok(result.log.totalTokens > 0);

  const insult = await generateFunnyInsult("Nestíhám trénink");
  assert.ok(typeof insult === "string" && insult.length > 0);
});

test("OpenAI API Endpoints: Usage, Messages, Test Completion, and Reset", async () => {
  // Test GET /api/openai/usage
  const usageRes = await getUsageApi();
  assert.equal(usageRes.status, 200);
  const usageData = await usageRes.json();
  assert.ok(usageData.config, "Config metadata must be present");
  assert.ok(usageData.usage, "Usage summary must be present");
  assert.ok(Array.isArray(usageData.usage.modelsUsed));

  // Test POST /api/openai/test
  const testReq = new NextRequest("http://localhost:3000/api/openai/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Vysvětli sweep z half guardu.",
      model: "gpt-4o-mini",
    }),
  });

  const testRes = await postTestApi(testReq);
  assert.equal(testRes.status, 200);
  const testData = await testRes.json();
  assert.equal(testData.success, true);
  assert.ok(testData.completion);
  assert.ok(testData.log);

  // Test GET /api/openai/messages
  const listReq = new NextRequest("http://localhost:3000/api/openai/messages?limit=10");
  const listRes = await getMessagesApi(listReq);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.count > 0);
  assert.ok(Array.isArray(listData.messages));

  // Test DELETE /api/openai/messages
  const deleteRes = await deleteMessagesApi();
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);
});
