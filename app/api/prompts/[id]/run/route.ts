import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ScheduledPromptService } from "@/lib/prompts";

async function resolveUserId(req: NextRequest): Promise<{ userId: string; userEmail?: string }> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    return { userId: currentUser.id, userEmail: currentUser.email };
  }
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return { userId: headerUserId.trim(), userEmail: req.headers.get("x-user-email") || undefined };
  }
  return { userId: "default_user", userEmail: "user@marc.dev" };
}

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * POST /api/prompts/[id]/run
 * Manually executes the prompt immediately via OpenAI and returns the completion result.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUserId(req);

    const result = await ScheduledPromptService.executePromptNow(id, resolved.userId);

    return NextResponse.json({
      success: true,
      prompt: result.prompt,
      completion: result.completion,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
