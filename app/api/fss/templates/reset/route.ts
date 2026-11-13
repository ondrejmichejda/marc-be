import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/fss/templates/reset
 * Resets active template to default built-in template.docx.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can reset PBŘ DOCX templates." },
        { status: 403 }
      );
    }

    await FssTemplateService.resetToDefault();

    return NextResponse.json({
      success: true,
      message: "Template has been reset to default built-in template.docx.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
