import { NextRequest, NextResponse } from "next/server";
import {
  ScheduledPromptService,
  PromptScheduledTime,
  normalizeScheduledTime,
} from "@/lib/prompts";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Validates request authorization for Vercel Cron.
 * Supports:
 *  - Bearer token matching CRON_SECRET environment variable
 *  - Header 'x-cron-secret' or 'x-vercel-cron'
 *  - Query param '?secret='
 *  - Authenticated user session (for admin testing via UI/Postman)
 *  - Unconfigured secret mode (in local dev / demo)
 */
async function isAuthorizedCronRequest(
  req: NextRequest
): Promise<{ authorized: boolean; reason?: string }> {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // If no CRON_SECRET is configured in env, allow execution (e.g. dev/demo mode)
  if (!cronSecret) {
    return { authorized: true, reason: "no_secret_configured" };
  }

  // Check Bearer Token (standard Vercel Cron authorization header)
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) {
      return { authorized: true, reason: "bearer_token" };
    }
  }

  // Check custom headers
  const xCronSecret = req.headers.get("x-cron-secret")?.trim();
  if (xCronSecret === cronSecret) {
    return { authorized: true, reason: "x_cron_secret" };
  }

  // Check query parameter secret
  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret")?.trim();
  if (querySecret === cronSecret) {
    return { authorized: true, reason: "query_secret" };
  }

  // Check if authenticated admin/user
  try {
    const user = await getCurrentUser(req);
    if (user) {
      return { authorized: true, reason: `user_session_${user.email || user.id}` };
    }
  } catch {
    // ignore session check failure
  }

  return { authorized: false, reason: "invalid_or_missing_secret" };
}

/**
 * Resolves the scheduled time slot from query params or current time.
 */
function resolveTimeSlot(timeParam: string | null): PromptScheduledTime | "all" {
  if (!timeParam || timeParam === "auto") {
    // Detect hour in UTC (Vercel standard) or local
    const now = new Date();
    const utcHour = now.getUTCHours();
    if (utcHour === 6) return "6am";
    if (utcHour === 9) return "9am";
    if (utcHour === 13) return "1pm";
    if (utcHour === 17) return "5pm";
    return "all";
  }

  if (timeParam === "all") return "all";

  try {
    return normalizeScheduledTime(timeParam);
  } catch {
    return "all";
  }
}

/**
 * Handles batch execution of scheduled prompts.
 */
async function handleCronExecution(req: NextRequest) {
  const authCheck = await isAuthorizedCronRequest(req);
  if (!authCheck.authorized) {
    return NextResponse.json(
      {
        error: "Unauthorized. Missing or invalid CRON_SECRET.",
        message:
          "Please configure CRON_SECRET in environment variables and provide 'Authorization: Bearer <CRON_SECRET>' or '?secret=<CRON_SECRET>'.",
      },
      { status: 401 }
    );
  }

  let timeParam: string | null = null;
  let userIdFilter: string | undefined = undefined;

  const url = new URL(req.url);
  timeParam = url.searchParams.get("time");
  userIdFilter = url.searchParams.get("userId") || undefined;

  // In case of POST with JSON body
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.time) timeParam = body.time;
      if (body?.scheduledTime) timeParam = body.scheduledTime;
      if (body?.userId) userIdFilter = body.userId;
    } catch {
      // Body may be empty, query params will be used
    }
  }

  const targetTime = resolveTimeSlot(timeParam);
  const startTime = Date.now();

  const summary = await ScheduledPromptService.executeScheduledPromptsBatch({
    scheduledTime: targetTime,
    userId: userIdFilter,
  });

  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      scheduler: "Vercel Cron / Task Scheduler",
      authReason: authCheck.reason,
      totalDurationMs: durationMs,
      cronConfigured: Boolean(process.env.CRON_SECRET),
      ...summary,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

/**
 * GET /api/cron/prompts
 * Vercel Task Scheduler invokes cron jobs via GET requests.
 * Query parameters:
 *  - time: "6am" | "9am" | "1pm" | "5pm" | "all" | "auto"
 *  - userId?: string (optional filter)
 *  - secret?: string (optional if CRON_SECRET is set)
 */
export async function GET(req: NextRequest) {
  try {
    return await handleCronExecution(req);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/prompts
 * Allows triggering cron execution via POST request with optional JSON payload or query params.
 */
export async function POST(req: NextRequest) {
  try {
    return await handleCronExecution(req);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
