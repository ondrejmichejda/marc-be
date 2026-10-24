import { InlineKeyboard } from "grammy";
import { DRACULINO_BRANCHES } from "./data";
import { fetchDraculinoSitemap } from "./sitemap";
import {
  DayOfWeek,
  GymBranch,
  TrainingCategory,
  TrainingUnit,
  WhereQueryResult,
} from "./types";

const CZECH_DAY_NAMES: Record<DayOfWeek, string> = {
  monday: "Pondělí",
  tuesday: "Úterý",
  wednesday: "Středa",
  thursday: "Čtvrtek",
  friday: "Pátek",
  saturday: "Sobota",
  sunday: "Neděle",
};

const DAY_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const CATEGORY_EMOJI: Record<TrainingCategory, string> = {
  "BJJ Gi": "🥋",
  "BJJ No-Gi / Grappling": "🤼",
  "Kids / Junioři": "🧒",
  "Box / Striking": "🥊",
  "Strength / Fitness": "💪",
  "Open Mat / Sparing": "🔥",
  Other: "⚡",
};

export class DraculinoService {
  /**
   * Returns current day and date in Central European (Prague) time.
   */
  static getCurrentDayInPrague(): {
    day: DayOfWeek;
    dayNameCz: string;
    dateStr: string;
  } {
    const now = new Date();
    // Format to Europe/Prague timezone
    const pragueDateStr = now.toLocaleString("en-US", {
      timeZone: "Europe/Prague",
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const weekdayStr = pragueDateStr.split(",")[0].toLowerCase();

    let day: DayOfWeek = "monday";
    if (weekdayStr.includes("mon")) day = "monday";
    else if (weekdayStr.includes("tue")) day = "tuesday";
    else if (weekdayStr.includes("wed")) day = "wednesday";
    else if (weekdayStr.includes("thu")) day = "thursday";
    else if (weekdayStr.includes("fri")) day = "friday";
    else if (weekdayStr.includes("sat")) day = "saturday";
    else if (weekdayStr.includes("sun")) day = "sunday";

    const dayNameCz = CZECH_DAY_NAMES[day];
    const dateFormatted = now.toLocaleDateString("cs-CZ", {
      timeZone: "Europe/Prague",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });

    return {
      day,
      dayNameCz,
      dateStr: dateFormatted,
    };
  }

  /**
   * Helper to parse user day input (e.g. 'dnes', 'zitra', 'po', 'pondeli', 'mon', etc.)
   */
  static parseDayArgument(arg?: string): DayOfWeek | undefined {
    if (!arg) return undefined;
    const clean = arg.trim().toLowerCase();

    const prague = this.getCurrentDayInPrague();
    const currentDayIndex = DAY_ORDER.indexOf(prague.day);

    if (clean === "dnes" || clean === "today") {
      return prague.day;
    }
    if (clean === "zitra" || clean === "zítra" || clean === "tomorrow") {
      return DAY_ORDER[(currentDayIndex + 1) % 7];
    }
    if (clean === "pozitri" || clean === "pozítří") {
      return DAY_ORDER[(currentDayIndex + 2) % 7];
    }

    if (clean.startsWith("po") || clean === "mon" || clean === "monday")
      return "monday";
    if (
      clean.startsWith("út") ||
      clean.startsWith("ut") ||
      clean === "tue" ||
      clean === "tuesday"
    )
      return "tuesday";
    if (
      clean.startsWith("st") ||
      clean === "wed" ||
      clean === "wednesday"
    )
      return "wednesday";
    if (
      clean.startsWith("čt") ||
      clean.startsWith("ct") ||
      clean === "thu" ||
      clean === "thursday"
    )
      return "thursday";
    if (
      clean.startsWith("pá") ||
      clean.startsWith("pa") ||
      clean === "fri" ||
      clean === "friday"
    )
      return "friday";
    if (clean.startsWith("so") || clean === "sat" || clean === "saturday")
      return "saturday";
    if (
      clean.startsWith("ne") ||
      clean === "sun" ||
      clean === "sunday"
    )
      return "sunday";

    return undefined;
  }

  /**
   * Finds a branch by name, ID, or alias.
   */
  static findBranch(query?: string): GymBranch | undefined {
    if (!query) return undefined;
    const q = query.trim().toLowerCase();

    return DRACULINO_BRANCHES.find(
      (b) =>
        b.id.toLowerCase() === q ||
        b.slug.toLowerCase() === q ||
        b.name.toLowerCase().includes(q) ||
        (q === "fm" && b.id === "frydek-mistek") ||
        (q === "fno" && b.id === "frydlant")
    );
  }

  /**
   * Queries training units for a given day (defaults to today) and optional branch.
   */
  static async getTrainingUnits(options?: {
    day?: DayOfWeek;
    branchId?: string;
  }): Promise<WhereQueryResult> {
    const prague = this.getCurrentDayInPrague();
    const day = options?.day || prague.day;
    const dayNameCz = CZECH_DAY_NAMES[day];

    const sitemap = await fetchDraculinoSitemap();

    let targetBranches = DRACULINO_BRANCHES;
    if (options?.branchId) {
      targetBranches = DRACULINO_BRANCHES.filter(
        (b) => b.id === options.branchId
      );
    }

    let totalUnits = 0;
    const branchResults: { branch: GymBranch; units: TrainingUnit[] }[] = [];

    for (const branch of targetBranches) {
      const units = branch.schedule[day] || [];
      totalUnits += units.length;
      branchResults.push({
        branch,
        units,
      });
    }

    return {
      day,
      dayNameCz,
      dateStr: prague.dateStr,
      sitemap,
      branches: branchResults,
      totalUnits,
    };
  }

  /**
   * Formats the training units report into user-friendly Markdown for Telegram.
   */
  static formatWhereSummaryMarkdown(
    result: WhereQueryResult,
    options?: { showSitemap?: boolean; filterBranchName?: string }
  ): string {
    const isToday =
      result.day === this.getCurrentDayInPrague().day;
    const dayHeader = isToday
      ? `🥋 *Draculino — Dnešní Tréninky (${result.dayNameCz}, ${result.dateStr})*`
      : `🥋 *Draculino — Tréninky na ${result.dayNameCz}*`;

    let out = `${dayHeader}\n\n`;

    if (options?.showSitemap) {
      out += `🗺️ *Ověřené pobočky z www.draculino.cz sitemapy:*\n`;
      for (const item of result.sitemap) {
        const link = `[${item.branchName}](${item.pageUrl})`;
        const scheduleMark = item.timetableUrl
          ? ` ([Rozvrh](${item.timetableUrl}))`
          : "";
        out += `• ${link}${scheduleMark}\n`;
      }
      out += `\n─────────────────────\n\n`;
    }

    if (result.totalUnits === 0) {
      out += `ℹ️ Pro zvolený den (*${result.dayNameCz}*) nejsou v rozvrhu vypsány žádné pravidelné tréninky.\n`;
      return out;
    }

    out += `🎯 *Dnes se koná celkem ${result.totalUnits} tréninkových jednotek:*\n\n`;

    const activeBranches = result.branches.filter((b) => b.units.length > 0);

    for (const item of activeBranches) {
      const branch = item.branch;
      out += `📍 *[${branch.name}](${branch.url})*\n`;
      if (branch.address) {
        out += `🏢 _${branch.address}_\n`;
      }

      for (const unit of item.units) {
        const emoji = CATEGORY_EMOJI[unit.category] || "🥋";
        const coachInfo = unit.coach ? ` (Trenér: ${unit.coach})` : "";
        const levelInfo = unit.level ? ` • _${unit.level}_` : "";

        out += `  ${emoji} \`${unit.time}\` *${unit.title}*${levelInfo}${coachInfo}\n`;
      }
      out += `\n`;
    }

    const inactiveCount = result.branches.filter((b) => b.units.length === 0).length;
    if (inactiveCount > 0 && !options?.filterBranchName) {
      const inactiveNames = result.branches
        .filter((b) => b.units.length === 0)
        .map((b) => b.branch.name)
        .join(", ");
      out += `💤 _Pobočky bez tréninků v tento den: ${inactiveNames}_\n\n`;
    }

    out += `💡 _Tip: Zadej \`/where [město]\` (např. \`/where ostrava\`) nebo \`/where zitra\` pro konkrétní rozpis._`;

    return out;
  }

  /**
   * Generates inline keyboard for Telegram interaction (/where).
   */
  static createWhereKeyboard(
    currentDay: DayOfWeek,
    selectedBranchId?: string
  ): InlineKeyboard {
    const keyboard = new InlineKeyboard();

    // Day switch row
    keyboard
      .text(currentDay === "monday" ? "• Po •" : "Po", "where:day:monday")
      .text(currentDay === "tuesday" ? "• Út •" : "Út", "where:day:tuesday")
      .text(currentDay === "wednesday" ? "• St •" : "St", "where:day:wednesday")
      .text(currentDay === "thursday" ? "• Čt •" : "Čt", "where:day:thursday")
      .text(currentDay === "friday" ? "• Pá •" : "Pá", "where:day:friday")
      .row()
      .text(currentDay === "saturday" ? "• So •" : "So", "where:day:saturday")
      .text(currentDay === "sunday" ? "• Ne •" : "Ne", "where:day:sunday")
      .text("🗺️ Sitemap", "where:action:sitemap")
      .text("🔄 Dnes", "where:day:today")
      .row();

    // Quick city buttons
    keyboard
      .text(
        selectedBranchId === "frydek-mistek" ? "✅ FM" : "Frýdek-Místek",
        "where:branch:frydek-mistek"
      )
      .text(
        selectedBranchId === "ostrava" ? "✅ Ostrava" : "Ostrava",
        "where:branch:ostrava"
      )
      .text(
        selectedBranchId === "havirov" ? "✅ Havířov" : "Havířov",
        "where:branch:havirov"
      )
      .row()
      .text(
        selectedBranchId === "karvina" ? "✅ Karviná" : "Karviná",
        "where:branch:karvina"
      )
      .text(
        selectedBranchId === "frydlant" ? "✅ Frýdlant" : "Frýdlant",
        "where:branch:frydlant"
      )
      .text("🌐 Všechny pobočky", "where:branch:all");

    return keyboard;
  }
}
