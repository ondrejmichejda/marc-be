import { NextResponse } from "next/server";

/**
 * GET /api/draculino/sitemap
 * (Disabled)
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Draculino sitemap and timetable functionality is disabled.",
    },
    { status: 404 }
  );
}
