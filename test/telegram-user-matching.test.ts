import test from "node:test";
import assert from "node:assert/strict";
import {
  SubscriberService,
  normalizeNameForMatch,
  parseFullName,
  isSubscriberNameMatch,
} from "../lib/telegram/subscribers";
import { TelegramService } from "../lib/telegram/service";
import { UserService } from "../lib/auth/userService";
import { ScheduledPromptService } from "../lib/prompts";
import { respondToTelegramUserByName } from "../lib/openai/service";

test("Telegram User Matching: normalizeNameForMatch & parseFullName", () => {
  // Whitespace and case normalization
  assert.equal(normalizeNameForMatch("  John  DOE  "), "john doe");

  // Czech diacritics stripping
  assert.equal(normalizeNameForMatch("Ondřej Mach"), "ondrej mach");
  assert.equal(normalizeNameForMatch("Tomáš Dvořák"), "tomas dvorak");
  assert.equal(normalizeNameForMatch("Eliška Černá"), "eliska cerna");

  // Empty / null inputs
  assert.equal(normalizeNameForMatch(""), "");
  assert.equal(normalizeNameForMatch(null), "");
  assert.equal(normalizeNameForMatch(undefined), "");

  // Full name parsing
  assert.deepEqual(parseFullName("Johan Smith"), { firstName: "Johan", lastName: "Smith" });
  assert.deepEqual(parseFullName("Ondřej Mach"), { firstName: "Ondřej", lastName: "Mach" });
  assert.deepEqual(parseFullName("Jan"), { firstName: "Jan", lastName: "" });
  assert.deepEqual(parseFullName("Jan Pavel Novak"), { firstName: "Jan", lastName: "Pavel Novak" });
  assert.deepEqual(parseFullName(""), { firstName: "", lastName: "" });
});

test("Telegram User Matching: isSubscriberNameMatch rules", () => {
  const sub = {
    chatId: 12345678,
    userId: 87654321,
    username: "ondramach",
    firstName: "Ondřej",
    lastName: "Mach",
    chatType: "private",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Exact match with both firstName and lastName
  assert.equal(isSubscriberNameMatch(sub, "Ondřej", "Mach"), true);
  assert.equal(isSubscriberNameMatch(sub, "ondrej", "mach"), true);
  assert.equal(isSubscriberNameMatch(sub, "Ondrej", "Mach"), true);

  // 2. Reversed match (Surname entered first)
  assert.equal(isSubscriberNameMatch(sub, "Mach", "Ondřej"), true);

  // 3. Combined full name string
  assert.equal(isSubscriberNameMatch(sub, "Ondřej Mach"), true);
  assert.equal(isSubscriberNameMatch(sub, "ondrej mach"), true);

  // 4. Match by username
  assert.equal(isSubscriberNameMatch(sub, "ondramach"), true);

  // 5. Non-matching names
  assert.equal(isSubscriberNameMatch(sub, "Petr", "Novák"), false);
  assert.equal(isSubscriberNameMatch(sub, "Ondřej", "Novák"), false);
  assert.equal(isSubscriberNameMatch(sub, "Karel"), false);
});

test("SubscriberService: Register subscribers and match by name and surname", async () => {
  await SubscriberService.clearAll();

  // Register subscribers
  const sub1 = await SubscriberService.registerChat({
    chatId: 1001,
    firstName: "Johan",
    lastName: "Smith",
    username: "johansmith",
  });

  const sub2 = await SubscriberService.registerChat({
    chatId: 1002,
    firstName: "Tomáš",
    lastName: "Dvořák",
    username: "tomas_d",
  });

  const sub3 = await SubscriberService.registerChat({
    chatId: 1003,
    firstName: "Jan",
    lastName: "Novák",
    username: "jannovak",
  });

  assert.equal(sub1.chatId, 1001);
  assert.equal(sub2.chatId, 1002);
  assert.equal(sub3.chatId, 1003);

  // Query by name and surname
  const matchJohan = await SubscriberService.findSubscriberByNameAndSurname("Johan", "Smith");
  assert.ok(matchJohan);
  assert.equal(matchJohan.chatId, 1001);

  // Query case-insensitive and without accents
  const matchTomas = await SubscriberService.findSubscriberByNameAndSurname("Tomas", "Dvorak");
  assert.ok(matchTomas);
  assert.equal(matchTomas.chatId, 1002);

  // Query reversed (surname first)
  const matchNovak = await SubscriberService.findSubscriberByNameAndSurname("Novák", "Jan");
  assert.ok(matchNovak);
  assert.equal(matchNovak.chatId, 1003);

  // Query by full name string
  const matchByFullName = await SubscriberService.findSubscriberByFullName("Johan Smith");
  assert.ok(matchByFullName);
  assert.equal(matchByFullName.chatId, 1001);

  // Match for user entity
  const matchUser = await SubscriberService.matchSubscriberForUser({
    id: "usr_1",
    name: "Tomáš Dvořák",
    email: "tomas@example.com",
  });
  assert.ok(matchUser);
  assert.equal(matchUser.chatId, 1002);

  // Non-existent subscriber returns null
  const noMatch = await SubscriberService.findSubscriberByNameAndSurname("Neznámý", "Uživatel");
  assert.equal(noMatch, null);
});

test("TelegramService: sendResponseToUserByName and sendAiPromptResponse using Johan Bot", async () => {
  await SubscriberService.clearAll();

  await SubscriberService.registerChat({
    chatId: 2001,
    firstName: "Johan",
    lastName: "Botter",
    username: "johan_b",
  });

  // 1. sendResponseToUserByName
  const res1 = await TelegramService.sendResponseToUserByName({
    name: "Johan",
    surname: "Botter",
    text: "Ahoj Johane, testovací zpráva z backendu.",
  });
  assert.equal(res1.success, true);
  assert.ok(res1.subscriber);
  assert.equal(res1.subscriber.chatId, 2001);

  // 2. sendAiPromptResponse
  const aiPromptRes = await TelegramService.sendAiPromptResponse({
    userName: "Johan Botter",
    promptTitle: "Ranní BJJ plán",
    promptText: "Připrav 3 hlavní priority pro dnešek.",
    completion: "1. Technika guard pass\n2. Strečink kyčlí\n3. Hydratace",
    scheduledTime: "9am",
  });
  assert.equal(aiPromptRes.success, true);
  assert.ok(aiPromptRes.subscriber);
  assert.equal(aiPromptRes.subscriber.chatId, 2001);
  assert.ok(aiPromptRes.formattedMessage.includes("Johan Bot AI Odpověď"));
  assert.ok(aiPromptRes.formattedMessage.includes("09:00 Ráno"));

  // 3. Unmatched user returns success: false with clear error message
  const unmatchedRes = await TelegramService.sendAiPromptResponse({
    userName: "Neznámý Člověk",
    completion: "Odpověď pro neznámého",
  });
  assert.equal(unmatchedRes.success, false);
  assert.equal(unmatchedRes.subscriber, undefined);
  assert.ok(unmatchedRes.error?.includes("Nebyl nalezen aktivní Telegram odběratel"));
});

test("OpenAI respondToTelegramUserByName integration", async () => {
  await SubscriberService.clearAll();

  await SubscriberService.registerChat({
    chatId: 3001,
    firstName: "Johan",
    lastName: "Tester",
    username: "johan_test",
  });

  const response = await respondToTelegramUserByName({
    name: "Johan",
    surname: "Tester",
    prompt: "Vymysli rychlou motivaci pro trénink.",
    scheduledTime: "1pm",
    promptTitle: "Odpolední motivace",
  });

  assert.ok(response.completion);
  assert.equal(response.telegramDelivery.sent, true);
  assert.ok(response.telegramDelivery.subscriber);
  assert.equal(response.telegramDelivery.subscriber.chatId, 3001);
  assert.equal(response.telegramDelivery.subscriber.firstName, "Johan");
  assert.equal(response.telegramDelivery.subscriber.lastName, "Tester");
});

test("ScheduledPromptService executePromptNow delivers response in Telegram to matched user", async () => {
  await SubscriberService.clearAll();
  await ScheduledPromptService.clearAll();

  // Create a user in UserService
  const authRes = await UserService.registerOrLoginGoogleUser({
    id: "google_johan_123",
    email: "johan.match@marc.dev",
    name: "Johan MatchedUser",
    emailVerified: true,
  });
  const createdUser = authRes.user;

  // Register matching Telegram subscriber
  await SubscriberService.registerChat({
    chatId: 4001,
    firstName: "Johan",
    lastName: "MatchedUser",
    username: "johan_matched",
  });

  // Create scheduled prompt for this user
  const prompt = await ScheduledPromptService.createPrompt({
    userId: createdUser.id,
    userEmail: createdUser.email,
    prompt: "Navrhni regenerační protokol na večer.",
    scheduledTime: "5pm",
    title: "Večerní regenerace",
  });

  // Execute prompt immediately
  const execResult = await ScheduledPromptService.executePromptNow(prompt.id, createdUser.id);

  assert.ok(execResult.completion);
  assert.ok(execResult.telegramDelivery);
  assert.equal(execResult.telegramDelivery.sent, true);
  assert.ok(execResult.telegramDelivery.subscriber);
  assert.equal(execResult.telegramDelivery.subscriber.chatId, 4001);
  assert.equal(execResult.telegramDelivery.subscriber.firstName, "Johan");
  assert.equal(execResult.telegramDelivery.subscriber.lastName, "MatchedUser");
});
