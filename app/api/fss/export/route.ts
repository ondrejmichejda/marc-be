import { NextRequest, NextResponse } from "next/server";
import { FireSafetySolutionService, generateDocxExport } from "@/lib/fss";

/**
 * GET /api/fss/export?id=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter 'id'." },
        { status: 400 }
      );
    }

    const solution = await FireSafetySolutionService.getSolutionById(id);
    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    const { buffer, filename } = await FireSafetySolutionService.exportSolutionToDocx(solution);

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

/**
 * POST /api/fss/export
 * Exports DOCX on the fly from given solution JSON body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.id && !body.nazevStavby && !body.investorName) {
      const solution = await FireSafetySolutionService.getSolutionById(body.id);
      if (solution) {
        const { buffer, filename } = await FireSafetySolutionService.exportSolutionToDocx(solution);
        const asciiFilename = filename
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\x20-\x7E]/g, "_");
        const encodedFilename = encodeURIComponent(filename);
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
            "Content-Length": buffer.length.toString(),
            "X-Exported-Filename": encodedFilename,
          },
        });
      }
    }

    const { buffer, filename } = generateDocxExport(body);
    const customFilename = body.filename || filename;
    const finalFilename = customFilename.endsWith(".docx")
      ? customFilename
      : `${customFilename}.docx`;

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
