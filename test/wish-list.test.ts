import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  WishListService,
  normalizeWaitingPeriod,
  getWaitingPeriodDays,
  computeWishMetrics,
  WAITING_PERIOD_OPTIONS,
} from "../lib/wishlist";
import {
  GET as getWishListApi,
  POST as postWishListApi,
  DELETE as deleteWishListApi,
} from "../app/api/wish-list/route";
import {
  GET as getWishByIdApi,
  PUT as putWishByIdApi,
  DELETE as deleteWishByIdApi,
} from "../app/api/wish-list/[id]/route";
import { POST as postIncrementWishApi } from "../app/api/wish-list/[id]/increment/route";
import { POST as postNotifyWishApi } from "../app/api/wish-list/[id]/notify/route";
import {
  GET as getWishListCronApi,
  POST as postWishListCronApi,
} from "../app/api/cron/wishlist/route";
import { UserTelegramSettingsService } from "../lib/telegram/userSettings";

test("Wish List: Waiting period options, normalization and day calculations", () => {
  // Check available options
  assert.equal(WAITING_PERIOD_OPTIONS.length, 3);
  assert.deepEqual(
    WAITING_PERIOD_OPTIONS.map((o) => o.value),
    ["1week", "2weeks", "1month"]
  );

  // Day mappings: 1 week = 7 days, 2 weeks = 14 days, 1 month = 30 days
  assert.equal(getWaitingPeriodDays("1week"), 7);
  assert.equal(getWaitingPeriodDays("2weeks"), 14);
  assert.equal(getWaitingPeriodDays("1month"), 30);

  // Normalization logic
  assert.equal(normalizeWaitingPeriod("1week"), "1week");
  assert.equal(normalizeWaitingPeriod("1 week"), "1week");
  assert.equal(normalizeWaitingPeriod("1_week"), "1week");
  assert.equal(normalizeWaitingPeriod("1w"), "1week");

  assert.equal(normalizeWaitingPeriod("2weeks"), "2weeks");
  assert.equal(normalizeWaitingPeriod("2 weeks"), "2weeks");
  assert.equal(normalizeWaitingPeriod("2_weeks"), "2weeks");
  assert.equal(normalizeWaitingPeriod("2w"), "2weeks");

  assert.equal(normalizeWaitingPeriod("1month"), "1month");
  assert.equal(normalizeWaitingPeriod("1 month"), "1month");
  assert.equal(normalizeWaitingPeriod("1_month"), "1month");
  assert.equal(normalizeWaitingPeriod("1m"), "1month");

  assert.equal(normalizeWaitingPeriod(null), "1week");
  assert.equal(normalizeWaitingPeriod(""), "1week");
});

test("Wish List: Metric computation, target date, remaining time and counter progress", () => {
  const baseTime = new Date("2026-11-16T12:00:00.000Z");
  const dummyWish = {
    id: "wish_test_1",
    userId: "user_test_1",
    name: "Noise-Cancelling Headphones",
    description: "For deep focus work",
    waitingPeriod: "2weeks" as const, // 14 days
    counter: 3,
    maxCounter: 10,
    createdAt: baseTime.toISOString(),
    updatedAt: baseTime.toISOString(),
  };

  // At creation time: target date is 14 days later, 14 days remaining, 0% period progress, 30% counter progress
  const startMetrics = computeWishMetrics(dummyWish, baseTime);
  assert.equal(startMetrics.daysTotal, 14);
  assert.equal(startMetrics.daysRemaining, 14);
  assert.equal(startMetrics.daysElapsed, 0);
  assert.equal(startMetrics.isPeriodCompleted, false);
  assert.equal(startMetrics.periodProgressPercentage, 0);
  assert.equal(startMetrics.counter, 3);
  assert.equal(startMetrics.maxCounter, 10);
  assert.equal(startMetrics.isCounterReached, false);
  assert.equal(startMetrics.counterProgressPercentage, 30);

  const expectedTargetDate = new Date(baseTime.getTime() + 14 * 86400 * 1000).toISOString();
  assert.equal(startMetrics.targetDate, expectedTargetDate);

  // After 7 days: 50% period progress, 7 days remaining
  const halfTime = new Date(baseTime.getTime() + 7 * 86400 * 1000);
  const halfMetrics = computeWishMetrics(dummyWish, halfTime);
  assert.equal(halfMetrics.daysElapsed, 7);
  assert.equal(halfMetrics.daysRemaining, 7);
  assert.equal(halfMetrics.isPeriodCompleted, false);
  assert.equal(halfMetrics.periodProgressPercentage, 50);

  // After 14 days: 100% period progress, 0 days remaining, period completed
  const completedTime = new Date(baseTime.getTime() + 14 * 86400 * 1000);
  const completedMetrics = computeWishMetrics(dummyWish, completedTime);
  assert.equal(completedMetrics.daysElapsed, 14);
  assert.equal(completedMetrics.daysRemaining, 0);
  assert.equal(completedMetrics.isPeriodCompleted, true);
  assert.equal(completedMetrics.periodProgressPercentage, 100);

  // Counter reached maximum
  const maxCounterWish = { ...dummyWish, counter: 10 };
  const maxMetrics = computeWishMetrics(maxCounterWish, baseTime);
  assert.equal(maxMetrics.isCounterReached, true);
  assert.equal(maxMetrics.counterProgressPercentage, 100);
});

test("WishListService: CRUD lifecycle, metadata persistence and user isolation", async () => {
  await WishListService.clearAll();

  const userA = "user_alice_wish";
  const userB = "user_bob_wish";

  // 1. Create wishes for User A
  const wishA1 = await WishListService.createWish({
    userId: userA,
    name: "Standup Desk",
    description: "Electric height adjustable desk",
    waitingPeriod: "1month",
    counter: 0,
    maxCounter: 5,
  });

  assert.ok(wishA1.id.startsWith("wish_"));
  assert.equal(wishA1.userId, userA);
  assert.equal(wishA1.name, "Standup Desk");
  assert.equal(wishA1.description, "Electric height adjustable desk");
  assert.equal(wishA1.waitingPeriod, "1month");
  assert.equal(wishA1.counter, 0);
  assert.equal(wishA1.maxCounter, 5);
  assert.ok(wishA1.createdAt);
  assert.ok(wishA1.targetDate);

  const wishA2 = await WishListService.createWish({
    userId: userA,
    name: "Mechanical Keyboard",
    description: "Split ergonomic layout",
    waitingPeriod: "1week",
    counter: 2,
    maxCounter: 3,
  });

  // 2. Create wish for User B
  const wishB1 = await WishListService.createWish({
    userId: userB,
    name: "4K Monitor",
    waitingPeriod: "2weeks",
  });

  // 3. User isolation check: User A list has 2 items, User B list has 1 item
  const listA = await WishListService.getWishesByUser(userA);
  assert.equal(listA.length, 2);
  const idsA = listA.map((w) => w.id);
  assert.ok(idsA.includes(wishA1.id));
  assert.ok(idsA.includes(wishA2.id));

  const listB = await WishListService.getWishesByUser(userB);
  assert.equal(listB.length, 1);
  assert.equal(listB[0].name, "4K Monitor");

  // User B cannot access User A's wish directly
  const unauthorizedFetch = await WishListService.getWishById(wishA1.id, userB);
  assert.equal(unauthorizedFetch, null);

  // 4. Update wish (modify name, description, waiting period, counter, maxCounter)
  const updatedWishA1 = await WishListService.updateWish(
    wishA1.id,
    {
      name: "Smart Standup Desk Pro",
      description: "Updated with memory presets",
      waitingPeriod: "2weeks",
      maxCounter: 8,
    },
    userA
  );

  assert.ok(updatedWishA1);
  assert.equal(updatedWishA1?.name, "Smart Standup Desk Pro");
  assert.equal(updatedWishA1?.description, "Updated with memory presets");
  assert.equal(updatedWishA1?.waitingPeriod, "2weeks");
  assert.equal(updatedWishA1?.maxCounter, 8);
  assert.equal(updatedWishA1?.counter, 0);

  // 5. Increment counter +1
  const inc1 = await WishListService.incrementCounter(wishA1.id, userA, 1);
  assert.equal(inc1?.counter, 1);

  const inc2 = await WishListService.incrementCounter(wishA1.id, userA, 1);
  assert.equal(inc2?.counter, 2);

  // 6. Summary metrics
  const summaryA = await WishListService.getSummary(userA);
  assert.equal(summaryA.total, 2);
  assert.equal(summaryA.waiting, 2);
  assert.equal(summaryA.completed, 0);

  // 7. Delete wish
  const deleteResult = await WishListService.deleteWish(wishA2.id, userA);
  assert.equal(deleteResult, true);

  const listAAfterDelete = await WishListService.getWishesByUser(userA);
  assert.equal(listAAfterDelete.length, 1);
  assert.equal(listAAfterDelete[0].id, wishA1.id);
});

test("Wish List API Endpoints: /api/wish-list, /api/wish-list/[id], and /api/wish-list/[id]/increment", async () => {
  await WishListService.clearAll();

  const testUserId = "api_user_wish_007";

  // 1. POST /api/wish-list (validation error on missing name)
  const invalidReq = new NextRequest("http://localhost:3000/api/wish-list", {
    method: "POST",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({ name: "   " }),
  });
  const invalidRes = await postWishListApi(invalidReq);
  assert.equal(invalidRes.status, 400);

  // 2. POST /api/wish-list (create new wish)
  const createReq = new NextRequest("http://localhost:3000/api/wish-list", {
    method: "POST",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Ultra-wide Curved Display",
      description: "34 inch 144Hz for productivity and gaming",
      waitingPeriod: "2weeks",
      counter: 1,
      maxCounter: 6,
    }),
  });
  const createRes = await postWishListApi(createReq);
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.ok(createData.wish.id);
  assert.equal(createData.wish.name, "Ultra-wide Curved Display");
  assert.equal(createData.wish.waitingPeriod, "2weeks");
  assert.equal(createData.wish.counter, 1);
  assert.equal(createData.wish.maxCounter, 6);
  assert.ok(createData.wish.createdAt);

  const wishId = createData.wish.id;

  // 3. GET /api/wish-list
  const getReq = new NextRequest("http://localhost:3000/api/wish-list", {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const getRes = await getWishListApi(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.equal(getData.count, 1);
  assert.equal(getData.wishes[0].id, wishId);
  assert.equal(getData.summary.total, 1);

  // 4. GET /api/wish-list/[id]
  const getByIdReq = new NextRequest(`http://localhost:3000/api/wish-list/${wishId}`, {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const getByIdRes = await getWishByIdApi(getByIdReq, {
    params: Promise.resolve({ id: wishId }),
  });
  assert.equal(getByIdRes.status, 200);
  const getByIdData = await getByIdRes.json();
  assert.equal(getByIdData.wish.id, wishId);

  // 5. POST /api/wish-list/[id]/increment (Increase counter +1)
  const incReq = new NextRequest(`http://localhost:3000/api/wish-list/${wishId}/increment`, {
    method: "POST",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({ amount: 1 }),
  });
  const incRes = await postIncrementWishApi(incReq, {
    params: Promise.resolve({ id: wishId }),
  });
  assert.equal(incRes.status, 200);
  const incData = await incRes.json();
  assert.equal(incData.success, true);
  assert.equal(incData.wish.counter, 2);

  // 6. PUT /api/wish-list/[id] (Edit name, description, waitingPeriod, and maxCounter)
  const putReq = new NextRequest(`http://localhost:3000/api/wish-list/${wishId}`, {
    method: "PUT",
    headers: { "x-user-id": testUserId, "content-type": "application/json" },
    body: JSON.stringify({
      name: "Ultra-wide Curved OLED Display",
      waitingPeriod: "1month",
      maxCounter: 10,
    }),
  });
  const putRes = await putWishByIdApi(putReq, {
    params: Promise.resolve({ id: wishId }),
  });
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.wish.name, "Ultra-wide Curved OLED Display");
  assert.equal(putData.wish.waitingPeriod, "1month");
  assert.equal(putData.wish.maxCounter, 10);
  assert.equal(putData.wish.counter, 2);

  // 7. DELETE /api/wish-list/[id]
  const delReq = new NextRequest(`http://localhost:3000/api/wish-list/${wishId}`, {
    method: "DELETE",
    headers: { "x-user-id": testUserId },
  });
  const delRes = await deleteWishByIdApi(delReq, {
    params: Promise.resolve({ id: wishId }),
  });
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.success, true);

  // Confirm deleted
  const getAfterDelReq = new NextRequest("http://localhost:3000/api/wish-list", {
    method: "GET",
    headers: { "x-user-id": testUserId },
  });
  const getAfterDelRes = await getWishListApi(getAfterDelReq);
  const getAfterDelData = await getAfterDelRes.json();
  assert.equal(getAfterDelData.count, 0);
});

test("Wish List Telegram Notification: notify on waiting period elapsed and duplicate prevention", async () => {
  await WishListService.clearAll();

  const user = "user_telegram_notify_test";
  await UserTelegramSettingsService.saveSettings(user, {
    telegramId: "987654321",
    notificationsEnabled: true,
  });

  const now = new Date();
  // 1. Create a wish created 8 days ago with 1week (7 days) waiting period -> period completed!
  const pastDate = new Date(now.getTime() - 8 * 86400 * 1000).toISOString();
  const wishPassed = await WishListService.createWish({
    userId: user,
    name: "Mechanical Keyboard (Custom 75%)",
    description: "Waiting period elapsed",
    waitingPeriod: "1week",
    counter: 5,
    maxCounter: 5,
    notifyTelegram: true,
    createdAt: pastDate,
  });

  assert.equal(wishPassed.isPeriodCompleted, true);
  assert.equal(wishPassed.notificationSentAt, undefined);

  // 2. Create another wish created today with 2weeks waiting period -> period NOT completed
  const wishActive = await WishListService.createWish({
    userId: user,
    name: "MacBook Pro M4 Max",
    description: "Still waiting",
    waitingPeriod: "2weeks",
    counter: 1,
    maxCounter: 10,
    notifyTelegram: true,
  });

  assert.equal(wishActive.isPeriodCompleted, false);

  // 3. Test checkAndSendDueNotifications: only wishPassed should be notified
  const cronRun1 = await WishListService.checkAndSendDueNotifications({
    timeSlot: "12pm",
  });

  assert.equal(cronRun1.sent, 1);
  assert.equal(cronRun1.errors.length, 0);

  // Verify wishPassed now has notificationSentAt recorded
  const reloadedPassed = await WishListService.getWishById(wishPassed.id, user);
  assert.ok(reloadedPassed?.notificationSentAt);

  // 4. Run checkAndSendDueNotifications again: duplicate notifications must be prevented!
  const cronRun2 = await WishListService.checkAndSendDueNotifications({
    timeSlot: "12pm",
  });
  assert.equal(cronRun2.sent, 0, "Should not re-notify already notified wishes");

  // 5. Test manual notify endpoint /api/wish-list/[id]/notify
  const notifyReq = new NextRequest(
    `http://localhost:3000/api/wish-list/${wishPassed.id}/notify`,
    {
      method: "POST",
      headers: { "x-user-id": user },
    }
  );
  const notifyRes = await postNotifyWishApi(notifyReq, {
    params: Promise.resolve({ id: wishPassed.id }),
  });
  assert.equal(notifyRes.status, 200);
  const notifyData = await notifyRes.json();
  assert.equal(notifyData.success, true);
  assert.equal(notifyData.message, "Telegram notification delivered successfully.");
});

test("Wish List Vercel Cron Task: /api/cron/wishlist with optional 12am/12pm noon parameter", async () => {
  await WishListService.clearAll();

  const user = "cron_wishlist_user";
  await UserTelegramSettingsService.saveSettings(user, {
    telegramId: "123456789",
    notificationsEnabled: true,
  });

  // Create an expired wish item
  const pastDate = new Date(Date.now() - 10 * 86400 * 1000).toISOString();
  await WishListService.createWish({
    userId: user,
    name: "4K OLED Monitor",
    description: "Vercel task cron notification test",
    waitingPeriod: "1week",
    createdAt: pastDate,
  });

  // Test GET /api/cron/wishlist with optional time=12am parameter
  const getCronReq12am = new NextRequest(
    "http://localhost:3000/api/cron/wishlist?time=12am",
    {
      method: "GET",
    }
  );
  const getCronRes12am = await getWishListCronApi(getCronReq12am);
  assert.equal(getCronRes12am.status, 200);
  const getCronData12am = await getCronRes12am.json();
  assert.equal(getCronData12am.success, true);
  assert.equal(getCronData12am.scheduler, "Vercel Cron / Task Scheduler");
  assert.equal(getCronData12am.time, "12am");
  assert.equal(getCronData12am.result.sent, 1);

  // Test POST /api/cron/wishlist with optional time=12pm (noon) parameter
  const postCronReq12pm = new NextRequest(
    "http://localhost:3000/api/cron/wishlist?time=12pm",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ time: "12pm" }),
    }
  );
  const postCronRes12pm = await postWishListCronApi(postCronReq12pm);
  assert.equal(postCronRes12pm.status, 200);
  const postCronData12pm = await postCronRes12pm.json();
  assert.equal(postCronData12pm.success, true);
  assert.equal(postCronData12pm.time, "12pm");
  assert.equal(postCronData12pm.result.sent, 0); // Already notified
});
