import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  TrackingService,
  calculateTotalDurationSeconds,
  computeTrackerMetrics,
} from "../lib/tracking";
import { GET as getTrackingApi, POST as postTrackingApi, DELETE as deleteTrackingApi } from "../app/api/tracking/route";
import {
  GET as getTrackerByIdApi,
  PUT as putTrackerByIdApi,
  DELETE as deleteTrackerByIdApi,
} from "../app/api/tracking/[id]/route";
import { POST as postResetTrackerApi } from "../app/api/tracking/[id]/reset/route";
import { GET as getTrackerResetsApi } from "../app/api/tracking/[id]/resets/route";
import { POST as postNotifyTrackerApi } from "../app/api/tracking/[id]/notify/route";
import { GET as getCronTrackersApi } from "../app/api/cron/trackers/route";

test("Tracking: Duration calculations and conversion helpers", () => {
  // 0 days, 0 hours, 0 minutes
  assert.equal(calculateTotalDurationSeconds(0, 0, 0), 0);

  // 15 minutes = 900 seconds
  assert.equal(calculateTotalDurationSeconds(0, 0, 15), 900);

  // 2 hours = 7200 seconds
  assert.equal(calculateTotalDurationSeconds(0, 2, 0), 7200);

  // 1 day = 86400 seconds
  assert.equal(calculateTotalDurationSeconds(1, 0, 0), 86400);

  // 2 days, 3 hours, 45 minutes = 2*86400 + 3*3600 + 45*60 = 172800 + 10800 + 2700 = 186300 seconds
  assert.equal(calculateTotalDurationSeconds(2, 3, 45), 186300);

  // Negative values clamped to 0
  assert.equal(calculateTotalDurationSeconds(-1, -5, 30), 1800);
});

test("Tracking: Metric computation and progress percentage (remaining from 100% to 0%)", () => {
  const baseTime = new Date("2026-11-16T10:00:00.000Z");
  const dummyTracker = {
    id: "trk_test_1",
    userId: "user_test_1",
    name: "Air Filter",
    durationDays: 0,
    durationHours: 2,
    durationMinutes: 0,
    totalDurationSeconds: 7200, // 2 hours
    notifyTelegram: false,
    lastResetAt: baseTime.toISOString(),
    createdAt: baseTime.toISOString(),
    updatedAt: baseTime.toISOString(),
  };

  // At start (0 elapsed) -> 100% remaining (Red color), 0 overflow
  const startMetrics = computeTrackerMetrics(dummyTracker, baseTime);
  assert.equal(startMetrics.elapsedSeconds, 0);
  assert.equal(startMetrics.remainingSeconds, 7200);
  assert.equal(startMetrics.overflowSeconds, 0);
  assert.equal(startMetrics.overflowPercentage, 0);
  assert.equal(startMetrics.progressPercentage, 100);
  assert.equal(startMetrics.isCompleted, false);

  // After 1 hour (3600 sec) -> 50% remaining (Amber color), 0 overflow
  const halfTime = new Date(baseTime.getTime() + 3600 * 1000);
  const halfMetrics = computeTrackerMetrics(dummyTracker, halfTime);
  assert.equal(halfMetrics.elapsedSeconds, 3600);
  assert.equal(halfMetrics.remainingSeconds, 3600);
  assert.equal(halfMetrics.overflowSeconds, 0);
  assert.equal(halfMetrics.overflowPercentage, 0);
  assert.equal(halfMetrics.progressPercentage, 50);
  assert.equal(halfMetrics.isCompleted, false);

  // After 2 hours (7200 sec) -> 0% remaining (Green color / Target Reached), 0 overflow
  const fullTime = new Date(baseTime.getTime() + 7200 * 1000);
  const fullMetrics = computeTrackerMetrics(dummyTracker, fullTime);
  assert.equal(fullMetrics.elapsedSeconds, 7200);
  assert.equal(fullMetrics.remainingSeconds, 0);
  assert.equal(fullMetrics.overflowSeconds, 0);
  assert.equal(fullMetrics.overflowPercentage, 0);
  assert.equal(fullMetrics.progressPercentage, 0);
  assert.equal(fullMetrics.isCompleted, true);

  // After 3 hours (10800 sec / overdue) -> 0% remaining (Green color), 3600 sec (1 hour) overflow (50% overflow)
  const overTime = new Date(baseTime.getTime() + 10800 * 1000);
  const overMetrics = computeTrackerMetrics(dummyTracker, overTime);
  assert.equal(overMetrics.elapsedSeconds, 10800);
  assert.equal(overMetrics.remainingSeconds, 0);
  assert.equal(overMetrics.overflowSeconds, 3600);
  assert.equal(overMetrics.overflowPercentage, 50);
  assert.equal(overMetrics.progressPercentage, 0);
  assert.equal(overMetrics.isCompleted, true);
});

test("TrackingService: CRUD lifecycle and per-user privacy isolation", async () => {
  await TrackingService.clearAll();

  const userA = "user_alpha_99";
  const userB = "user_beta_88";

  // 1. Create tracker for User A
  const trackerA1 = await TrackingService.createTracker({
    userId: userA,
    name: "Hydration & Electrolyte Intake",
    durationDays: 0,
    durationHours: 3,
    durationMinutes: 30,
    notifyTelegram: true,
  });

  assert.ok(trackerA1.id.startsWith("trk_"));
  assert.equal(trackerA1.userId, userA);
  assert.equal(trackerA1.name, "Hydration & Electrolyte Intake");
  assert.equal(trackerA1.durationDays, 0);
  assert.equal(trackerA1.durationHours, 3);
  assert.equal(trackerA1.durationMinutes, 30);
  assert.equal(trackerA1.totalDurationSeconds, 3 * 3600 + 30 * 60);
  assert.equal(trackerA1.notifyTelegram, true);

  // 2. Create second tracker for User A
  const trackerA2 = await TrackingService.createTracker({
    userId: userA,
    name: "BJJ Gi Washing & Maintenance",
    durationDays: 2,
    durationHours: 0,
    durationMinutes: 0,
    notifyTelegram: false,
  });

  // 3. Create tracker for User B
  const trackerB1 = await TrackingService.createTracker({
    userId: userB,
    name: "Server Backup Verification",
    durationDays: 7,
    durationHours: 0,
    durationMinutes: 0,
    notifyTelegram: true,
  });

  // 4. Verify User A only sees their own trackers
  const userATrackers = await TrackingService.getTrackersByUser(userA);
  assert.equal(userATrackers.length, 2);
  assert.deepEqual(
    userATrackers.map((t) => t.id).sort(),
    [trackerA1.id, trackerA2.id].sort()
  );

  // 5. Verify User B only sees their own trackers
  const userBTrackers = await TrackingService.getTrackersByUser(userB);
  assert.equal(userBTrackers.length, 1);
  assert.equal(userBTrackers[0].id, trackerB1.id);

  // 6. User B cannot access User A's tracker by ID (Isolation)
  const crossUserLookup = await TrackingService.getTrackerById(trackerA1.id, userB);
  assert.equal(crossUserLookup, null);

  // 7. Update tracker for User A
  const updatedA1 = await TrackingService.updateTracker(trackerA1.id, userA, {
    name: "Hydration & Mobility Routine",
    durationHours: 4,
  });
  assert.equal(updatedA1.name, "Hydration & Mobility Routine");
  assert.equal(updatedA1.durationHours, 4);
  assert.equal(updatedA1.totalDurationSeconds, 4 * 3600 + 30 * 60);

  // 8. User B cannot update User A's tracker
  await assert.rejects(
    async () => {
      await TrackingService.updateTracker(trackerA1.id, userB, { name: "Hacked" });
    },
    /not found or access denied/
  );

  // 9. Summary for User A
  const summaryA = await TrackingService.getSummary(userA);
  assert.equal(summaryA.total, 2);
  assert.equal(summaryA.telegramEnabled, 1);
});

test("TrackingService: Reset action, logging, and history audit", async () => {
  await TrackingService.clearAll();

  const userId = "user_tracker_tester";
  const tracker = await TrackingService.createTracker({
    userId,
    name: "Plant Moisture Cycle",
    durationDays: 3,
    durationHours: 0,
    durationMinutes: 0,
    notifyTelegram: false,
  });

  // Initial resets count is 0
  const initialLogs = await TrackingService.getResetLogs(tracker.id, userId);
  assert.equal(initialLogs.length, 0);

  // First Reset with Note
  const { tracker: reset1Tracker, resetLog: log1 } = await TrackingService.resetTracker(
    tracker.id,
    userId,
    { note: "Watered plants with fertilizer mix" }
  );

  assert.ok(log1.id.startsWith("rst_"));
  assert.equal(log1.trackerId, tracker.id);
  assert.equal(log1.userId, userId);
  assert.equal(log1.note, "Watered plants with fertilizer mix");
  assert.equal(reset1Tracker.resetsCount, 1);

  // Second Reset
  const { tracker: reset2Tracker, resetLog: log2 } = await TrackingService.resetTracker(
    tracker.id,
    userId,
    { note: "Quick moisture check reset" }
  );

  assert.ok(log2.id.startsWith("rst_"));
  assert.equal(reset2Tracker.resetsCount, 2);

  // Retrieve logs list
  const allLogs = await TrackingService.getResetLogs(tracker.id, userId);
  assert.equal(allLogs.length, 2);
  assert.equal(allLogs[0].id, log2.id); // Latest first
  assert.equal(allLogs[1].id, log1.id);
});

test("Tracking API Endpoints: /api/tracking, /api/tracking/[id], and /api/tracking/[id]/reset", async () => {
  await TrackingService.clearAll();

  const testUserId = "user_api_123";

  // 1. POST /api/tracking (Create Tracker)
  const createReq = new NextRequest("http://localhost:3000/api/tracking", {
    method: "POST",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Coffee Machine Descaling",
      durationDays: 30,
      durationHours: 0,
      durationMinutes: 0,
      notifyTelegram: true,
    }),
  });

  const createRes = await postTrackingApi(createReq);
  assert.equal(createRes.status, 201);
  const createJson = await createRes.json();
  assert.equal(createJson.success, true);
  assert.ok(createJson.tracker.id);
  const trackerId = createJson.tracker.id;

  // 2. GET /api/tracking (List Trackers)
  const listReq = new NextRequest("http://localhost:3000/api/tracking", {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const listRes = await getTrackingApi(listReq);
  assert.equal(listRes.status, 200);
  const listJson = await listRes.json();
  assert.equal(listJson.success, true);
  assert.equal(listJson.count, 1);
  assert.equal(listJson.trackers[0].name, "Coffee Machine Descaling");

  // 3. GET /api/tracking/[id]
  const getByIdReq = new NextRequest(`http://localhost:3000/api/tracking/${trackerId}`, {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const getByIdRes = await getTrackerByIdApi(getByIdReq, {
    params: Promise.resolve({ id: trackerId }),
  });
  assert.equal(getByIdRes.status, 200);
  const getByIdJson = await getByIdRes.json();
  assert.equal(getByIdJson.tracker.name, "Coffee Machine Descaling");

  // 4. POST /api/tracking/[id]/reset (Execute Reset)
  const resetReq = new NextRequest(`http://localhost:3000/api/tracking/${trackerId}/reset`, {
    method: "POST",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({ note: "Performed full descaling cycle" }),
  });
  const resetRes = await postResetTrackerApi(resetReq, {
    params: Promise.resolve({ id: trackerId }),
  });
  assert.equal(resetRes.status, 200);
  const resetJson = await resetRes.json();
  assert.equal(resetJson.success, true);
  assert.equal(resetJson.resetLog.note, "Performed full descaling cycle");

  // 5. GET /api/tracking/[id]/resets (Retrieve Reset Logs)
  const resetsReq = new NextRequest(`http://localhost:3000/api/tracking/${trackerId}/resets`, {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const resetsRes = await getTrackerResetsApi(resetsReq, {
    params: Promise.resolve({ id: trackerId }),
  });
  assert.equal(resetsRes.status, 200);
  const resetsJson = await resetsRes.json();
  assert.equal(resetsJson.count, 1);
  assert.equal(resetsJson.resets[0].note, "Performed full descaling cycle");

  // 6. POST /api/tracking/[id]/notify (Telegram trigger)
  const notifyReq = new NextRequest(`http://localhost:3000/api/tracking/${trackerId}/notify`, {
    method: "POST",
    headers: { "x-user-id": testUserId },
  });
  // Since testUserId may not have telegram configured yet, returns 400 with helpful error or 200
  const notifyRes = await postNotifyTrackerApi(notifyReq, {
    params: Promise.resolve({ id: trackerId }),
  });
  const notifyJson = await notifyRes.json();
  assert.ok(notifyRes.status === 200 || notifyRes.status === 400);
  if (notifyRes.status === 400) {
    assert.match(notifyJson.error, /No configured Telegram ID/);
  }

  // 7. DELETE /api/tracking/[id]
  const deleteReq = new NextRequest(`http://localhost:3000/api/tracking/${trackerId}`, {
    method: "DELETE",
    headers: { "x-user-id": testUserId },
  });
  const deleteRes = await deleteTrackerByIdApi(deleteReq, {
    params: Promise.resolve({ id: trackerId }),
  });
  assert.equal(deleteRes.status, 200);

  // 8. Confirm Deleted
  const afterDeleteReq = new NextRequest("http://localhost:3000/api/tracking", {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const afterDeleteRes = await getTrackingApi(afterDeleteReq);
  const afterDeleteJson = await afterDeleteRes.json();
  assert.equal(afterDeleteJson.count, 0);
});

test("Tracking: Scheduled cron job checks completed trackers and handles reset notifications", async () => {
  await TrackingService.clearAll();

  const testUserId = "user_cron_test";
  const pastDate = new Date(Date.now() - 3600 * 1000 * 5); // 5 hours ago

  // 1. Create a tracker configured for 1 hour duration started 5 hours ago (completed)
  const tracker = await TrackingService.createTracker({
    userId: testUserId,
    name: "HVAC Filter Inspection",
    durationDays: 0,
    durationHours: 1,
    durationMinutes: 0,
    notifyTelegram: true,
  });

  // Manually backdate lastResetAt to simulate completion
  await TrackingService.updateTracker(tracker.id, testUserId, {
    lastResetAt: pastDate.toISOString(),
  });

  // 2. Invoke cron endpoint
  const cronReq = new NextRequest("http://localhost:3000/api/cron/trackers", {
    method: "GET",
  });
  const cronRes = await getCronTrackersApi(cronReq);
  assert.equal(cronRes.status, 200);
  const cronJson = await cronRes.json();
  assert.equal(cronJson.success, true);
  assert.equal(cronJson.result.checked, 1);

  // 3. Reset tracker: verify reset clears notificationSentAt
  const { tracker: resetTracker } = await TrackingService.resetTracker(tracker.id, testUserId, {
    note: "Filter inspected and replaced",
  });
  assert.equal(resetTracker.notificationSentAt, undefined);
  assert.equal(resetTracker.isCompleted, false);
});
