import { NextRequest, NextResponse } from "next/server";
import { FireSafetySolutionService, FssBlobStorageService } from "@/lib/fss";

interface RouteContext {
  params: Promise<{ fileId: string }> | { fileId: string };
}

/**
 * GET /api/fss/files/[fileId]/download
 * Direct download endpoint for technical documentation files.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { fileId } = await context.params;

    // Search across solutions
    const allSolutions = await FireSafetySolutionService.listSolutions();
    let targetFile = null;

    for (const sol of allSolutions) {
      const match = (sol.files || []).find((f) => f.id === fileId);
      if (match) {
        targetFile = match;
        break;
      }
    }

    const { searchParams } = new URL(req.url);
    const shouldRedirect = searchParams.get("redirect") === "true";

    if (targetFile && targetFile.url.startsWith("http")) {
      if (shouldRedirect) {
        return NextResponse.redirect(targetFile.downloadUrl || `${targetFile.url}?download=1`);
      }

      try {
        const upstreamRes = await fetch(targetFile.url);
        if (upstreamRes.ok) {
          const arrayBuf = await upstreamRes.arrayBuffer();
          const filename = targetFile.name || "dokumentace";
          const asciiFilename = filename
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\x20-\x7E]/g, "_");
          const encodedFilename = encodeURIComponent(filename);

          return new NextResponse(new Uint8Array(arrayBuf), {
            status: 200,
            headers: {
              "Content-Type": targetFile.contentType || upstreamRes.headers.get("content-type") || "application/octet-stream",
              "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
              "Content-Length": arrayBuf.byteLength.toString(),
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (fetchErr) {
        console.warn("[Download Route] Upstream blob fetch failed, falling back to redirect:", fetchErr);
        return NextResponse.redirect(targetFile.downloadUrl || targetFile.url);
      }
    }

    // Check local storage fallback
    const localData = FssBlobStorageService.getLocalFileBuffer(fileId);
    if (localData) {
      const filename = targetFile?.name || localData.filename || "technicka_dokumentace";
      const asciiFilename = filename
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "_");
      const encodedFilename = encodeURIComponent(filename);

      return new NextResponse(new Uint8Array(localData.buffer), {
        status: 200,
        headers: {
          "Content-Type": targetFile?.contentType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
          "Content-Length": localData.buffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: `File '${fileId}' not found.` },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
