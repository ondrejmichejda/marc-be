import { NextRequest, NextResponse } from "next/server";
import { WishListService } from "@/lib/wishlist";
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
 * Handles batch execution of wishlist due notification checks.
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
      if (body?.time) timeParam = String(body.time);
      if (body?.scheduledTime) timeParam = String(body.scheduledTime);
      if (body?.userId) userIdFilter = String(body.userId);
    } catch {
      // Body may be empty, query params will be used
    }
  }

  // Optional parameter: default or resolved time (e.g. 12am/12pm/noon)
  const effectiveTime = timeParam || "12pm";
  const startTime = Date.now();

  const result = await WishListService.checkAndSendDueNotifications({
    timeSlot: effectiveTime,
    userId: userIdFilter,
  });

  const durationMs = Date.now() - startTime;

  return NextResponse.json(
    {
      success: true,
      scheduler: "Vercel Cron / Task Scheduler",
      task: "wishlist_notifications",
      time: effectiveTime,
      timestamp: new Date().toISOString(),
      authReason: authCheck.reason,
      durationMs,
      cronConfigured: Boolean(process.env.CRON_SECRET),
      result,
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
 * GET /api/cron/wishlist
 * Vercel Task Scheduler invokes cron jobs via GET requests.
 * Query parameters:
 *  - time?: string (optional parameter, e.g. "12am", "12pm", "noon", "all")
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
 * POST /api/cron/wishlist
 * Allows triggering wishlist cron execution via POST request with optional JSON payload or query params.
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
