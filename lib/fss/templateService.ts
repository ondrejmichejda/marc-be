import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import { ensureDb, isDbConfigured } from "../db";
import { FssBlobStorageService } from "./blobStorage";

export interface FssTemplate {
  id: string;
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  storageType: "blob" | "local" | "builtin";
  url?: string;
  blobUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  isActive: boolean;
  placeholdersCount: number;
  placeholders: string[];
  notes?: string;
}

export const KNOWN_FSS_PLACEHOLDERS: string[] = [
  "NAZEV_STAVBY",
  "INVESTOR_NAME",
  "MISTO_STAVBY",
  "STUPEN_DOKUMENTACE",
  "DATUM",
  "ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY",
  "SEZNAM_PRILOH",
  "SEZNAM_PODKLADU",
  "UVOD",
  "KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI",
  "KONSTRUKCNI_RESENI_STAVBY",
  "POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB",
  "POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI",
  "EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST",
  "POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI",
  "ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI",
  "POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI",
  "POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE",
  "ZAVER",
];

const TEMPLATE_CANDIDATE_PATHS = [
  process.env.FSS_TEMPLATE_PATH,
  path.join(process.cwd(), "data", "templates", "template.docx"),
  path.join(process.cwd(), "public", "templates", "template.docx"),
  "/Users/ondra/source/pbr/src/template.docx",
  path.join(process.cwd(), "..", "pbr", "src", "template.docx"),
].filter(Boolean) as string[];

export class FssTemplateService {
  private static localTemplates: Map<string, FssTemplate> = new Map();
  private static storageLoaded = false;

  private static getTemplatesDir(): string {
    const dir = path.join(process.cwd(), "data", "templates");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private static getMetadataFilePath(): string {
    return path.join(process.cwd(), "data", "fss_templates.json");
  }

  private static loadStorage(): void {
    if (this.storageLoaded) return;
    try {
      const metaPath = this.getMetadataFilePath();
      if (fs.existsSync(metaPath)) {
        const raw = fs.readFileSync(metaPath, "utf-8");
        const list = JSON.parse(raw) as FssTemplate[];
        this.localTemplates.clear();
        for (const item of list) {
          this.localTemplates.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn("[FssTemplateService] Failed to load local storage:", (err as Error).message);
    }
    this.storageLoaded = true;
  }

  private static saveStorage(): void {
    try {
      const metaPath = this.getMetadataFilePath();
      const list = Array.from(this.localTemplates.values());
      const dataDir = path.dirname(metaPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(metaPath, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.warn("[FssTemplateService] Failed to save local storage:", (err as Error).message);
    }
  }

  /**
   * Extracts all {{PLACEHOLDER}} tags found in a docx buffer.
   */
  static extractPlaceholders(buffer: Buffer | Uint8Array): string[] {
    try {
      const zip = new PizZip(buffer);
      const placeholders = new Set<string>();

      for (const filename of Object.keys(zip.files)) {
        if (filename.startsWith("word/") && filename.endsWith(".xml")) {
          const content = zip.file(filename)?.asText() || "";
          const stripped = content.replace(/<[^>]+>/g, "");
          const matches = stripped.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            for (const m of matches) {
              const clean = m.replace(/[{}]/g, "").trim();
              if (clean) placeholders.add(clean);
            }
          }
        }
      }
      return Array.from(placeholders);
    } catch (err) {
      console.warn("[FssTemplateService] Error extracting placeholders from DOCX:", (err as Error).message);
      return [];
    }
  }

  /**
   * Gets the builtin default template buffer from filesystem candidates.
   */
  static getBuiltinDefaultBuffer(): Buffer | null {
    for (const p of TEMPLATE_CANDIDATE_PATHS) {
      try {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p);
        }
      } catch {
        // continue
      }
    }
    return null;
  }

  /**
   * Lists all templates ordered with newest version first.
   */
  static async listTemplates(): Promise<FssTemplate[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM fss_templates ORDER BY version DESC, uploaded_at DESC;
        `) as Record<string, unknown>[];

        if (rows && rows.length > 0) {
          return rows.map((r) => ({
            id: String(r.id),
            name: String(r.name),
            filename: String(r.filename),
            size: Number(r.size),
            mimeType: String(r.mime_type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            storageType: (r.storage_type as "blob" | "local" | "builtin") || "local",
            url: r.url ? String(r.url) : undefined,
            blobUrl: r.blob_url ? String(r.blob_url) : undefined,
            uploadedAt: r.uploaded_at instanceof Date ? r.uploaded_at.toISOString() : String(r.uploaded_at),
            uploadedBy: String(r.uploaded_by || "admin"),
            version: Number(r.version || 1),
            isActive: Boolean(r.is_active),
            placeholdersCount: Number(r.placeholders_count || 0),
            placeholders: Array.isArray(r.placeholders) ? (r.placeholders as string[]) : [],
            notes: r.notes ? String(r.notes) : undefined,
          }));
        }
      } catch (err) {
        console.warn("[FssTemplateService] DB listTemplates failed, falling back to local:", (err as Error).message);
      }
    }

    this.loadStorage();
    return Array.from(this.localTemplates.values()).sort((a, b) => b.version - a.version);
  }

  /**
   * Gets the currently active template record, or null if using built-in default.
   */
  static async getActiveTemplate(): Promise<FssTemplate | null> {
    const list = await this.listTemplates();
    return list.find((t) => t.isActive) || null;
  }

  /**
   * Returns the buffer of the active template. If no active custom template exists, returns builtin default buffer.
   */
  static async getActiveTemplateBuffer(): Promise<{ buffer: Buffer; filename: string; template: FssTemplate | null }> {
    const active = await this.getActiveTemplate();
    if (active) {
      const tplBuffer = await this.getTemplateBufferById(active.id);
      if (tplBuffer) {
        return {
          buffer: tplBuffer.buffer,
          filename: active.name || active.filename,
          template: active,
        };
      }
    }

    const defaultBuf = this.getBuiltinDefaultBuffer();
    if (defaultBuf) {
      return {
        buffer: defaultBuf,
        filename: "template.docx",
        template: null,
      };
    }

    throw new Error(
      `No active or default template.docx found. Checked candidate locations: ${TEMPLATE_CANDIDATE_PATHS.join(", ")}`
    );
  }

  /**
   * Retrieves template metadata by ID.
   */
  static async getTemplateById(id: string): Promise<FssTemplate | null> {
    const list = await this.listTemplates();
    return list.find((t) => t.id === id) || null;
  }

  /**
   * Retrieves template file buffer by template ID.
   */
  static async getTemplateBufferById(id: string): Promise<{ buffer: Buffer; filename: string } | null> {
    const template = await this.getTemplateById(id);
    if (!template) return null;

    // Check local filesystem
    const templatesDir = this.getTemplatesDir();
    const localFilePath = path.join(templatesDir, template.filename);
    if (fs.existsSync(localFilePath)) {
      return {
        buffer: fs.readFileSync(localFilePath),
        filename: template.name || template.filename,
      };
    }

    // Try Vercel Blob if URL present
    if (template.blobUrl && template.blobUrl.startsWith("http")) {
      try {
        const res = await fetch(template.blobUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return {
            buffer: Buffer.from(ab),
            filename: template.name || template.filename,
          };
        }
      } catch (err) {
        console.warn("[FssTemplateService] Failed to fetch template from Blob:", (err as Error).message);
      }
    }

    // Fallback to local file lookup in uploads/fss if managed via blobStorage
    const blobBuffer = FssBlobStorageService.getLocalFileBuffer(template.filename);
    if (blobBuffer) {
      return {
        buffer: blobBuffer.buffer,
        filename: template.name || template.filename,
      };
    }

    return null;
  }

  /**
   * Saves and uploads a new template.docx, automatically overriding as the latest active template.
   */
  static async saveTemplate(options: {
    buffer: Buffer;
    filename: string;
    uploadedBy?: string;
    notes?: string;
  }): Promise<FssTemplate> {
    const { buffer, filename, uploadedBy = "admin", notes } = options;
    const now = new Date().toISOString();
    const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const sanitizedName = filename.endsWith(".docx") ? filename : `${filename}.docx`;
    const storedFilename = `${id}_${sanitizedName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

    const placeholders = this.extractPlaceholders(buffer);
    const list = await this.listTemplates();
    const maxVersion = list.reduce((max, t) => Math.max(max, t.version || 0), 0);
    const newVersion = maxVersion + 1;

    let blobUrl: string | undefined;
    let url = `/api/fss/templates/${id}/download`;
    let storageType: "blob" | "local" = "local";

    // Write to local disk in data/templates/
    const templatesDir = this.getTemplatesDir();
    const localFilePath = path.join(templatesDir, storedFilename);
    fs.writeFileSync(localFilePath, buffer);

    // Also upload to Vercel blob if configured
    if (FssBlobStorageService.isVercelBlobConfigured()) {
      try {
        const blobResult = await FssBlobStorageService.uploadFile({
          buffer,
          filename: sanitizedName,
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fssId: "templates",
          uploadedBy,
          description: notes,
        });
        blobUrl = blobResult.url;
        url = blobResult.downloadUrl || blobResult.url;
        storageType = "blob";
      } catch (err) {
        console.warn("[FssTemplateService] Vercel Blob upload failed, using local storage:", (err as Error).message);
      }
    }

    const template: FssTemplate = {
      id,
      name: sanitizedName,
      filename: storedFilename,
      size: buffer.length,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      storageType,
      url,
      blobUrl,
      uploadedAt: now,
      uploadedBy,
      version: newVersion,
      isActive: true, // Newest uploaded template is active and overrides previous
      placeholdersCount: placeholders.length,
      placeholders,
      notes,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        // Deactivate all previous templates
        await sql`UPDATE fss_templates SET is_active = FALSE;`;
        // Insert new active template
        await sql`
          INSERT INTO fss_templates (
            id, name, filename, size, mime_type, storage_type,
            url, blob_url, uploaded_at, uploaded_by, version,
            is_active, placeholders_count, placeholders, notes
          ) VALUES (
            ${template.id}, ${template.name}, ${template.filename}, ${template.size},
            ${template.mimeType}, ${template.storageType}, ${template.url || null},
            ${template.blobUrl || null}, ${template.uploadedAt}, ${template.uploadedBy},
            ${template.version}, TRUE, ${template.placeholdersCount},
            ${JSON.stringify(template.placeholders)}::jsonb, ${template.notes || null}
          );
        `;
      } catch (err) {
        console.warn("[FssTemplateService] DB saveTemplate failed:", (err as Error).message);
      }
    }

    this.loadStorage();
    // Deactivate previous local templates
    for (const [k, v] of this.localTemplates.entries()) {
      this.localTemplates.set(k, { ...v, isActive: false });
    }
    this.localTemplates.set(template.id, template);
    this.saveStorage();

    return template;
  }

  /**
   * Sets a specific template version as active.
   */
  static async setActiveTemplate(id: string): Promise<FssTemplate> {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error(`Template with ID '${id}' not found.`);
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`UPDATE fss_templates SET is_active = FALSE;`;
        await sql`UPDATE fss_templates SET is_active = TRUE WHERE id = ${id};`;
      } catch (err) {
        console.warn("[FssTemplateService] DB setActiveTemplate failed:", (err as Error).message);
      }
    }

    this.loadStorage();
    for (const [k, v] of this.localTemplates.entries()) {
      this.localTemplates.set(k, { ...v, isActive: k === id });
    }
    this.saveStorage();

    return { ...template, isActive: true };
  }

  /**
   * Deletes a template by ID and cleans up its file.
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.getTemplateById(id);
    if (!template) return false;

    // Remove local file
    try {
      const templatesDir = this.getTemplatesDir();
      const localFilePath = path.join(templatesDir, template.filename);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (err) {
      console.warn("[FssTemplateService] Failed to delete local template file:", (err as Error).message);
    }

    if (template.blobUrl) {
      await FssBlobStorageService.deleteFile(template.blobUrl);
    }

    let deletedDb = false;
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM fss_templates WHERE id = ${id};`;
        deletedDb = true;

        // If the deleted template was active, activate the latest remaining template if one exists
        if (template.isActive) {
          const remaining = (await sql`
            SELECT id FROM fss_templates ORDER BY version DESC, uploaded_at DESC LIMIT 1;
          `) as { id: string }[];
          if (remaining.length > 0) {
            await sql`UPDATE fss_templates SET is_active = TRUE WHERE id = ${remaining[0].id};`;
          }
        }
      } catch (err) {
        console.warn("[FssTemplateService] DB deleteTemplate failed:", (err as Error).message);
      }
    }

    this.loadStorage();
    const deletedLocal = this.localTemplates.delete(id);
    if (template.isActive && this.localTemplates.size > 0) {
      const remaining = Array.from(this.localTemplates.values()).sort((a, b) => b.version - a.version);
      if (remaining[0]) {
        this.localTemplates.set(remaining[0].id, { ...remaining[0], isActive: true });
      }
    }
    this.saveStorage();

    return deletedDb || deletedLocal;
  }

  /**
   * Resets active template selection back to built-in default template.
   */
  static async resetToDefault(): Promise<void> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`UPDATE fss_templates SET is_active = FALSE;`;
      } catch (err) {
        console.warn("[FssTemplateService] DB resetToDefault failed:", (err as Error).message);
      }
    }

    this.loadStorage();
    for (const [k, v] of this.localTemplates.entries()) {
      this.localTemplates.set(k, { ...v, isActive: false });
    }
    this.saveStorage();
  }
}
