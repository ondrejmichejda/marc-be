import { NextRequest, NextResponse } from "next/server";
import { FssPromptService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/fss/prompts/reset
 * Resets all general FSS prompts to system default values (Admin only).
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can reset general FSS AI prompts." },
        { status: 403 }
      );
    }

    const resetPrompts = await FssPromptService.resetPromptsToDefaults(
      currentUser?.id || currentUser?.email || "admin"
    );

    return NextResponse.json({
      success: true,
      message: "All 18 FSS property prompts have been reset to factory defaults.",
      count: resetPrompts.length,
      prompts: resetPrompts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
