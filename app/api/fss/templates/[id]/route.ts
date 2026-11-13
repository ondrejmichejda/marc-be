import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/fss/templates/[id]
 * Retrieves metadata for a specific template.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const template = await FssTemplateService.getTemplateById(id);

    if (!template) {
      return NextResponse.json(
        { error: `Template with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fss/templates/[id]
 * Deletes a template and cleans up its stored file.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can delete PBŘ DOCX templates." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const deleted = await FssTemplateService.deleteTemplate(id);

    if (!deleted) {
      return NextResponse.json(
        { error: `Template with ID '${id}' not found or could not be deleted.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template '${id}' deleted successfully.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
