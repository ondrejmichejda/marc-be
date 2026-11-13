import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService } from "@/lib/fss";

/**
 * GET /api/fss/templates/download?default=true|false
 * Downloads either the currently active template or the default built-in template.docx.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDefaultRequested = searchParams.get("default") === "true";

    let buffer: Buffer | null = null;
    let filename = "template.docx";

    if (isDefaultRequested) {
      buffer = FssTemplateService.getBuiltinDefaultBuffer();
      filename = "default_template.docx";
    } else {
      const result = await FssTemplateService.getActiveTemplateBuffer();
      buffer = result.buffer;
      filename = result.filename || "template.docx";
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "Template file could not be located." },
        { status: 404 }
      );
    }

    const asciiFilename = filename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]/g, "_");

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
