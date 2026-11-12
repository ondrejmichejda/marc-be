import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { FireSafetySolutionProperties } from "./types";

/**
 * Candidate paths for template.docx
 */
const TEMPLATE_CANDIDATE_PATHS = [
  process.env.FSS_TEMPLATE_PATH,
  path.join(process.cwd(), "data", "templates", "template.docx"),
  "/Users/ondra/source/pbr/src/template.docx",
  path.join(process.cwd(), "..", "pbr", "src", "template.docx"),
  path.join(process.cwd(), "public", "templates", "template.docx"),
].filter(Boolean) as string[];

/**
 * Locates and reads the binary buffer of template.docx
 */
export function getTemplateBuffer(): Buffer {
  for (const templatePath of TEMPLATE_CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath);
      }
    } catch {
      // Continue to next candidate
    }
  }

  throw new Error(
    `Template DOCX file not found. Checked locations: ${TEMPLATE_CANDIDATE_PATHS.join(", ")}`
  );
}

/**
 * Sanitizes project name to create a clean, safe filename for download
 */
export function getExportFilename(
  solution: Partial<FireSafetySolutionProperties> & { title?: string }
): string {
  const rawName = (solution.nazevStavby || solution.title || "project-name").trim();
  const sanitized = rawName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "-")
    .trim();

  const finalName = sanitized || "project-name";
  return `${finalName}.docx`;
}

export type DocxExportInput = Partial<FireSafetySolutionProperties> & {
  id?: string;
  userId?: string;
  title?: string;
  zaver?: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Prepares the template data dictionary mapping all 18+ placeholder variables
 */
export function buildTemplateData(solution: DocxExportInput): Record<string, string> {
  const getVal = (val: unknown): string => (val ? String(val).trim() : "");
  const extra = solution as Record<string, unknown>;

  const nazevStavby = getVal(solution.nazevStavby || solution.title || "");
  const investorName = getVal(solution.investorName);
  const mistoStavby = getVal(solution.mistoStavby);
  const stupenDokumentace = getVal(solution.stupenDokumentace);
  const datum = getVal(solution.datum || new Date().toISOString().split("T")[0]);
  const zhodnoceniTechnickychZarizeniStavby = getVal(
    solution.zhodnoceniTechnickychZarizeniStavby
  );
  const seznamPriloh = getVal(solution.seznamPriloh);
  const seznamPodkladu = getVal(solution.seznamPodkladu);
  const uvod = getVal(solution.uvod);
  const kategorizaceStavbyZHlediskaPozarniBezpecnosti = getVal(
    solution.kategorizaceStavbyZHlediskaPozarniBezpecnosti ||
      extra["KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI"] ||
      extra["KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI"]
  );
  const konstrukcniReseniStavby = getVal(solution.konstrukcniReseniStavby);
  const posouzeniPozarniBezpecnostiStaveb = getVal(
    solution.posouzeniPozarniBezpecnostiStaveb
  );
  const pozarniOdolnostStavebnichKonstrukci = getVal(
    solution.pozarniOdolnostStavebnichKonstrukci
  );
  const evakuaceADruhyAKapacityUnikovychCest = getVal(
    solution.evakuaceADruhyAKapacityUnikovychCest
  );
  const pozarneNebezpecnyProstorOdstupoveVzdalenosti = getVal(
    solution.pozarneNebezpecnyProstorOdstupoveVzdalenosti
  );
  const zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami = getVal(
    solution.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami
  );
  const pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni = getVal(
    solution.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni
  );
  const pozadavkyProHaseniPozaruAZachrannePrace = getVal(
    solution.pozadavkyProHaseniPozaruAZachrannePrace
  );
  const zaver =
    getVal(solution.zaver || extra.zaver) ||
    "Stavba z hlediska požární bezpečnosti vyhovuje požadavkům příslušných ČSN norem a právních předpisů.";

  return {
    NAZEV_STAVBY: nazevStavby,
    INVESTOR_NAME: investorName,
    MISTO_STAVBY: mistoStavby,
    STUPEN_DOKUMENTACE: stupenDokumentace,
    DATUM: datum,
    ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY: zhodnoceniTechnickychZarizeniStavby,
    SEZNAM_PRILOH: seznamPriloh,
    SEZNAM_PODKLADU: seznamPodkladu,
    UVOD: uvod,
    "KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI":
      kategorizaceStavbyZHlediskaPozarniBezpecnosti,
    KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI:
      kategorizaceStavbyZHlediskaPozarniBezpecnosti,
    KONSTRUKCNI_RESENI_STAVBY: konstrukcniReseniStavby,
    POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB: posouzeniPozarniBezpecnostiStaveb,
    POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI: pozarniOdolnostStavebnichKonstrukci,
    EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST: evakuaceADruhyAKapacityUnikovychCest,
    POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI:
      pozarneNebezpecnyProstorOdstupoveVzdalenosti,
    ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI:
      zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami,
    POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI:
      pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni,
    POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE:
      pozadavkyProHaseniPozaruAZachrannePrace,
    ZAVER: zaver,
  };
}

/**
 * Generates a docx Buffer with all placeholders replaced with solution values.
 */
export function generateDocxExport(solution: DocxExportInput): {
  buffer: Buffer;
  filename: string;
} {
  const templateBuf = getTemplateBuffer();
  const zip = new PizZip(templateBuf);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    nullGetter: () => "",
  });

  const data = buildTemplateData(solution);
  doc.render(data);

  const outputBuffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const filename = getExportFilename(solution);

  return {
    buffer: outputBuffer,
    filename,
  };
}
