import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { ScheduledPromptService } from "../lib/prompts/service";
import { GET as getCronPromptsApi, POST as postCronPromptsApi } from "../app/api/cron/prompts/route";
import { GET as getPromptsCronAliasApi } from "../app/api/prompts/cron/route";

test("Vercel Cron: ScheduledPromptService batch execution for active prompts", async () => {
  await ScheduledPromptService.clearAll();

  // Create prompts for multiple users at various scheduled times
  const user1 = "cron_user_alpha";
  const user2 = "cron_user_beta";

  // User 1: 6am (active), 9am (active), 1pm (paused)
  await ScheduledPromptService.createPrompt({
    userId: user1,
    userEmail: "alpha@marc.dev",
    prompt: "Alpha 6am morning prompt.",
    scheduledTime: "6am",
    title: "Alpha 6am",
    isActive: true,
  });

  await ScheduledPromptService.createPrompt({
    userId: user1,
    userEmail: "alpha@marc.dev",
    prompt: "Alpha 9am morning prompt.",
    scheduledTime: "9am",
    title: "Alpha 9am",
    isActive: true,
  });

  await ScheduledPromptService.createPrompt({
    userId: user1,
    userEmail: "alpha@marc.dev",
    prompt: "Alpha 1pm paused prompt.",
    scheduledTime: "1pm",
    title: "Alpha 1pm Paused",
    isActive: false, // Paused prompt should not be run by cron
  });

  // User 2: 6am (active), 5pm (active)
  await ScheduledPromptService.createPrompt({
    userId: user2,
    userEmail: "beta@marc.dev",
    prompt: "Beta 6am morning prompt.",
    scheduledTime: "6am",
    title: "Beta 6am",
    isActive: true,
  });

  await ScheduledPromptService.createPrompt({
    userId: user2,
    userEmail: "beta@marc.dev",
    prompt: "Beta 5pm evening prompt.",
    scheduledTime: "5pm",
    title: "Beta 5pm",
    isActive: true,
  });

  // 1. Get all active prompts for 6am (should be 2: alpha + beta)
  const active6am = await ScheduledPromptService.getAllActivePrompts("6am");
  assert.equal(active6am.length, 2);

  // 2. Get all active prompts for 1pm (should be 0 because only prompt at 1pm is paused)
  const active1pm = await ScheduledPromptService.getAllActivePrompts("1pm");
  assert.equal(active1pm.length, 0);

  // 3. Get all active prompts across all time slots (should be 4 active: alpha 6am, alpha 9am, beta 6am, beta 5pm)
  const activeAll = await ScheduledPromptService.getAllActivePrompts("all");
  assert.equal(activeAll.length, 4);

  // 4. Batch execution for 6am
  const batch6am = await ScheduledPromptService.executeScheduledPromptsBatch({
    scheduledTime: "6am",
  });
  assert.equal(batch6am.targetTime, "6am");
  assert.equal(batch6am.totalFound, 2);
  assert.equal(batch6am.executed, 2);
  assert.equal(batch6am.successful, 2);
  assert.equal(batch6am.failed, 0);
  assert.equal(batch6am.results.length, 2);
  assert.ok(batch6am.results[0].success);
  assert.ok(batch6am.results[0].completionPreview);
});

test("Vercel Cron API Route: /api/cron/prompts endpoint integration", async () => {
  await ScheduledPromptService.clearAll();

  const user = "cron_api_test_user";
  await ScheduledPromptService.createPrompt({
    userId: user,
    userEmail: "cron_tester@marc.dev",
    prompt: "Test Vercel Cron Dispatch 9am.",
    scheduledTime: "9am",
    title: "Vercel Cron 9am Test",
    isActive: true,
  });

  // 1. GET /api/cron/prompts?time=9am
  const getReq = new NextRequest("http://localhost:3000/api/cron/prompts?time=9am");
  const getRes = await getCronPromptsApi(getReq);
  assert.equal(getRes.status, 200);

  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.equal(getData.scheduler, "Vercel Cron / Task Scheduler");
  assert.equal(getData.targetTime, "9am");
  assert.equal(getData.successful, 1);
  assert.equal(getData.results[0].title, "Vercel Cron 9am Test");

  // 2. GET /api/cron/prompts?time=5pm (no prompts for 5pm)
  const getEmptyReq = new NextRequest("http://localhost:3000/api/cron/prompts?time=5pm");
  const getEmptyRes = await getCronPromptsApi(getEmptyReq);
  assert.equal(getEmptyRes.status, 200);
  const getEmptyData = await getEmptyRes.json();
  assert.equal(getEmptyData.totalFound, 0);
  assert.equal(getEmptyData.executed, 0);

  // 3. POST /api/cron/prompts with JSON body
  const postReq = new NextRequest("http://localhost:3000/api/cron/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledTime: "9am" }),
  });
  const postRes = await postCronPromptsApi(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.successful, 1);

  // 4. GET /api/prompts/cron alias route
  const aliasReq = new NextRequest("http://localhost:3000/api/prompts/cron?time=9am");
  const aliasRes = await getPromptsCronAliasApi(aliasReq);
  assert.equal(aliasRes.status, 200);
  const aliasData = await aliasRes.json();
  assert.equal(aliasData.success, true);
});

test("Vercel Cron Security: CRON_SECRET authentication validation", async () => {
  const originalSecret = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "super_secure_cron_secret_12345";

    // 1. Request without secret should return 401 Unauthorized
    const unauthReq = new NextRequest("http://localhost:3000/api/cron/prompts?time=6am");
    const unauthRes = await getCronPromptsApi(unauthReq);
    assert.equal(unauthRes.status, 401);
    const unauthData = await unauthRes.json();
    assert.match(unauthData.error, /Unauthorized/);

    // 2. Request with invalid Bearer token should return 401
    const badBearerReq = new NextRequest("http://localhost:3000/api/cron/prompts?time=6am", {
      headers: { authorization: "Bearer wrong_secret" },
    });
    const badBearerRes = await getCronPromptsApi(badBearerReq);
    assert.equal(badBearerRes.status, 401);

    // 3. Request with valid Authorization: Bearer <CRON_SECRET> header should succeed (200)
    const validBearerReq = new NextRequest("http://localhost:3000/api/cron/prompts?time=6am", {
      headers: { authorization: "Bearer super_secure_cron_secret_12345" },
    });
    const validBearerRes = await getCronPromptsApi(validBearerReq);
    assert.equal(validBearerRes.status, 200);
    const validBearerData = await validBearerRes.json();
    assert.equal(validBearerData.success, true);
    assert.equal(validBearerData.authReason, "bearer_token");

    // 4. Request with valid ?secret= parameter should succeed (200)
    const querySecretReq = new NextRequest(
      "http://localhost:3000/api/cron/prompts?time=6am&secret=super_secure_cron_secret_12345"
    );
    const querySecretRes = await getCronPromptsApi(querySecretReq);
    assert.equal(querySecretRes.status, 200);
    const querySecretData = await querySecretRes.json();
    assert.equal(querySecretData.success, true);
    assert.equal(querySecretData.authReason, "query_secret");
  } finally {
    process.env.CRON_SECRET = originalSecret;
  }
});
