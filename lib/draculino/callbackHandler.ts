import { Context } from "grammy";
import { DraculinoService } from "./service";
import { DayOfWeek } from "./types";

/**
 * Handles callback queries triggered from /where interactive inline buttons.
 */
export async function handleWhereCallbackQuery(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith("where:")) return;

  const parts = data.split(":");
  const actionType = parts[1]; // "day", "branch", "action"
  const param = parts[2]; // day name, branch id, or action name

  try {
    let day: DayOfWeek | undefined;
    let branchId: string | undefined;
    let showSitemap = false;

    if (actionType === "day") {
      if (param === "today") {
        day = DraculinoService.getCurrentDayInPrague().day;
      } else {
        day = param as DayOfWeek;
      }
    } else if (actionType === "branch") {
      if (param !== "all") {
        branchId = param;
      }
    } else if (actionType === "action" && param === "sitemap") {
      showSitemap = true;
    }

    const currentPrague = DraculinoService.getCurrentDayInPrague();
    const effectiveDay = day || currentPrague.day;

    const result = await DraculinoService.getTrainingUnits({
      day: effectiveDay,
      branchId,
    });

    const branchObj = branchId
      ? DraculinoService.findBranch(branchId)
      : undefined;

    const formattedText = DraculinoService.formatWhereSummaryMarkdown(result, {
      showSitemap,
      filterBranchName: branchObj?.name,
    });

    const keyboard = DraculinoService.createWhereKeyboard(
      effectiveDay,
      branchId
    );

    // Edit message with updated day/branch/sitemap info
    await ctx.editMessageText(formattedText, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    await ctx.answerCallbackQuery({
      text: showSitemap
        ? "🗺️ Sitemap načtena"
        : `Zobrazeno: ${result.dayNameCz}${branchObj ? ` (${branchObj.name})` : ""}`,
    });
  } catch (error) {
    console.error("[WhereCallback] Error handling callback query:", error);
    await ctx.answerCallbackQuery({
      text: "⚠️ Nastala chyba při aktualizaci rozvrhu.",
    });
  }
}
