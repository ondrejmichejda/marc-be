import { NextRequest, NextResponse } from "next/server";
import { FssTemplateService } from "@/lib/fss";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/fss/templates/[id]/download
 * Downloads the binary DOCX file for a specific template.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await FssTemplateService.getTemplateBufferById(id);

    if (!result) {
      return NextResponse.json(
        { error: `Template file with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const { buffer, filename } = result;
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
