import { NextRequest, NextResponse } from "next/server";
import { FireSafetySolutionService } from "@/lib/fss";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * GET /api/fss/[id]/export
 * Exports a Fire Safety Solution into a generated DOCX document based on template.docx
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const { buffer, filename } = await FireSafetySolutionService.exportSolutionToDocx(solution);

    // Optional override for custom filename query param
    const { searchParams } = new URL(req.url);
    const customFilename = searchParams.get("filename");
    const finalFilename = customFilename
      ? (customFilename.endsWith(".docx") ? customFilename : `${customFilename}.docx`)
      : filename;

    const asciiFilename = finalFilename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "_");
    const encodedFilename = encodeURIComponent(finalFilename);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Exported-Filename": encodedFilename,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
