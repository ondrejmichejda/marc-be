import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService, KNOWN_FSS_PLACEHOLDERS } from "@/lib/fss";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/fss/templates
 * Returns list of uploaded templates, active template, and known placeholder list.
 */
export async function GET() {
  try {
    const templates = await FssTemplateService.listTemplates();
    const activeTemplate = await FssTemplateService.getActiveTemplate();

    return NextResponse.json({
      success: true,
      templates,
      activeTemplate,
      defaultPlaceholders: KNOWN_FSS_PLACEHOLDERS,
      isBuiltinDefault: !activeTemplate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fss/templates
 * Uploads a new template.docx file and sets it as the latest active template.
 * Admin only (or authenticated user). Supports multipart/form-data or json body.
 */
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (currentUser && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can manage PBŘ DOCX templates." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let filename = "template.docx";
    let notes: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      notes = (formData.get("notes") as string) || undefined;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided in form data." },
          { status: 400 }
        );
      }

      filename = file.name || "template.docx";
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const body = await req.json();
      if (body.fileBase64) {
        buffer = Buffer.from(body.fileBase64, "base64");
      }
      if (body.filename) {
        filename = body.filename;
      }
      notes = body.notes;
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "File buffer is empty or missing." },
        { status: 400 }
      );
    }

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename}.docx`;
    }

    const template = await FssTemplateService.saveTemplate({
      buffer,
      filename,
      uploadedBy: currentUser?.name || currentUser?.email || "admin",
      notes,
    });

    return NextResponse.json({
      success: true,
      message: `Template '${template.name}' (v${template.version}) uploaded and set as active template.`,
      template,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
