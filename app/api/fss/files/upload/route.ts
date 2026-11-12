import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { FssBlobStorageService, FssTechnicalDocumentationFile } from "@/lib/fss";

/**
 * POST /api/fss/files/upload
 * Standalone file uploader for technical documentation (returns uploaded file metadata with blob URL).
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication for file uploads
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to upload files." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const uploadedFiles: FssTechnicalDocumentationFile[] = [];

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
        { error: "No files provided in 'file' or 'files' field." },
        { status: 400 }
      );
    }

    const fssId = (formData.get("fssId") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;
    const uploadedBy = currentUser.id;

    for (const file of fileEntries) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await FssBlobStorageService.uploadFile({
        buffer,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        fssId,
        uploadedBy,
        description,
      });
      uploadedFiles.push(uploaded);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s).`,
      file: uploadedFiles[0],
      files: uploadedFiles,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
