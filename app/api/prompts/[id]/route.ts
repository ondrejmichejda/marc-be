import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ScheduledPromptService,
  normalizeScheduledTime,
  SCHEDULED_TIME_OPTIONS,
} from "@/lib/prompts";

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
 * GET /api/prompts/[id]
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUserId(req);
    const prompt = await ScheduledPromptService.getPromptById(id, resolved.userId);

    if (!prompt) {
      return NextResponse.json(
        { error: `Prompt with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompts/[id]
 * Updates prompt fields (prompt text, scheduledTime [9am, 1pm, 5pm], title, model, isActive).
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUserId(req);
    const body = await req.json();

    if (body.scheduledTime !== undefined) {
      try {
        normalizeScheduledTime(body.scheduledTime);
      } catch {
        return NextResponse.json(
          {
            error: `Invalid scheduledTime '${body.scheduledTime}'. Allowed options are: 9am, 1pm, 5pm.`,
            allowedOptions: SCHEDULED_TIME_OPTIONS,
          },
          { status: 400 }
        );
      }
    }

    if (body.prompt !== undefined && (!body.prompt || !body.prompt.trim())) {
      return NextResponse.json(
        { error: "Field 'prompt' cannot be empty." },
        { status: 400 }
      );
    }

    const updated = await ScheduledPromptService.updatePrompt(id, resolved.userId, {
      prompt: body.prompt,
      scheduledTime: body.scheduledTime,
      title: body.title,
      model: body.model,
      isActive: body.isActive,
    });

    return NextResponse.json({
      success: true,
      prompt: updated,
      message: "Scheduled AI prompt updated successfully.",
    });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * PATCH /api/prompts/[id]
 * Partial update / toggle.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  return PUT(req, context);
}

/**
 * DELETE /api/prompts/[id]
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUserId(req);
    const deleted = await ScheduledPromptService.deletePrompt(id, resolved.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: `Prompt '${id}' not found or could not be deleted.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Scheduled AI prompt deleted successfully.",
      deletedId: id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
