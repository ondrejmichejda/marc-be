import { NextRequest, NextResponse } from "next/server";
import { TrackingService } from "@/lib/tracking";

/**
 * GET / POST /api/cron/trackers
 * Background job to check and dispatch Telegram notifications for expired/due trackers.
 */
async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // In production, enforce secret if configured
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
      }
    }

    const result = await TrackingService.checkAndSendDueNotifications();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
