import { InlineKeyboard } from "grammy";
import { DRACULINO_BRANCHES } from "./data";
import { fetchDraculinoSitemap } from "./sitemap";
import {
  DayOfWeek,
  GymBranch,
  TrainingCategory,
  TrainingStatus,
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
    const timeInfo = this.getCurrentTimeInPrague();
    return {
      day: timeInfo.day,
      dayNameCz: timeInfo.dayNameCz,
      dateStr: timeInfo.dateStr,
    };
  }

  /**
   * Returns current day, date, and exact time in Central European (Prague) time.
   */
  static getCurrentTimeInPrague(): {
    day: DayOfWeek;
    dayNameCz: string;
    dateStr: string;
    timeStr: string;
    hours: number;
    minutes: number;
    totalMinutes: number;
  } {
    const now = new Date();

    // Format weekday in Europe/Prague timezone
    const pragueDateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Prague",
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);

    let weekdayStr = "";
    let hours = 0;
    let minutes = 0;

    for (const part of pragueDateParts) {
      if (part.type === "weekday") weekdayStr = part.value.toLowerCase();
      if (part.type === "hour") hours = parseInt(part.value, 10) || 0;
      if (part.type === "minute") minutes = parseInt(part.value, 10) || 0;
    }

    // Handle 24 hour wrap-around edge case in some ICU formats
    if (hours === 24) hours = 0;

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

    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    return {
      day,
      dayNameCz,
      dateStr: dateFormatted,
      timeStr,
      hours,
      minutes,
      totalMinutes: hours * 60 + minutes,
    };
  }

  /**
   * Helper to parse time string range (e.g. "18:00 - 19:30") into start/end values.
   */
  static parseTimeRange(timeStr: string): {
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
  } | null {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const endH = parseInt(match[3], 10);
    const endM = parseInt(match[4], 10);

    return {
      startTime: `${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}`,
      endTime: `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`,
      startMinutes: startH * 60 + startM,
      endMinutes: endH * 60 + endM,
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
   * When querying for today, calculates each unit's real-time status (upcoming, in_progress, past).
   */
  static async getTrainingUnits(options?: {
    day?: DayOfWeek;
    branchId?: string;
    referenceTimeMinutes?: number;
  }): Promise<WhereQueryResult> {
    const prague = this.getCurrentTimeInPrague();
    const targetDay = options?.day || prague.day;
    const isToday = targetDay === prague.day;
    const currentMinutes = options?.referenceTimeMinutes ?? prague.totalMinutes;

    const sitemap = await fetchDraculinoSitemap();

    let targetBranches = DRACULINO_BRANCHES;
    if (options?.branchId) {
      targetBranches = DRACULINO_BRANCHES.filter(
        (b) => b.id === options.branchId
      );
    }

    let totalUnits = 0;
    let upcomingCount = 0;
    let inProgressCount = 0;
    let pastCount = 0;

    const branchResults: {
      branch: GymBranch;
      units: TrainingUnit[];
      upcomingUnits: TrainingUnit[];
      inProgressUnits: TrainingUnit[];
      pastUnits: TrainingUnit[];
    }[] = [];

    for (const branch of targetBranches) {
      const rawUnits = branch.schedule[targetDay] || [];
      const enrichedUnits: TrainingUnit[] = [];
      const upcomingUnits: TrainingUnit[] = [];
      const inProgressUnits: TrainingUnit[] = [];
      const pastUnits: TrainingUnit[] = [];

      for (const u of rawUnits) {
        const parsedTime = this.parseTimeRange(u.time);
        let status: TrainingStatus | undefined = undefined;

        if (parsedTime) {
          if (isToday) {
            if (currentMinutes < parsedTime.startMinutes) {
              status = "upcoming";
              const enriched: TrainingUnit = {
                ...u,
                status,
                startTime: parsedTime.startTime,
                endTime: parsedTime.endTime,
                startMinutes: parsedTime.startMinutes,
                endMinutes: parsedTime.endMinutes,
              };
              upcomingUnits.push(enriched);
              enrichedUnits.push(enriched);
              upcomingCount++;
            } else if (
              currentMinutes >= parsedTime.startMinutes &&
              currentMinutes < parsedTime.endMinutes
            ) {
              status = "in_progress";
              const enriched: TrainingUnit = {
                ...u,
                status,
                startTime: parsedTime.startTime,
                endTime: parsedTime.endTime,
                startMinutes: parsedTime.startMinutes,
                endMinutes: parsedTime.endMinutes,
              };
              inProgressUnits.push(enriched);
              enrichedUnits.push(enriched);
              inProgressCount++;
            } else {
              status = "past";
              const enriched: TrainingUnit = {
                ...u,
                status,
                startTime: parsedTime.startTime,
                endTime: parsedTime.endTime,
                startMinutes: parsedTime.startMinutes,
                endMinutes: parsedTime.endMinutes,
              };
              pastUnits.push(enriched);
              enrichedUnits.push(enriched);
              pastCount++;
            }
          } else {
            enrichedUnits.push({
              ...u,
              startTime: parsedTime.startTime,
              endTime: parsedTime.endTime,
              startMinutes: parsedTime.startMinutes,
              endMinutes: parsedTime.endMinutes,
            });
          }
        } else {
          enrichedUnits.push(u);
        }
      }

      totalUnits += enrichedUnits.length;
      branchResults.push({
        branch,
        units: enrichedUnits,
        upcomingUnits,
        inProgressUnits,
        pastUnits,
      });
    }

    const currentHours = Math.floor(currentMinutes / 60);
    const currentMins = currentMinutes % 60;
    const computedTimeStr =
      options?.referenceTimeMinutes !== undefined
        ? `${currentHours.toString().padStart(2, "0")}:${currentMins.toString().padStart(2, "0")}`
        : prague.timeStr;

    return {
      day: targetDay,
      dayNameCz: CZECH_DAY_NAMES[targetDay],
      dateStr: prague.dateStr,
      isToday,
      currentTimeStr: isToday ? computedTimeStr : undefined,
      sitemap,
      branches: branchResults,
      totalUnits,
      upcomingCount: isToday ? upcomingCount : undefined,
      inProgressCount: isToday ? inProgressCount : undefined,
      pastCount: isToday ? pastCount : undefined,
      remainingCount: isToday ? upcomingCount + inProgressCount : undefined,
    };
  }

  /**
   * Formats Czech plural nouns for training units.
   */
  private static formatTrainingUnitsCzech(count: number): string {
    if (count === 1) return "1 trénink";
    if (count >= 2 && count <= 4) return `${count} tréninky`;
    return `${count} tréninků`;
  }

  private static formatRemainingCzech(count: number): string {
    if (count === 1) return "1 ještě zbývá";
    if (count >= 2 && count <= 4) return `${count} ještě zbývají`;
    return `${count} ještě zbývá`;
  }

  private static formatInProgressCzech(count: number): string {
    if (count === 1) return "1 právě probíhá";
    if (count >= 2 && count <= 4) return `${count} právě probíhají`;
    return `${count} právě probíhá`;
  }

  /**
   * Formats the training units report into user-friendly Markdown for Telegram.
   * Distinguishes upcoming, in-progress, and concluded sessions when reporting for today.
   */
  static formatWhereSummaryMarkdown(
    result: WhereQueryResult,
    options?: { showSitemap?: boolean; filterBranchName?: string }
  ): string {
    const isToday = result.isToday;
    const timeSuffix = isToday && result.currentTimeStr ? `, čas: ${result.currentTimeStr}` : "";
    const dayHeader = isToday
      ? `🥋 *Draculino — Dnešní Tréninky (${result.dayNameCz}, ${result.dateStr}${timeSuffix})*`
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

    if (isToday) {
      const remaining = result.remainingCount ?? 0;
      const inProg = result.inProgressCount ?? 0;
      const upcoming = result.upcomingCount ?? 0;

      if (remaining > 0) {
        if (inProg > 0 && upcoming > 0) {
          out += `🎯 *Dnes ještě zbývá / probíhá celkem ${this.formatTrainingUnitsCzech(remaining)}* (⏳ ${this.formatInProgressCzech(inProg)}, 🟢 ${this.formatRemainingCzech(upcoming)}):\n\n`;
        } else if (inProg > 0) {
          out += `🎯 *Dnes právě probíhá ${this.formatInProgressCzech(inProg)}* (další tréninky dnes již nejsou):\n\n`;
        } else {
          const remainingPrefix = upcoming === 1 ? "zbývá ještě" : upcoming >= 2 && upcoming <= 4 ? "zbývají ještě" : "zbývá ještě";
          out += `🎯 *Dnes ${remainingPrefix} ${this.formatTrainingUnitsCzech(upcoming)}* (z celkem ${result.totalUnits} dnes vypsaných):\n\n`;
        }
      } else {
        const branchContext = options?.filterBranchName
          ? ` pro pobočku *${options.filterBranchName}*`
          : "";
        out += `ℹ️ *Všechny dnešní tréninky${branchContext} (${result.totalUnits}) již proběhly.* (aktuální čas v Praze: \`${result.currentTimeStr}\`)\n\n`;
        out += `👉 *Podívej se na rozvrh na zítra* pomocí tlačítka níže nebo příkazu \`/where zitra\`.\n\n`;
        out += `💡 _Tip: Zadej \`/where [město]\` (např. \`/where ostrava\`) nebo \`/where zitra\` pro konkrétní rozpis._`;
        return out;
      }
    } else {
      out += `🎯 *V tento den se koná celkem ${this.formatTrainingUnitsCzech(result.totalUnits)}:*\n\n`;
    }

    // Filter branches to only those with active/upcoming sessions when isToday, or branches with units on other days
    const activeBranches = isToday
      ? result.branches.filter(
          (b) =>
            (b.upcomingUnits?.length || 0) + (b.inProgressUnits?.length || 0) > 0
        )
      : result.branches.filter((b) => b.units.length > 0);

    for (const item of activeBranches) {
      const branch = item.branch;
      const branchUnits = isToday
        ? item.units.filter((u) => u.status !== "past")
        : item.units;

      if (branchUnits.length === 0) continue;

      const branchRemaining =
        (item.upcomingUnits?.length || 0) + (item.inProgressUnits?.length || 0);

      out += `📍 *[${branch.name}](${branch.url})*`;
      if (isToday) {
        const remText =
          branchRemaining === 1
            ? "1 zbývá/probíhá"
            : branchRemaining >= 2 && branchRemaining <= 4
            ? `${branchRemaining} zbývají/probíhají`
            : `${branchRemaining} zbývá/probíhá`;
        out += ` _(${remText})_`;
      }
      out += `\n`;

      if (branch.address) {
        out += `🏢 _${branch.address}_\n`;
      }

      for (const unit of branchUnits) {
        const categoryEmoji = CATEGORY_EMOJI[unit.category] || "🥋";
        const coachInfo = unit.coach ? ` (Trenér: ${unit.coach})` : "";
        const levelInfo = unit.level ? ` • _${unit.level}_` : "";

        if (isToday) {
          if (unit.status === "in_progress") {
            out += `  ⏳ \`${unit.time}\` *${unit.title}*${levelInfo}${coachInfo} *(Právě probíhá)*\n`;
          } else if (unit.status === "upcoming") {
            out += `  🟢 \`${unit.time}\` *${unit.title}*${levelInfo}${coachInfo}\n`;
          }
        } else {
          out += `  ${categoryEmoji} \`${unit.time}\` *${unit.title}*${levelInfo}${coachInfo}\n`;
        }
      }
      out += `\n`;
    }

    if (isToday && !options?.filterBranchName) {
      const endedBranches = result.branches
        .filter(
          (b) =>
            b.units.length > 0 &&
            (b.upcomingUnits?.length || 0) + (b.inProgressUnits?.length || 0) === 0
        )
        .map((b) => b.branch.name);
      if (endedBranches.length > 0) {
        out += `🏁 _Pobočky s již ukončenými tréninky pro dnešek: ${endedBranches.join(", ")}_\n\n`;
      }
    }

    const inactiveCount = result.branches.filter((b) => b.units.length === 0).length;
    if (inactiveCount > 0 && !options?.filterBranchName) {
      const inactiveNames = result.branches
        .filter((b) => b.units.length === 0)
        .map((b) => b.branch.name)
        .join(", ");
      out += `💤 _Pobočky bez vypsaných tréninků v tento den: ${inactiveNames}_\n\n`;
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
