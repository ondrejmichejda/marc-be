import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { RolesService } from "@/lib/auth/rolesService";
import { FireSafetySolutionService, FssBlobStorageService } from "@/lib/fss";

interface RouteContext {
  params: Promise<{ id: string; fileId: string }> | { id: string; fileId: string };
}

async function resolveUser(req: NextRequest): Promise<{
  userId: string;
  userEmail?: string;
  isSystemUser: boolean;
}> {
  const currentUser = await getCurrentUser(req);
  if (currentUser) {
    const role = await RolesService.getRole(currentUser.role);
    const isSystemUser = role?.isSystem ?? false;
    return { userId: currentUser.id, userEmail: currentUser.email, isSystemUser };
  }
  const headerUserId = req.headers.get("x-user-id") || req.headers.get("user-id");
  if (headerUserId && headerUserId.trim()) {
    return {
      userId: headerUserId.trim(),
      userEmail: req.headers.get("x-user-email") || undefined,
      isSystemUser: false,
    };
  }
  return { userId: "default_user", userEmail: "user@marc.dev", isSystemUser: false };
}

/**
 * GET /api/fss/[id]/files/[fileId]/download
 * Streams/downloads a technical documentation file with proper Content-Disposition attachment headers.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id, fileId } = await context.params;
    const resolved = await resolveUser(req);
    const file = await FireSafetySolutionService.getSolutionFile(id, fileId, resolved.userId, resolved.isSystemUser);

    const { searchParams } = new URL(req.url);
    const shouldRedirect = searchParams.get("redirect") === "true";

    if (file && file.url.startsWith("http")) {
      // For private blobs, get a fresh signed download URL
      const signedUrl = await FssBlobStorageService.getSignedDownloadUrl(file.url);

      if (shouldRedirect) {
        return NextResponse.redirect(signedUrl);
      }

      // Stream file directly to ensure clean download with original filename
      try {
        const upstreamRes = await fetch(signedUrl);
        if (upstreamRes.ok) {
          const arrayBuf = await upstreamRes.arrayBuffer();
          const filename = file.name || "dokumentace";
          const asciiFilename = filename
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\x20-\x7E]/g, "_");
          const encodedFilename = encodeURIComponent(filename);

          return new NextResponse(new Uint8Array(arrayBuf), {
            status: 200,
            headers: {
              "Content-Type": file.contentType || upstreamRes.headers.get("content-type") || "application/octet-stream",
              "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
              "Content-Length": arrayBuf.byteLength.toString(),
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (fetchErr) {
        console.warn("[Download Route] Upstream blob fetch failed, falling back to redirect:", fetchErr);
        return NextResponse.redirect(signedUrl);
      }
    }

    // Check local storage fallback
    const localData = FssBlobStorageService.getLocalFileBuffer(fileId);
    if (localData) {
      const filename = file?.name || localData.filename || "technicka_dokumentace";
      const asciiFilename = filename
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "_");
      const encodedFilename = encodeURIComponent(filename);

      return new NextResponse(new Uint8Array(localData.buffer), {
        status: 200,
        headers: {
          "Content-Type": file?.contentType || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${asciiFilename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`,
          "Content-Length": localData.buffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: `File '${fileId}' not found for solution '${id}'.` },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
