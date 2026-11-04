import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  ScheduledPromptService,
  isValidScheduledTime,
  normalizeScheduledTime,
  SCHEDULED_TIME_OPTIONS,
  SCHEDULED_TIME_DETAILS,
} from "../lib/prompts";
import { GET as getPromptsApi, POST as postPromptsApi } from "../app/api/prompts/route";
import {
  GET as getPromptByIdApi,
  PUT as putPromptByIdApi,
  DELETE as deletePromptByIdApi,
} from "../app/api/prompts/[id]/route";
import { POST as postRunPromptApi } from "../app/api/prompts/[id]/run/route";

test("Scheduled AI Prompt Time Options Validation (9am, 1pm, 5pm)", () => {
  // 3 Valid Options
  assert.equal(SCHEDULED_TIME_OPTIONS.length, 3);
  assert.deepEqual(Array.from(SCHEDULED_TIME_OPTIONS), ["9am", "1pm", "5pm"]);

  // isValidScheduledTime
  assert.equal(isValidScheduledTime("9am"), true);
  assert.equal(isValidScheduledTime("1pm"), true);
  assert.equal(isValidScheduledTime("5pm"), true);
  assert.equal(isValidScheduledTime("9AM"), true);
  assert.equal(isValidScheduledTime("3pm"), false);
  assert.equal(isValidScheduledTime("12am"), false);
  assert.equal(isValidScheduledTime(""), false);
  assert.equal(isValidScheduledTime(null), false);

  // normalizeScheduledTime
  assert.equal(normalizeScheduledTime("9am"), "9am");
  assert.equal(normalizeScheduledTime("09:00"), "9am");
  assert.equal(normalizeScheduledTime("9:00 AM"), "9am");
  assert.equal(normalizeScheduledTime("1pm"), "1pm");
  assert.equal(normalizeScheduledTime("13:00"), "1pm");
  assert.equal(normalizeScheduledTime("5pm"), "5pm");
  assert.equal(normalizeScheduledTime("17:00"), "5pm");

  // Invalid throws error
  assert.throws(() => normalizeScheduledTime("8am"), /Invalid scheduled time/);
  assert.throws(() => normalizeScheduledTime("midnight"), /Invalid scheduled time/);

  // Time details mapping
  assert.equal(SCHEDULED_TIME_DETAILS["9am"].period, "Morning");
  assert.equal(SCHEDULED_TIME_DETAILS["1pm"].period, "Afternoon");
  assert.equal(SCHEDULED_TIME_DETAILS["5pm"].period, "Evening");
});

test("ScheduledPromptService: Create prompts per user with 3 time options", async () => {
  await ScheduledPromptService.clearAll();

  const userA = "user_alpha_101";
  const userB = "user_beta_202";

  // Create prompt for User A at 9am
  const prompt9am = await ScheduledPromptService.createPrompt({
    userId: userA,
    userEmail: "alpha@marc.dev",
    prompt: "Zrekapituluj ranní strategii a priority dne.",
    scheduledTime: "9am",
    title: "Ranní brief",
    model: "gpt-4o-mini",
  });

  assert.ok(prompt9am.id.startsWith("prm_"));
  assert.equal(prompt9am.userId, userA);
  assert.equal(prompt9am.scheduledTime, "9am");
  assert.equal(prompt9am.title, "Ranní brief");
  assert.equal(prompt9am.isActive, true);

  // Create prompt for User A at 1pm
  const prompt1pm = await ScheduledPromptService.createPrompt({
    userId: userA,
    prompt: "Doporuč BJJ drill pro odpolední trénink.",
    scheduledTime: "1pm",
    title: "Odpolední BJJ Tip",
  });
  assert.equal(prompt1pm.scheduledTime, "1pm");

  // Create prompt for User A at 5pm
  const prompt5pm = await ScheduledPromptService.createPrompt({
    userId: userA,
    prompt: "Navrhni večerní regeneraci a strečink.",
    scheduledTime: "5pm",
    title: "Večerní regenerace",
  });
  assert.equal(prompt5pm.scheduledTime, "5pm");

  // Create prompt for User B at 9am
  const promptUserB = await ScheduledPromptService.createPrompt({
    userId: userB,
    prompt: "User B morning prompt.",
    scheduledTime: "9am",
  });
  assert.equal(promptUserB.userId, userB);

  // List prompts for User A
  const userAPrompts = await ScheduledPromptService.getPromptsByUser(userA);
  assert.equal(userAPrompts.length, 3, "User A should have exactly 3 prompts");

  // Filter User A prompts by time
  const userA9amOnly = await ScheduledPromptService.getPromptsByUser(userA, { scheduledTime: "9am" });
  assert.equal(userA9amOnly.length, 1);
  assert.equal(userA9amOnly[0].id, prompt9am.id);

  // Summary stats for User A
  const summaryA = await ScheduledPromptService.getSummary(userA);
  assert.equal(summaryA.total, 3);
  assert.equal(summaryA.active, 3);
  assert.equal(summaryA.paused, 0);
  assert.equal(summaryA.byTime["9am"], 1);
  assert.equal(summaryA.byTime["1pm"], 1);
  assert.equal(summaryA.byTime["5pm"], 1);

  // Summary stats for User B
  const summaryB = await ScheduledPromptService.getSummary(userB);
  assert.equal(summaryB.total, 1);
  assert.equal(summaryB.byTime["9am"], 1);
});

test("ScheduledPromptService: Update, Delete, and Execution", async () => {
  const userId = "user_gamma_303";

  const created = await ScheduledPromptService.createPrompt({
    userId,
    prompt: "Původní text promptu",
    scheduledTime: "9am",
    title: "Původní titulek",
  });

  // Update time from 9am to 5pm and change text
  const updated = await ScheduledPromptService.updatePrompt(created.id, userId, {
    scheduledTime: "5pm",
    prompt: "Aktualizovaný text promptu",
    title: "Nový titulek",
    isActive: false,
  });

  assert.equal(updated.scheduledTime, "5pm");
  assert.equal(updated.prompt, "Aktualizovaný text promptu");
  assert.equal(updated.title, "Nový titulek");
  assert.equal(updated.isActive, false);

  // Execute prompt immediately
  const execResult = await ScheduledPromptService.executePromptNow(created.id, userId);
  assert.ok(execResult.completion);
  assert.ok(execResult.prompt.lastRunAt);
  assert.equal(execResult.prompt.lastRunResult, execResult.completion);

  // Delete prompt
  const deleted = await ScheduledPromptService.deletePrompt(created.id, userId);
  assert.equal(deleted, true);

  const lookup = await ScheduledPromptService.getPromptById(created.id, userId);
  assert.equal(lookup, null);
});

test("API Routes: /api/prompts and /api/prompts/[id] integration", async () => {
  const testUserId = `test_api_user_${Date.now()}`;

  // 1. POST /api/prompts (Create)
  const createReq = new NextRequest("http://localhost:3000/api/prompts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": testUserId,
    },
    body: JSON.stringify({
      prompt: "Vytvoř motivační plán pro odpolední sparring.",
      scheduledTime: "1pm",
      title: "Odpolední sparring motivace",
    }),
  });

  const createRes = await postPromptsApi(createReq);
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.equal(createData.prompt.scheduledTime, "1pm");
  const promptId = createData.prompt.id;

  // 2. Reject invalid scheduled time in POST
  const badReq = new NextRequest("http://localhost:3000/api/prompts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": testUserId,
    },
    body: JSON.stringify({
      prompt: "Test",
      scheduledTime: "11pm",
    }),
  });
  const badRes = await postPromptsApi(badReq);
  assert.equal(badRes.status, 400);

  // 3. GET /api/prompts (List & Summary)
  const getReq = new NextRequest(`http://localhost:3000/api/prompts?userId=${testUserId}`);
  const getRes = await getPromptsApi(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.count, 1);
  assert.equal(getData.prompts[0].id, promptId);
  assert.equal(getData.summary.byTime["1pm"], 1);

  // 4. GET /api/prompts/[id]
  const getByIdReq = new NextRequest(`http://localhost:3000/api/prompts/${promptId}`, {
    headers: { "x-user-id": testUserId },
  });
  const getByIdRes = await getPromptByIdApi(getByIdReq, {
    params: Promise.resolve({ id: promptId }),
  });
  assert.equal(getByIdRes.status, 200);
  const getByIdData = await getByIdRes.json();
  assert.equal(getByIdData.prompt.id, promptId);

  // 5. PUT /api/prompts/[id]
  const putReq = new NextRequest(`http://localhost:3000/api/prompts/${promptId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": testUserId,
    },
    body: JSON.stringify({
      scheduledTime: "5pm",
      title: "Přesunuto na 5pm",
    }),
  });
  const putRes = await putPromptByIdApi(putReq, {
    params: Promise.resolve({ id: promptId }),
  });
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.prompt.scheduledTime, "5pm");

  // 6. POST /api/prompts/[id]/run
  const runReq = new NextRequest(`http://localhost:3000/api/prompts/${promptId}/run`, {
    method: "POST",
    headers: { "x-user-id": testUserId },
  });
  const runRes = await postRunPromptApi(runReq, {
    params: Promise.resolve({ id: promptId }),
  });
  assert.equal(runRes.status, 200);
  const runData = await runRes.json();
  assert.equal(runData.success, true);
  assert.ok(runData.completion);

  // 7. DELETE /api/prompts/[id]
  const deleteReq = new NextRequest(`http://localhost:3000/api/prompts/${promptId}`, {
    method: "DELETE",
    headers: { "x-user-id": testUserId },
  });
  const deleteRes = await deletePromptByIdApi(deleteReq, {
    params: Promise.resolve({ id: promptId }),
  });
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);
});
