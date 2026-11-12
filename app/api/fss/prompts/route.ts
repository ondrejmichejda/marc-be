import { NextRequest, NextResponse } from "next/server";
import { FssPromptService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/fss/prompts
 * Returns the catalog of general AI prompts for all FSS properties.
 * Readable for anyone within the application and FSS creation form.
 */
export async function GET() {
  try {
    const prompts = await FssPromptService.listPrompts();
    return NextResponse.json({
      success: true,
      count: prompts.length,
      prompts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/fss/prompts
 * Updates a general FSS property prompt (Admin only).
 */
export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can modify general FSS AI prompts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fieldKey, ...updates } = body;

    if (!fieldKey) {
      return NextResponse.json(
        { error: "Missing required field 'fieldKey'." },
        { status: 400 }
      );
    }

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
