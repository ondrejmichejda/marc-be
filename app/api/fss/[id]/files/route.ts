import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { RolesService } from "@/lib/auth/rolesService";
import { FireSafetySolutionService, FssBlobStorageService, FssTechnicalDocumentationFile } from "@/lib/fss";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
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
 * GET /api/fss/[id]/files
 * Retrieves technical documentation files for a solution.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const resolved = await resolveUser(req);
    const solution = await FireSafetySolutionService.getSolutionById(id, resolved.userId, resolved.isSystemUser);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      solutionId: id,
      files: solution.files || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fss/[id]/files
 * Uploads one or more technical documentation files using Vercel Blob.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Require authentication for file uploads
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to upload files." },
        { status: 401 }
      );
    }

    const solution = await FireSafetySolutionService.getSolutionById(id);

    if (!solution) {
      return NextResponse.json(
        { error: `Fire Safety Solution with ID '${id}' not found.` },
        { status: 404 }
      );
    }

    // Verify ownership — only the solution owner can upload files
    if (solution.userId !== currentUser.id) {
      return NextResponse.json(
        { error: "You do not have permission to upload files to this solution." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const uploadedFiles: FssTechnicalDocumentationFile[] = [];

    // Collect all 'file' and 'files' entries from FormData
    const fileEntries: File[] = [];
    const directFile = formData.get("file");
    if (directFile && typeof directFile === "object" && "arrayBuffer" in directFile) {
      fileEntries.push(directFile as File);
    }

    const multiFiles = formData.getAll("files");
    for (const item of multiFiles) {
      if (item && typeof item === "object" && "arrayBuffer" in item && !fileEntries.includes(item as File)) {
        fileEntries.push(item as File);
      }
    }

    if (fileEntries.length === 0) {
      return NextResponse.json(
        { error: "No files provided in 'file' or 'files' form data field." },
        { status: 400 }
      );
    }

    const description = (formData.get("description") as string) || undefined;
    const uploadedBy = currentUser.id;

    let currentSolution = solution;

    for (const file of fileEntries) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await FssBlobStorageService.uploadFile({
        buffer,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        fssId: id,
        uploadedBy,
        description,
      });

      uploadedFiles.push(uploaded);
      currentSolution = await FireSafetySolutionService.addFileToSolution(id, uploaded);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} technical documentation file(s).`,
      uploaded: uploadedFiles,
      files: currentSolution.files || [],
      solution: currentSolution,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
