import { NextResponse } from "next/server";
import { fetchDraculinoSitemap } from "@/lib/draculino/sitemap";

/**
 * GET /api/draculino/sitemap
 * Returns the verified sitemap and timetable links for all Draculino branches.
 */
export async function GET() {
  try {
    const sitemap = await fetchDraculinoSitemap();
    return NextResponse.json({
      success: true,
      count: sitemap.length,
      sitemap,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
