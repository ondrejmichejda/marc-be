import fs from "fs";
import path from "path";
import { put, del } from "@vercel/blob";
import { FssTechnicalDocumentationFile } from "./types";

export interface UploadOptions {
  buffer: Buffer | Uint8Array;
  filename: string;
  contentType?: string;
  fssId?: string;
  uploadedBy?: string;
  description?: string;
}

export class FssBlobStorageService {
  /**
   * Checks if Vercel Blob token is configured in environment.
   */
  static isVercelBlobConfigured(): boolean {
    return Boolean(
      process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN
    );
  }

  private static getLocalStorageDir(): string {
    const uploadDir = path.join(process.cwd(), "data", "uploads", "fss");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  /**
   * Uploads a technical documentation file to Vercel Blob (with local filesystem fallback).
   */
  static async uploadFile(options: UploadOptions): Promise<FssTechnicalDocumentationFile> {
    const { buffer, filename, contentType = "application/octet-stream", fssId, uploadedBy, description } = options;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_.\-\u00C0-\u024F]/g, "_");
    const blobPathname = fssId
      ? `fss/${fssId}/${fileId}-${sanitizedFilename}`
      : `fss/general/${fileId}-${sanitizedFilename}`;

    const now = new Date().toISOString();

    if (this.isVercelBlobConfigured()) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
        const blob = await put(blobPathname, Buffer.from(buffer), {
          access: "public",
          contentType,
          token,
          addRandomSuffix: false,
        });

        return {
          id: fileId,
          name: filename,
          url: blob.url,
          downloadUrl: blob.downloadUrl || `${blob.url}?download=1`,
          pathname: blob.pathname,
          size: buffer.length,
          contentType: blob.contentType || contentType,
          uploadedAt: now,
          uploadedBy: uploadedBy || "system",
          description,
        };
      } catch (err) {
        console.warn("[FssBlobStorageService] Vercel Blob upload failed, falling back to local storage:", (err as Error).message);
      }
    }

    // Local filesystem storage fallback
    const localDir = this.getLocalStorageDir();
    const localFilename = `${fileId}_${sanitizedFilename}`;
    const localFilePath = path.join(localDir, localFilename);
    fs.writeFileSync(localFilePath, Buffer.from(buffer));

    const localUrl = `/api/fss/files/${fileId}/download`;

    return {
      id: fileId,
      name: filename,
      url: localUrl,
      downloadUrl: localUrl,
      pathname: localFilename,
      size: buffer.length,
      contentType,
      uploadedAt: now,
      uploadedBy: uploadedBy || "system",
      description,
    };
  }

  /**
   * Deletes a technical documentation file from Vercel Blob and/or local storage.
   */
  static async deleteFile(fileOrUrlOrPathname: string | FssTechnicalDocumentationFile): Promise<boolean> {
    const targetUrlOrPath = typeof fileOrUrlOrPathname === "string"
      ? fileOrUrlOrPathname
      : fileOrUrlOrPathname.url || fileOrUrlOrPathname.pathname;

    let deleted = false;

    if (this.isVercelBlobConfigured() && targetUrlOrPath.startsWith("http")) {
      try {
        const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
        await del(targetUrlOrPath, { token });
        deleted = true;
      } catch (err) {
        console.warn("[FssBlobStorageService] Error deleting from Vercel Blob:", (err as Error).message);
      }
    }

    // Also attempt local cleanup if exists
    try {
      const localDir = this.getLocalStorageDir();
      const filenameOnly = path.basename(targetUrlOrPath);
      const localFilePath = path.join(localDir, filenameOnly);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        deleted = true;
      } else {
        // Search by prefix
        const entries = fs.readdirSync(localDir);
        for (const entry of entries) {
          if (typeof fileOrUrlOrPathname !== "string" && entry.startsWith(fileOrUrlOrPathname.id)) {
            fs.unlinkSync(path.join(localDir, entry));
            deleted = true;
          }
        }
      }
    } catch {
      // Ignore local cleanup error
    }

    return deleted;
  }

  /**
   * Retrieves a file buffer from local storage (if stored locally).
   */
  static getLocalFileBuffer(fileIdOrPathname: string): { buffer: Buffer; filename?: string } | null {
    try {
      const localDir = this.getLocalStorageDir();
      const directPath = path.join(localDir, fileIdOrPathname);
      if (fs.existsSync(directPath)) {
        return { buffer: fs.readFileSync(directPath), filename: fileIdOrPathname };
      }

      const files = fs.readdirSync(localDir);
      const match = files.find((f) => f.startsWith(fileIdOrPathname));
      if (match) {
        const parts = match.split("_");
        const originalName = parts.slice(1).join("_") || match;
        return {
          buffer: fs.readFileSync(path.join(localDir, match)),
          filename: originalName,
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}
