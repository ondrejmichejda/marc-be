import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import {
  FireSafetySolution,
  CreateFireSafetySolutionInput,
  UpdateFireSafetySolutionInput,
  FireSafetySolutionProperties,
  FssTechnicalDocumentationFile,
  TEMPLATE_PLACEHOLDER_TO_FIELD_KEY,
} from "./types";
import { FssBlobStorageService } from "./blobStorage";

interface StorageSchema {
  solutions: Record<string, FireSafetySolution>;
}


function sanitizeProperty(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function normalizeInputProperties(
  input: Record<string, unknown>
): FireSafetySolutionProperties {
  const result: FireSafetySolutionProperties = {
    nazevStavby: "",
    investorName: "",
    mistoStavby: "",
    stupenDokumentace: "",
    datum: "",
    zhodnoceniTechnickychZarizeniStavby: "",
    seznamPriloh: "",
    seznamPodkladu: "",
    uvod: "",
    kategorizaceStavbyZHlediskaPozarniBezpecnosti: "",
    konstrukcniReseniStavby: "",
    posouzeniPozarniBezpecnostiStaveb: "",
    pozarniOdolnostStavebnichKonstrukci: "",
    evakuaceADruhyAKapacityUnikovychCest: "",
    pozarneNebezpecnyProstorOdstupoveVzdalenosti: "",
    zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: "",
    pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: "",
    pozadavkyProHaseniPozaruAZachrannePrace: "",
  };

  // Map known camelCase fields
  for (const key of Object.keys(result) as (keyof FireSafetySolutionProperties)[]) {
    if (input[key] !== undefined) {
      result[key] = sanitizeProperty(input[key]);
    }
  }

  // Also support placeholder inputs like {{NAZEV_STAVBY}} or NAZEV_STAVBY
  for (const [rawKey, targetKey] of Object.entries(TEMPLATE_PLACEHOLDER_TO_FIELD_KEY)) {
    if (input[rawKey] !== undefined && !result[targetKey]) {
      result[targetKey] = sanitizeProperty(input[rawKey]);
    }
  }

  return result;
}

function mapFssRow(row: Record<string, unknown>): FireSafetySolution {
  let parsedFiles: FssTechnicalDocumentationFile[] = [];
  if (row.files) {
    if (Array.isArray(row.files)) {
      parsedFiles = row.files as FssTechnicalDocumentationFile[];
    } else if (typeof row.files === "string") {
      try {
        parsedFiles = JSON.parse(row.files);
      } catch {
        parsedFiles = [];
      }
    }
  } else if (row.raw_properties && typeof row.raw_properties === "object") {
    const rawObj = row.raw_properties as Record<string, unknown>;
    if (Array.isArray(rawObj.files)) {
      parsedFiles = rawObj.files as FssTechnicalDocumentationFile[];
    }
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title || row.nazev_stavby || "Požárně bezpečnostní řešení"),
    nazevStavby: String(row.nazev_stavby || ""),
    investorName: String(row.investor_name || ""),
    mistoStavby: String(row.misto_stavby || ""),
    stupenDokumentace: String(row.stupen_dokumentace || ""),
    datum: String(row.datum || ""),
    zhodnoceniTechnickychZarizeniStavby: String(row.zhodnoceni_technickych_zarizeni_stavby || ""),
    seznamPriloh: String(row.seznam_priloh || ""),
    seznamPodkladu: String(row.seznam_podkladu || ""),
    uvod: String(row.uvod || ""),
    kategorizaceStavbyZHlediskaPozarniBezpecnosti: String(
      row.kategorizace_stavby_z_hlediska_pozarni_bezpecnosti || ""
    ),
    konstrukcniReseniStavby: String(row.konstrukcni_reseni_stavby || ""),
    posouzeniPozarniBezpecnostiStaveb: String(row.posouzeni_pozarni_bezpecnosti_staveb || ""),
    pozarniOdolnostStavebnichKonstrukci: String(row.pozarni_odolnost_stavebnich_konstrukci || ""),
    evakuaceADruhyAKapacityUnikovychCest: String(row.evakuace_a_druhy_a_kapacity_unikovych_cest || ""),
    pozarneNebezpecnyProstorOdstupoveVzdalenosti: String(
      row.pozarne_nebezpecny_prostor_odstupove_vzdalenosti || ""
    ),
    zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: String(
      row.zabezpeceni_pozarni_vodou_nebo_jinymi_hasebnimi_latkami || ""
    ),
    pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: String(
      row.pozadavky_na_pozarne_bezpecnostni_zarizeni_a_znaceni || ""
    ),
    pozadavkyProHaseniPozaruAZachrannePrace: String(
      row.pozadavky_pro_haseni_pozaru_a_zachranne_prace || ""
    ),
    files: parsedFiles,
    totalCostUsd: Number(row.total_cost_usd || 0),
    totalTokens: Number(row.total_tokens || 0),
    generationCount: Number(row.generation_count || 0),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at as string | number || Date.now()).toISOString(),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at as string | number || Date.now()).toISOString(),
  };
}

export class FireSafetySolutionService {
  private static localSolutions = new Map<string, FireSafetySolution>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "fire_safety_solutions.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: StorageSchema = JSON.parse(raw);
        this.localSolutions.clear();
        if (parsed.solutions && typeof parsed.solutions === "object") {
          for (const [id, item] of Object.entries(parsed.solutions)) {
            this.localSolutions.set(id, item);
          }
        }
      }
    } catch (err) {
      console.warn(
        "[FireSafetySolutionService] Could not read FSS file, using in-memory store:",
        (err as Error).message
      );
    }
  }

  private static saveStorage(): void {
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = this.getStoragePath();
      const payload: StorageSchema = {
        solutions: Object.fromEntries(this.localSolutions),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[FireSafetySolutionService] Could not persist FSS to file:", err);
    }
  }

  /**
   * Lists all fire safety solutions, optionally filtered by user ID or search query.
   */
  static async listSolutions(options?: {
    userId?: string;
    search?: string;
    isSystemUser?: boolean;
  }): Promise<FireSafetySolution[]> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const searchPattern = options?.search ? `%${options.search.trim().toLowerCase()}%` : null;
        const hasUserIdFilter = options?.userId && !options?.isSystemUser;

        let rows: Record<string, unknown>[];
        if (hasUserIdFilter && searchPattern) {
          rows = (await sql`
            SELECT * FROM fire_safety_solutions
            WHERE user_id = ${options.userId}
              AND (LOWER(title) LIKE ${searchPattern} OR LOWER(nazev_stavby) LIKE ${searchPattern} OR LOWER(investor_name) LIKE ${searchPattern})
            ORDER BY updated_at DESC;
          `) as Record<string, unknown>[];
        } else if (hasUserIdFilter) {
          rows = (await sql`
            SELECT * FROM fire_safety_solutions
            WHERE user_id = ${options.userId}
            ORDER BY updated_at DESC;
          `) as Record<string, unknown>[];
        } else if (searchPattern) {
          rows = (await sql`
            SELECT * FROM fire_safety_solutions
            WHERE LOWER(title) LIKE ${searchPattern} OR LOWER(nazev_stavby) LIKE ${searchPattern} OR LOWER(investor_name) LIKE ${searchPattern}
            ORDER BY updated_at DESC;
          `) as Record<string, unknown>[];
        } else {
          rows = (await sql`
            SELECT * FROM fire_safety_solutions
            ORDER BY updated_at DESC;
          `) as Record<string, unknown>[];
        }

        return rows.map(mapFssRow);
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB list failed, falling back to local store:", err);
      }
    }

    this.loadStorage();
    let list = Array.from(this.localSolutions.values());

    if (options?.userId && !options?.isSystemUser) {
      list = list.filter(
        (item) => item.userId === options.userId
      );
    }

    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.nazevStavby.toLowerCase().includes(q) ||
          item.investorName.toLowerCase().includes(q) ||
          item.mistoStavby.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Gets a single fire safety solution by ID, optionally verifying ownership.
   * System users (isSystemUser=true) bypass the ownership check.
   */
  static async getSolutionById(
    id: string,
    userId?: string,
    isSystemUser?: boolean
  ): Promise<FireSafetySolution | null> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM fire_safety_solutions
          WHERE id = ${id}
          LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows.length > 0) {
          const solution = mapFssRow(rows[0]);
          if (userId && !isSystemUser && solution.userId !== userId) return null;
          return solution;
        }
        return null;
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB getById failed, falling back:", err);
      }
    }

    this.loadStorage();
    const item = this.localSolutions.get(id);
    if (!item) return null;
    if (userId && !isSystemUser && item.userId !== userId) return null;
    return item;
  }

  /**
   * Creates a new fire safety solution.
   */
  static async createSolution(input: CreateFireSafetySolutionInput): Promise<FireSafetySolution> {
    if (!input.userId || !input.userId.trim()) {
      throw new Error("Missing required field 'userId'.");
    }

    const now = new Date().toISOString();
    const id = `fss_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const normalized = normalizeInputProperties(input as Record<string, unknown>);
    const title = input.title?.trim() || normalized.nazevStavby || "Nové požárně bezpečnostní řešení";

    const newSolution: FireSafetySolution = {
      id,
      userId: input.userId.trim(),
      title,
      ...normalized,
      files: input.files || [],
      totalCostUsd: Number(input.totalCostUsd || 0),
      totalTokens: Number(input.totalTokens || 0),
      generationCount: Number(input.generationCount || 0),
      createdAt: now,
      updatedAt: now,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO fire_safety_solutions (
            id, user_id, title, nazev_stavby, investor_name, misto_stavby,
            stupen_dokumentace, datum, zhodnoceni_technickych_zarizeni_stavby,
            seznam_priloh, seznam_podkladu, uvod,
            kategorizace_stavby_z_hlediska_pozarni_bezpecnosti,
            konstrukcni_reseni_stavby, posouzeni_pozarni_bezpecnosti_staveb,
            pozarni_odolnost_stavebnich_konstrukci,
            evakuace_a_druhy_a_kapacity_unikovych_cest,
            pozarne_nebezpecny_prostor_odstupove_vzdalenosti,
            zabezpeceni_pozarni_vodou_nebo_jinymi_hasebnimi_latkami,
            pozadavky_na_pozarne_bezpecnostni_zarizeni_a_znaceni,
            pozadavky_pro_haseni_pozaru_a_zachranne_prace,
            files,
            total_cost_usd,
            total_tokens,
            generation_count,
            created_at, updated_at
          ) VALUES (
            ${newSolution.id}, ${newSolution.userId}, ${newSolution.title},
            ${newSolution.nazevStavby}, ${newSolution.investorName}, ${newSolution.mistoStavby},
            ${newSolution.stupenDokumentace}, ${newSolution.datum},
            ${newSolution.zhodnoceniTechnickychZarizeniStavby}, ${newSolution.seznamPriloh},
            ${newSolution.seznamPodkladu}, ${newSolution.uvod},
            ${newSolution.kategorizaceStavbyZHlediskaPozarniBezpecnosti},
            ${newSolution.konstrukcniReseniStavby}, ${newSolution.posouzeniPozarniBezpecnostiStaveb},
            ${newSolution.pozarniOdolnostStavebnichKonstrukci},
            ${newSolution.evakuaceADruhyAKapacityUnikovychCest},
            ${newSolution.pozarneNebezpecnyProstorOdstupoveVzdalenosti},
            ${newSolution.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami},
            ${newSolution.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni},
            ${newSolution.pozadavkyProHaseniPozaruAZachrannePrace},
            ${JSON.stringify(newSolution.files || [])}::jsonb,
            ${newSolution.totalCostUsd},
            ${newSolution.totalTokens},
            ${newSolution.generationCount},
            ${now}, ${now}
          );
        `;
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB insert failed, persisting locally:", err);
      }
    }

    this.loadStorage();
    this.localSolutions.set(newSolution.id, newSolution);
    this.saveStorage();

    return newSolution;
  }

  /**
   * Updates an existing fire safety solution.
   */
  static async updateSolution(
    id: string,
    userId: string | undefined,
    input: UpdateFireSafetySolutionInput
  ): Promise<FireSafetySolution> {
    const existing = await this.getSolutionById(id, userId);
    if (!existing) {
      throw new Error(`Fire safety solution with ID '${id}' not found.`);
    }

    const now = new Date().toISOString();
    const normalizedUpdates = normalizeInputProperties(input as Record<string, unknown>);

    const updated: FireSafetySolution = {
      ...existing,
      updatedAt: now,
    };

    if (input.title !== undefined) {
      updated.title = input.title.trim() || updated.title;
    }

    // Merge properties where updated fields are supplied
    for (const key of Object.keys(normalizedUpdates) as (keyof FireSafetySolutionProperties)[]) {
      if ((input as Record<string, unknown>)[key] !== undefined) {
        updated[key] = (input as Record<string, unknown>)[key] as string;
      }
    }

    // Support template placeholders in updates too
    for (const [rawKey, targetKey] of Object.entries(TEMPLATE_PLACEHOLDER_TO_FIELD_KEY)) {
      if ((input as Record<string, unknown>)[rawKey] !== undefined) {
        updated[targetKey] = String((input as Record<string, unknown>)[rawKey] ?? "");
      }
    }

    if (input.files !== undefined) {
      updated.files = input.files;
    }

    if (input.totalCostUsd !== undefined) {
      updated.totalCostUsd = Number(input.totalCostUsd);
    }

    if (input.totalTokens !== undefined) {
      updated.totalTokens = Number(input.totalTokens);
    }

    if (input.generationCount !== undefined) {
      updated.generationCount = Number(input.generationCount);
    }

    // If title was not explicitly changed but nazevStavby was updated, sync title if it was default
    if (!input.title && updated.nazevStavby && updated.title === existing.nazevStavby) {
      updated.title = updated.nazevStavby;
    }

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          UPDATE fire_safety_solutions SET
            title = ${updated.title},
            nazev_stavby = ${updated.nazevStavby},
            investor_name = ${updated.investorName},
            misto_stavby = ${updated.mistoStavby},
            stupen_dokumentace = ${updated.stupenDokumentace},
            datum = ${updated.datum},
            zhodnoceni_technickych_zarizeni_stavby = ${updated.zhodnoceniTechnickychZarizeniStavby},
            seznam_priloh = ${updated.seznamPriloh},
            seznam_podkladu = ${updated.seznamPodkladu},
            uvod = ${updated.uvod},
            kategorizace_stavby_z_hlediska_pozarni_bezpecnosti = ${updated.kategorizaceStavbyZHlediskaPozarniBezpecnosti},
            konstrukcni_reseni_stavby = ${updated.konstrukcniReseniStavby},
            posouzeni_pozarni_bezpecnosti_staveb = ${updated.posouzeniPozarniBezpecnostiStaveb},
            pozarni_odolnost_stavebnich_konstrukci = ${updated.pozarniOdolnostStavebnichKonstrukci},
            evakuace_a_druhy_a_kapacity_unikovych_cest = ${updated.evakuaceADruhyAKapacityUnikovychCest},
            pozarne_nebezpecny_prostor_odstupove_vzdalenosti = ${updated.pozarneNebezpecnyProstorOdstupoveVzdalenosti},
            zabezpeceni_pozarni_vodou_nebo_jinymi_hasebnimi_latkami = ${updated.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami},
            pozadavky_na_pozarne_bezpecnostni_zarizeni_a_znaceni = ${updated.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni},
            pozadavky_pro_haseni_pozaru_a_zachranne_prace = ${updated.pozadavkyProHaseniPozaruAZachrannePrace},
            files = ${JSON.stringify(updated.files || [])}::jsonb,
            total_cost_usd = ${updated.totalCostUsd || 0},
            total_tokens = ${updated.totalTokens || 0},
            generation_count = ${updated.generationCount || 0},
            updated_at = ${now}
          WHERE id = ${id};
        `;
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB update failed, saving locally:", err);
      }
    }

    this.loadStorage();
    this.localSolutions.set(id, updated);
    this.saveStorage();

    return updated;
  }

  /**
   * Accumulates AI generation cost and token usage for a given solution.
   */
  static async accumulateAiUsage(
    solutionId: string,
    costUsd: number,
    tokens: number
  ): Promise<FireSafetySolution | null> {
    const existing = await this.getSolutionById(solutionId);
    if (!existing) return null;

    const currentCost = Number(existing.totalCostUsd || 0);
    const currentTokens = Number(existing.totalTokens || 0);
    const currentCount = Number(existing.generationCount || 0);

    const addedCost = Number(costUsd) || 0;
    const addedTokens = Number(tokens) || 0;

    const newCost = Number((currentCost + addedCost).toFixed(6));
    const newTokens = currentTokens + addedTokens;
    const newCount = currentCount + 1;

    return this.updateSolution(solutionId, existing.userId, {
      totalCostUsd: newCost,
      totalTokens: newTokens,
      generationCount: newCount,
    });
  }

  /**
   * Deletes a fire safety solution by ID, optionally verifying ownership.
   * System users (isSystemUser=true) bypass the ownership check.
   */
  static async deleteSolution(
    id: string,
    userId?: string,
    isSystemUser?: boolean
  ): Promise<boolean> {
    let dbDeleted = false;
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        let deletedRows: Record<string, unknown>[];
        if (userId && !isSystemUser) {
          deletedRows = (await sql`
            DELETE FROM fire_safety_solutions
            WHERE id = ${id} AND user_id = ${userId}
            RETURNING id;
          `) as Record<string, unknown>[];
        } else {
          deletedRows = (await sql`
            DELETE FROM fire_safety_solutions
            WHERE id = ${id}
            RETURNING id;
          `) as Record<string, unknown>[];
        }
        if (deletedRows && deletedRows.length > 0) {
          dbDeleted = true;
        }
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB delete failed:", err);
      }
    }

    this.loadStorage();
    let deletedLocally = false;
    if (userId && !isSystemUser) {
      const item = this.localSolutions.get(id);
      if (item && item.userId === userId) {
        deletedLocally = this.localSolutions.delete(id);
      }
    } else {
      deletedLocally = this.localSolutions.delete(id);
    }
    this.saveStorage();

    if (isDbConfigured()) {
      return dbDeleted || deletedLocally;
    }
    return deletedLocally;
  }

  /**
   * Clears all solutions (used in tests/resets).
   */
  static async clearAll(): Promise<void> {
    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`DELETE FROM fire_safety_solutions;`;
      } catch (err) {
        console.warn("[FireSafetySolutionService] DB clearAll failed:", err);
      }
    }

    this.loadStorage();
    this.localSolutions.clear();
    this.saveStorage();
  }

  /**
   * Adds a technical documentation file to a solution.
   */
  static async addFileToSolution(
    solutionId: string,
    file: FssTechnicalDocumentationFile
  ): Promise<FireSafetySolution> {
    const solution = await this.getSolutionById(solutionId);
    if (!solution) {
      throw new Error(`Fire safety solution with ID '${solutionId}' not found.`);
    }

    const currentFiles = solution.files || [];
    const updatedFiles = [...currentFiles.filter((f) => f.id !== file.id), file];

    return this.updateSolution(solutionId, solution.userId, {
      files: updatedFiles,
    });
  }

  /**
   * Removes a technical documentation file from a solution and blob storage.
   */
  static async removeFileFromSolution(
    solutionId: string,
    fileId: string
  ): Promise<FireSafetySolution> {
    const solution = await this.getSolutionById(solutionId);
    if (!solution) {
      throw new Error(`Fire safety solution with ID '${solutionId}' not found.`);
    }

    const currentFiles = solution.files || [];
    const fileToRemove = currentFiles.find((f) => f.id === fileId);

    if (fileToRemove) {
      await FssBlobStorageService.deleteFile(fileToRemove);
    }

    const updatedFiles = currentFiles.filter((f) => f.id !== fileId);

    return this.updateSolution(solutionId, solution.userId, {
      files: updatedFiles,
    });
  }

  /**
   * Gets a specific technical documentation file from a solution, optionally verifying ownership.
   * System users (isSystemUser=true) bypass the ownership check.
   */
  static async getSolutionFile(
    solutionId: string,
    fileId: string,
    userId?: string,
    isSystemUser?: boolean
  ): Promise<FssTechnicalDocumentationFile | null> {
    const solution = await this.getSolutionById(solutionId, userId, isSystemUser);
    if (!solution || !solution.files) return null;
    return solution.files.find((f) => f.id === fileId) || null;
  }

  /**
   * Exports a solution to a filled DOCX Buffer with its filename.
   */
  static async exportSolutionToDocx(
    solutionOrId: string | FireSafetySolution
  ): Promise<{ buffer: Buffer; filename: string; solution: FireSafetySolution }> {
    let targetSolution: FireSafetySolution | null = null;
    if (typeof solutionOrId === "string") {
      targetSolution = await this.getSolutionById(solutionOrId);
      if (!targetSolution) {
        throw new Error(`Fire safety solution with ID '${solutionOrId}' not found.`);
      }
    } else {
      targetSolution = solutionOrId;
    }

    const { generateDocxExport } = await import("./docxExport");
    const { buffer, filename } = generateDocxExport(targetSolution);

    return {
      buffer,
      filename,
      solution: targetSolution,
    };
  }
}
