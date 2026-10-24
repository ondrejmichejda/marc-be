import { NextResponse } from "next/server";

/**
 * GET /api/draculino/where
 * (Disabled)
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Draculino /where functionality is disabled.",
    },
    { status: 404 }
  );
}
