import { NextRequest, NextResponse } from "next/server";
import { DraculinoService } from "@/lib/draculino/service";

/**
 * GET /api/draculino/where
 * Query Draculino training units for today or a specific day/branch.
 * Query params:
 *  - day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | "dnes" | "zitra"
 *  - branch: branch id or name (e.g. "ostrava", "frydek-mistek")
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const dayParam = searchParams.get("day") || undefined;
  const branchParam = searchParams.get("branch") || undefined;

  const parsedDay = DraculinoService.parseDayArgument(dayParam);
  const parsedBranch = DraculinoService.findBranch(branchParam);

  try {
    const result = await DraculinoService.getTrainingUnits({
      day: parsedDay,
      branchId: parsedBranch?.id,
    });

    return NextResponse.json({
      success: true,
      day: result.day,
      dayNameCz: result.dayNameCz,
      date: result.dateStr,
      isToday: result.isToday,
      currentTime: result.currentTimeStr,
      totalUnits: result.totalUnits,
      upcomingUnitsCount: result.upcomingCount,
      inProgressUnitsCount: result.inProgressCount,
      pastUnitsCount: result.pastCount,
      remainingUnitsCount: result.remainingCount,
      branchesCount: result.branches.length,
      data: result.branches,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
