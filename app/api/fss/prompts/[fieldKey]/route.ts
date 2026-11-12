import { NextRequest, NextResponse } from "next/server";
import { FssPromptService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ fieldKey: string }> | { fieldKey: string };
}

/**
 * GET /api/fss/prompts/[fieldKey]
 * Retrieves a specific FSS property prompt.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { fieldKey } = await context.params;
    const prompt = await FssPromptService.getPromptByFieldKey(fieldKey);

    if (!prompt) {
      return NextResponse.json(
        { error: `FSS prompt for property field '${fieldKey}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/fss/prompts/[fieldKey]
 * Updates a specific FSS property prompt (Admin only).
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { fieldKey } = await context.params;
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can modify general FSS AI prompts." },
        { status: 403 }
      );
    }

    const updates = await req.json();
    const updated = await FssPromptService.updatePrompt(
      fieldKey,
      updates,
      currentUser?.id || currentUser?.email || "admin"
    );

    return NextResponse.json({
      success: true,
      message: `Prompt for property '${fieldKey}' updated successfully.`,
      prompt: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
