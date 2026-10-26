import { InlineKeyboard } from "grammy";
import { BotContext } from "../types";
import { MessageService } from "../messages";
import { TaskService } from "./taskHandler";
import { executeWhereCommand } from "./commandHandler";
import { setUserState, clearUserState } from "../userState";

/**
 * Creates the inline keyboard menu with primary action buttons.
 */
export function createMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🥊 Kde dnes trénovat", "menu:where")
    .text("🧮 Spočítat úlohu", "menu:calculate");
}

/**
 * Sends the interactive main menu to the user.
 */
export async function sendMainMenu(
  ctx: BotContext,
  introText?: string
): Promise<void> {
  const text =
    introText ||
    "👋 *Hlavní nabídka*\n\nVyberte prosím akci:";

  const keyboard = createMainMenuKeyboard();

  try {
    const sent = await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    if (ctx.chat?.id) {
      MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: ctx.chat.id,
        userId: ctx.me?.id,
        username: ctx.me?.username,
        firstName: ctx.me?.first_name,
        chatType: ctx.chat.type,
        text,
        direction: "outgoing",
        messageType: "menu",
        rawPayload: sent,
      }).catch((err) => {
        console.error("[MenuHandler] Error logging menu message:", err);
      });
    }
  } catch (error) {
    console.error("[MenuHandler] Error sending main menu:", error);
  }
}

/**
 * Handles callback queries coming from the main menu inline buttons.
 */
export async function handleMenuCallbackQuery(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith("menu:")) return;

  const action = data.replace(/^menu:/, "");
  const chatId = ctx.chat?.id || ctx.from?.id || 0;

  if (action === "where") {
    await ctx.answerCallbackQuery({ text: "Načítám rozvrh tréninků..." });
    await executeWhereCommand(ctx);
  } else if (action === "calculate") {
    setUserState(chatId, {
      state: "awaiting_task_input",
      timestamp: Date.now(),
    });

    await ctx.answerCallbackQuery({ text: "Zadejte data pro výpočet úlohy" });

    const promptText =
      "🧮 *Výpočet úlohy*\n\n" +
      "Prosím zadejte **vstupní data** pro výpočet úlohy (např. parametry, text zadání, čísla nebo konfiguraci):\n\n" +
      "_Vaše následující zpráva bude zpracována jako vstup pro výpočet._";

    const sent = await ctx.reply(promptText, {
      parse_mode: "Markdown",
    });

    if (ctx.chat?.id) {
      MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: ctx.chat.id,
        userId: ctx.me?.id,
        username: ctx.me?.username,
        firstName: ctx.me?.first_name,
        chatType: ctx.chat.type,
        text: promptText,
        direction: "outgoing",
        messageType: "task_prompt",
        rawPayload: sent,
      }).catch((err) => {
        console.error("[MenuHandler] Error logging task prompt message:", err);
      });
    }
  }
}

/**
 * Evaluates user input and returns a mocked calculation result.
 */
export async function executeMockedTaskCalculation(
  ctx: BotContext,
  inputText: string
): Promise<void> {
  const chatId = ctx.chat?.id || 0;
  const user = ctx.from;
  const userId = user?.id || 0;
  const username = user?.username || user?.first_name || "User";

  // Ensure state is cleared once input is consumed
  clearUserState(chatId);

  // Compute mocked calculation metrics
  const cleanInput = inputText.trim();
  const wordCount = cleanInput.split(/\s+/).filter(Boolean).length;
  const charCount = cleanInput.length;
  const extractedNumbers = cleanInput.match(/-?\d+(?:\.\d+)?/g) || [];
  const durationMs = Math.floor(25 + Math.random() * 45);

  const numericSum = extractedNumbers.reduce((acc, num) => acc + Number(num), 0);
  const calculatedScore = extractedNumbers.length > 0
    ? (numericSum / extractedNumbers.length).toFixed(2)
    : (42.0).toFixed(1);

  const taskId = `CALC-${Date.now().toString(36).toUpperCase()}`;

  // Log as task in TaskService for persistence and auditability
  try {
    await TaskService.createTask({
      title: `Task Calculation (${cleanInput.slice(0, 40)}${cleanInput.length > 40 ? "..." : ""})`,
      description: `Mocked task calculation for input: "${cleanInput}". Calculated output: ${calculatedScore}.`,
      priority: "medium",
      status: "completed",
      telegramChatId: chatId,
      telegramUserId: userId,
      telegramUsername: username,
      metadata: {
        taskId,
        input: cleanInput,
        wordCount,
        charCount,
        extractedNumbers,
        durationMs,
        calculatedScore,
        mockEngine: "v1.0-mock",
      },
    });
  } catch (err) {
    console.error("[MenuHandler] Error persisting calculation task:", err);
  }

  const resultMessage =
    `🧮 *Výsledek výpočtu úlohy (Mock)*\n\n` +
    `• *Identifikátor úlohy:* \`${taskId}\`\n` +
    `• *Stav:* ✅ \`Dokončeno (Mocked Engine v1.0)\`\n` +
    `• *Doba výpočtu:* \`${durationMs} ms\`\n` +
    `• *Analyzovaný vstup:* \`${cleanInput.slice(0, 100)}${cleanInput.length > 100 ? "..." : ""}\`\n\n` +
    `📊 *Parametry vstupu:*\n` +
    `  - Počet znaků: \`${charCount}\`\n` +
    `  - Počet slov: \`${wordCount}\`\n` +
    `  - Nalezená čísla: \`${extractedNumbers.length > 0 ? extractedNumbers.join(", ") : "žádná"}\`\n\n` +
    `💡 *Vypočtený výstup:* \`Výsledek optimalizace = ${calculatedScore}\`\n\n` +
    `_Úloha byla úspěšně vyhodnocena a uložena._`;

  const keyboard = createMainMenuKeyboard();

  try {
    const sent = await ctx.reply(resultMessage, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    if (ctx.chat?.id) {
      MessageService.logMessage({
        messageId: sent?.message_id,
        chatId: ctx.chat.id,
        userId: ctx.me?.id,
        username: ctx.me?.username,
        firstName: ctx.me?.first_name,
        chatType: ctx.chat.type,
        text: resultMessage,
        direction: "outgoing",
        messageType: "task_result",
        rawPayload: sent,
      }).catch((err) => {
        console.error("[MenuHandler] Error logging task result message:", err);
      });
    }
  } catch (error) {
    console.error("[MenuHandler] Error sending task calculation result:", error);
    await ctx.reply(
      "❌ Nastala chyba při odesílání výsledku výpočtu. Zkuste to prosím znovu.",
      { reply_markup: keyboard }
    );
  }
}
