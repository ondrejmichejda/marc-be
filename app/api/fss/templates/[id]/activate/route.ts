import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/fss/templates/[id]/activate
 * Activates a specific template version and makes it the active template used for FSS generation.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can activate PBŘ DOCX templates." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const template = await FssTemplateService.setActiveTemplate(id);

    return NextResponse.json({
      success: true,
      message: `Template '${template.name}' (v${template.version}) is now the active template.`,
      template,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
