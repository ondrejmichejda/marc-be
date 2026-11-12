import fs from "fs";
import path from "path";
import { ensureDb, isDbConfigured } from "../db";
import {
  executeChatCompletion,
  getEffectiveOpenAiModel,
  estimateCostUsd,
  UserAiSettingsService,
} from "../openai";
import {
  FireSafetySolutionProperties,
  FssTechnicalDocumentationFile,
  FSS_PROPERTY_FIELDS,
} from "./types";
import { FssBlobStorageService } from "./blobStorage";

export interface FssPropertyPrompt {
  id: string;
  fieldKey: string;
  placeholderKey: string;
  propertyName: string;
  category: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  includeFiles: boolean;
  model?: string;
  temperature?: number;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface GeneratePropertyInput {
  fieldKey: string;
  properties?: Partial<FireSafetySolutionProperties>;
  files?: FssTechnicalDocumentationFile[];
  customInstructions?: string;
  model?: string;
  temperature?: number;
  userIdentifier?: string;
  userId?: string;
  apiKey?: string;
}

export interface GeneratePropertyResult {
  fieldKey: string;
  placeholderKey: string;
  propertyName: string;
  value: string;
  promptUsed: string;
  systemPromptUsed: string;
  model: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  tokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  filesIncludedCount: number;
  error?: string;
}

export interface GenerateAllPropertiesInput {
  fieldKeys?: string[];
  properties?: Partial<FireSafetySolutionProperties>;
  files?: FssTechnicalDocumentationFile[];
  customInstructions?: string;
  model?: string;
  temperature?: number;
  userIdentifier?: string;
  userId?: string;
  apiKey?: string;
}

export interface GenerateAllPropertiesResult {
  success: boolean;
  results: Record<string, GeneratePropertyResult>;
  properties: Partial<FireSafetySolutionProperties>;
  totalProperties: number;
  successfulCount: number;
  failedCount: number;
  durationMs: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalTokens?: number;
  tokens?: number;
  estimatedTotalCostUsd?: number;
  errors?: Record<string, string>;
}

export const DEFAULT_FSS_PROMPTS: FssPropertyPrompt[] = [
  {
    id: "prompt_nazevStavby",
    fieldKey: "nazevStavby",
    placeholderKey: "{{NAZEV_STAVBY}}",
    propertyName: "Název stavby",
    category: "1. Identifikace & Údaje",
    description: "Oficiální a úplný název stavebního záměru dle projektové dokumentace.",
    systemPrompt: `Jsi certifikovaný specialista požární bezpečnosti staveb (PBŘ). Na základě dodaných technických podkladů a projektové dokumentace formuluj přesný, oficiální a výstižný název stavby v českém jazyce. Vracej pouze samotný název stavby bez uvozovek a bez úvodních či závěrečných komentářů.`,
    userPrompt: `Extrahuj nebo formuluj oficiální název stavby z přiložené projektové a technické dokumentace.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_investorName",
    fieldKey: "investorName",
    placeholderKey: "{{INVESTOR_NAME}}",
    propertyName: "Jméno a identifikační údaje investora",
    category: "1. Identifikace & Údaje",
    description: "Identifikace stavebníka / objednatele včetně IČO, DIČ a sídla nebo bydliště.",
    systemPrompt: `Jsi expert na zpracování požárně bezpečnostních řešení (PBŘ). Z přiložených podkladů a zadání identifikuj investora (stavebníka). Uveď název/jméno, IČO/DIČ (pokud existuje) a adresu sídla. Vracej přesné a čistě zformátované identifikační údaje.`,
    userPrompt: `Uveď kompletní identifikační údaje investora / stavebníka (obchodní firma/jméno, IČO, sídlo) na základě podkladů.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_mistoStavby",
    fieldKey: "mistoStavby",
    placeholderKey: "{{MISTO_STAVBY}}",
    propertyName: "Místo stavby (adresa, parcelní čísla, katastrální území)",
    category: "1. Identifikace & Údaje",
    description: "Přesná lokalizace stavby včetně parcelních čísel a katastrálního území.",
    systemPrompt: `Jsi expert na stavební a požární legislativu v ČR. Z technických podkladů sestav přesnou lokalizaci stavby: adresa, parcelní čísla pozemků a katastrální území (včetně čísla KÚ). Vracej formátovaný text bez zbytečných okolků.`,
    userPrompt: `Specifikuj přesné místo stavby: ulici, číslo popisné/orientační, město, parcelní čísla dotčených pozemků a katastrální území.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_stupenDokumentace",
    fieldKey: "stupenDokumentace",
    placeholderKey: "{{STUPEN_DOKUMENTACE}}",
    propertyName: "Stupeň projektové dokumentace",
    category: "1. Identifikace & Údaje",
    description: "Označení stupně dokumentace dle stavebního zákona (např. DSP, DPS, DUR).",
    systemPrompt: `Jsi specialista na požárně bezpečnostní řešení staveb. Urči a uveď stupeň projektové dokumentace v souladu se stavebním zákonem (např. DSP - Dokumentace pro vydání stavebního povolení, DPS - Dokumentace pro provádění stavby apod.).`,
    userPrompt: `Uveď přesný stupeň projektové dokumentace pro PBŘ.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_datum",
    fieldKey: "datum",
    placeholderKey: "{{DATUM}}",
    propertyName: "Datum zpracování PBŘ",
    category: "1. Identifikace & Údaje",
    description: "Formátované datum vystavení požárně bezpečnostního řešení (např. MM/YYYY nebo DD.MM.YYYY).",
    systemPrompt: `Jsi asistent pro kompletaci PBŘ. Uveď aktuální nebo specifikované datum zpracování dokumentace ve formátu měsíc/rok nebo DD.MM.YYYY (např. 11/2026 nebo 12.11.2026).`,
    userPrompt: `Stanov datum zpracování požárně bezpečnostního řešení.`,
    includeFiles: false,
    temperature: 0.1,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_zhodnoceniTechnickychZarizeniStavby",
    fieldKey: "zhodnoceniTechnickychZarizeniStavby",
    placeholderKey: "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}",
    propertyName: "Zhodnocení technických zařízení stavby",
    category: "2. Podklady & Úvod",
    description: "Zhodnocení ZT, VZT, elektroinstalace, vytápění a chlazení dle ČSN 73 0802 / ČSN 73 0804.",
    systemPrompt: `Jsi autorizovaný inženýr pro požární bezpečnost staveb. Zpracuj odborné zhodnocení technických a technologických zařízení stavby (zdravotechnika, vytápění, větrání a VZT včetně požárních klapek, elektroinstalace, hromosvod a plyn). Zohledni požadavky ČSN 73 0802 čl. 11 a ČSN 73 0804 čl. 12.`,
    userPrompt: `Navrhni a popiš zhodnocení technických zařízení objektu z hlediska požární bezpečnosti na základě podkladů.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_seznamPriloh",
    fieldKey: "seznamPriloh",
    placeholderKey: "{{SEZNAM_PRILOH}}",
    propertyName: "Seznam příloh a výkresové dokumentace",
    category: "2. Podklady & Úvod",
    description: "Číslovaný seznam výkresů PBŘ, situací a doplňujících schémat.",
    systemPrompt: `Jsi zpracovatel PBŘ. Vytvoř strukturovaný a číslovaný seznam příloh požárně bezpečnostního řešení (situační výkres požární bezpečnosti, půdorysy s vyznačením požárních úseků, únikových cest a hasebních prostředků, technické listy zařízení).`,
    userPrompt: `Sestav číslovaný seznam příloh a výkresové dokumentace PBŘ odpovídající předloženému projektu.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_seznamPodkladu",
    fieldKey: "seznamPodkladu",
    placeholderKey: "{{SEZNAM_PODKLADU}}",
    propertyName: "Seznam výchozích podkladů a norem",
    category: "2. Podklady & Úvod",
    description: "Soupis zákonů, vyhlášek (vyhl. 23/2008 Sb., 246/2001 Sb.) a norem řady ČSN 73 08xx.",
    systemPrompt: `Jsi autorizovaný specialista PBŘ v ČR. Sestav přehledný seznam výchozích podkladů, zákonů (stavební zákon č. 283/2021 Sb., zákon č. 133/1985 Sb. o požární ochraně), vyhlášek (č. 23/2008 Sb., č. 246/2001 Sb.) a platných norem (ČSN 73 0802, ČSN 73 0804, ČSN 73 0873, ČSN 73 0875 a navazujících).`,
    userPrompt: `Generuj ucelený seznam výchozích podkladů a norem ČSN relevantních pro daný typ a účel stavby.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_uvod",
    fieldKey: "uvod",
    placeholderKey: "{{UVOD}}",
    propertyName: "Úvod, popis stavby a účel objektu",
    category: "2. Podklady & Úvod",
    description: "Základní charakteristika objektu, účel užívání, počet podlaží, zastavěná plocha a objem.",
    systemPrompt: `Jsi zpracovatel PBŘ. Formuluj komplexní a technicky přesný úvod a popis stavby: účel užívání, urbanistické a architektonické začlenění, dispoziční uspořádání, počet nadzemních a podzemních podlaží, požární výšku objektu h a základní kapacitní parametry.`,
    userPrompt: `Napiš úvodní kapitolu PBŘ s podrobným popisem stavebního objektu, provozu a kapacity na základě technické dokumentace.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_kategorizaceStavbyZHlediskaPozarniBezpecnosti",
    fieldKey: "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
    placeholderKey: "{{KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI}}",
    propertyName: "Kategorizace stavby z hlediska požární bezpečnosti",
    category: "3. Posouzení PBŘ",
    description: "Zařazení stavby do kategorie I, II nebo III dle § 39 zákona č. 133/1985 Sb. ve znění zákona č. 415/2021 Sb.",
    systemPrompt: `Jsi autorizovaný inženýr PO. Stanov a odůvodni kategorizaci stavby z hlediska požární bezpečnosti (kategorie 0, I, II nebo III) ve smyslu § 39 zákona č. 133/1985 Sb. a vyhlášky č. 460/2021 Sb. o kategorizaci staveb. Uveď splnění jednotlivých kritérií (výška stavby, počet osob, složitost evakuace).`,
    userPrompt: `Urči a podrobně zdůvodni zatřídění stavby do kategorie požární bezpečnosti dle platné české legislativy.`,
    includeFiles: true,
    temperature: 0.2,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_konstrukcniReseniStavby",
    fieldKey: "konstrukcniReseniStavby",
    placeholderKey: "{{KONSTRUKCNI_RESENI_STAVBY}}",
    propertyName: "Konstrukční a dispoziční řešení stavby",
    category: "3. Posouzení PBŘ",
    description: "Konstrukční systém stavby (nehořlavý DP1, smíšený DP2, hořlavý DP3), nosné prvky, obvodový a střešní plášť.",
    systemPrompt: `Jsi specialista PBŘ. Analyzuj nosný a obvodový systém objektu a zařaď konstrukční systém stavby do příslušného druhu (nehořlavý DP1, smíšený DP2, hořlavý DP3) v souladu s ČSN 73 0802 / ČSN 73 0804. Popiš svislé i vodorovné nosné konstrukce a střešní plášť.`,
    userPrompt: `Definuj druh konstrukčního systému stavby a popiš nosné, dělicí a střešní konstrukce dle podkladů.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_posouzeniPozarniBezpecnostiStaveb",
    fieldKey: "posouzeniPozarniBezpecnostiStaveb",
    placeholderKey: "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}",
    propertyName: "Rozdělení do požárních úseků a stanovení požárního rizika",
    category: "3. Posouzení PBŘ",
    description: "Vymezení požárních úseků (PÚ), stanovení požárního zatížení (pv, ps, an), ekonomického rizika a stupně PB (I až VII).",
    systemPrompt: `Jsi inženýr požární bezpečnosti. Navrhni rozdělení objektu do požárních úseků (PÚ). Pro jednotlivé úseky stanov výpočtové požární zatížení pv (nebo index spolehlivosti) a urči stupeň požární bezpečnosti (SPB I až VII) podle ČSN 73 0802 / ČSN 73 0804 s ohledem na požární výšku objektu a konstrukční systém.`,
    userPrompt: `Zpracuj rozdělení objektu do požárních úseků a výpočet stupňů požární bezpečnosti dle dodaných výkresů a podkladů.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_pozarniOdolnostStavebnichKonstrukci",
    fieldKey: "pozarniOdolnostStavebnichKonstrukci",
    placeholderKey: "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}",
    propertyName: "Požadavky na požární odolnost stavebních konstrukcí",
    category: "3. Posouzení PBŘ",
    description: "Dimenzování a požadavky na odolnost nosných stěn, stropů, požárních uzávěrů (REI, EW, EI, DP1/DP2).",
    systemPrompt: `Jsi odborník na stavební mechaniku a požární odolnost. Sestav přehlednou tabulku/soupis požadované a navržené požární odolnosti stavebních konstrukcí (požární stěny, stropy, obvodové pláště, schodiště, požární uzávěry) dle stanovených SPB a hodnot dle ČSN 73 0802 tab. 12 (např. REI 30 DP1, EI 15 DP1-C).`,
    userPrompt: `Stanov požadavky na požární odolnost jednotlivých stavebních konstrukcí a požárních uzávěrů v objektu.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_evakuaceADruhyAKapacityUnikovychCest",
    fieldKey: "evakuaceADruhyAKapacityUnikovychCest",
    placeholderKey: "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}",
    propertyName: "Evakuace osob, druhy a kapacity únikových cest",
    category: "4. Únikové cesty & Odstupy",
    description: "Posouzení nechráněných (NÚC) a chráněných (CHÚC A/B/C) únikových cest, mezní délky, šířky v únikových pruzích (u).",
    systemPrompt: `Jsi expert na evakuaci v PBŘ. Posuď možnosti bezpečné evakuace všech osob z objektu. Definuj druhy únikových cest (NÚC, CHÚC typu A/B/C), posuď jejich mezní délky, šířky v únikových pruzích u (dle počtu evakuovaných osob E a součinitele K), otevírání dveří a zajištění odvětrání.`,
    userPrompt: `Zpracuj dimenzování a posouzení únikových cest a evakuace osob dle ČSN 73 0802 / ČSN 73 0804.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_pozarneNebezpecnyProstorOdstupoveVzdalenosti",
    fieldKey: "pozarneNebezpecnyProstorOdstupoveVzdalenosti",
    placeholderKey: "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}",
    propertyName: "Požárně nebezpečný prostor a odstupové vzdálenosti",
    category: "4. Únikové cesty & Odstupy",
    description: "Výpočet odstupových vzdáleností d a d', posouzení PNP s ohledem na hranice pozemku a sousední objekty.",
    systemPrompt: `Jsi autorizovaný inženýr PBŘ. Vypočítej a posuď požárně nebezpečný prostor (PNP) a odstupové vzdálenosti d, d' od obvodových a střešních konstrukcí s požárně otevřenými plochami dle ČSN 73 0802 přílohy F / ČSN 73 0804 přílohy I. Ověř, zda PNP nepřesahuje hranice stavebního pozemku.`,
    userPrompt: `Vypočítej odstupové vzdálenosti a specifikuj rozsah požárně nebezpečného prostoru vůči sousedním parcelám a objektům.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
    fieldKey: "zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
    placeholderKey: "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}",
    propertyName: "Zabezpečení požární vodou a hasebními látkami",
    category: "5. Zabezpečení & Hašení",
    description: "Vnější odběrní místa (hydranty, vodoteče dle ČSN 73 0873), vnitřní odběrná místa (hadicové systémy D19/D25).",
    systemPrompt: `Jsi specialista na vodní hospodářství a PBŘ. Stanov požadavky na zásobování požární vodou dle ČSN 73 0873: vnější odběrní místa (podzemní/nadzemní hydranty, vzdálenosti, dimenze potrubí a statický/dynamický přetlak) a vnitřní odběrná místa (hadicové systémy s tvarově stálou hadicí D19/D25).`,
    userPrompt: `Specifikuj zajištění vnější a vnitřní požární vody včetně odběrných míst a parametrů dle ČSN 73 0873.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
    fieldKey: "pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
    placeholderKey: "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}",
    propertyName: "Požadavky na PBZ a bezpečnostní značení",
    category: "5. Zabezpečení & Hašení",
    description: "Elektrická požární signalizace (EPS), samočinné hasicí zařízení (SHZ), odvod kouře a tepla (SOZ), nouzové osvětlení.",
    systemPrompt: `Jsi projektant PBZ a PBŘ. Specifikuj požadavky na instalaci a koordinaci požárně bezpečnostních zařízení (PBZ) ve smyslu vyhlášky č. 246/2001 Sb.: EPS, SHZ/vodní clony, samočinné odvětrací zařízení (SOZ), nouzové únikové osvětlení a fotoluminiscenční bezpečnostní tabulky a značení.`,
    userPrompt: `Navrhni nutná požárně bezpečnostní zařízení (PBZ), nouzové osvětlení a bezpečnostní značení pro posuzovaný objekt.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
  {
    id: "prompt_pozadavkyProHaseniPozaruAZachrannePrace",
    fieldKey: "pozadavkyProHaseniPozaruAZachrannePrace",
    placeholderKey: "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}",
    propertyName: "Požadavky pro zásah jednotek PO a záchranné práce",
    category: "5. Zabezpečení & Hašení",
    description: "Příjezdové komunikace, nástupní plochy, vjezdy a zásahové cesty pro jednotky HZS dle ČSN 73 0802 / ČSN 73 0804.",
    systemPrompt: `Jsi inženýr PBŘ se zaměřením na zásahy HZS ČR. Stanov podmínky pro efektivní zásah jednotek požární ochrany: přístupové komunikace pro požární techniku (šířka, nosnost, poloměry zatáčení), nástupní plochy pro výškovou techniku, vnější zásahové cesty a umístění hlavních vypínačů a uzávěrů energií.`,
    userPrompt: `Popiš a zhodnoť podmínky pro příjezd, ustavení požární techniky a zásah jednotek PO dle požadavků ČSN 73 0802.`,
    includeFiles: true,
    temperature: 0.3,
    isActive: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    updatedBy: "system",
  },
];

interface FssPromptsStorageSchema {
  prompts: Record<string, FssPropertyPrompt>;
}

function mapPromptRow(row: Record<string, unknown>): FssPropertyPrompt {
  const fieldKey = String(row.field_key || "");
  const defaultEntry = DEFAULT_FSS_PROMPTS.find((p) => p.fieldKey === fieldKey);

  return {
    id: String(row.id || `prompt_${fieldKey}`),
    fieldKey,
    placeholderKey: String(row.placeholder_key || defaultEntry?.placeholderKey || ""),
    propertyName: String(row.property_name || defaultEntry?.propertyName || fieldKey),
    category: defaultEntry?.category || "PBŘ Vlastnosti",
    description: String(row.description || defaultEntry?.description || ""),
    systemPrompt: String(row.system_prompt || defaultEntry?.systemPrompt || ""),
    userPrompt: String(row.user_prompt || defaultEntry?.userPrompt || ""),
    includeFiles: row.include_files !== undefined ? Boolean(row.include_files) : true,
    model: row.model ? String(row.model) : undefined,
    temperature: row.temperature !== null && row.temperature !== undefined ? Number(row.temperature) : undefined,
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at || new Date().toISOString()),
    updatedBy: row.updated_by ? String(row.updated_by) : undefined,
  };
}

export class FssPromptService {
  private static localPrompts = new Map<string, FssPropertyPrompt>();
  private static initialized = false;

  private static getStoragePath(): string {
    const dataDir = path.join(process.cwd(), "data");
    return path.join(dataDir, "fss_ai_prompts.json");
  }

  private static loadStorage(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Seed defaults in memory
    for (const p of DEFAULT_FSS_PROMPTS) {
      this.localPrompts.set(p.fieldKey, { ...p });
    }

    try {
      const filePath = this.getStoragePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed: FssPromptsStorageSchema = JSON.parse(raw);
        if (parsed.prompts) {
          for (const [key, prompt] of Object.entries(parsed.prompts)) {
            this.localPrompts.set(key, prompt);
          }
        }
      } else {
        this.saveStorage();
      }
    } catch (err) {
      console.warn(
        "[FssPromptService] Could not read FSS prompts file, using in-memory defaults:",
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
      const payload: FssPromptsStorageSchema = {
        prompts: Object.fromEntries(this.localPrompts),
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.warn("[FssPromptService] Could not persist FSS prompts to file:", err);
    }
  }

  /**
   * Lists all general FSS property prompts (ordered according to standard PBŘ template sequence).
   */
  static async listPrompts(): Promise<FssPropertyPrompt[]> {
    this.loadStorage();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM fss_ai_prompts ORDER BY id ASC;
        `) as Record<string, unknown>[];

        if (rows && rows.length > 0) {
          const dbPromptsMap = new Map<string, FssPropertyPrompt>();
          for (const row of rows) {
            const p = mapPromptRow(row);
            dbPromptsMap.set(p.fieldKey, p);
          }

          // Return all standard properties in template order
          return DEFAULT_FSS_PROMPTS.map((def) => dbPromptsMap.get(def.fieldKey) || def);
        }
      } catch (err) {
        console.warn("[FssPromptService] PostgreSQL error on listPrompts, using local:", (err as Error).message);
      }
    }

    return DEFAULT_FSS_PROMPTS.map((def) => this.localPrompts.get(def.fieldKey) || def);
  }

  /**
   * Retrieves a specific property prompt by fieldKey.
   */
  static async getPromptByFieldKey(fieldKey: string): Promise<FssPropertyPrompt | null> {
    this.loadStorage();

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        const rows = (await sql`
          SELECT * FROM fss_ai_prompts WHERE field_key = ${fieldKey} LIMIT 1;
        `) as Record<string, unknown>[];

        if (rows && rows.length > 0) {
          return mapPromptRow(rows[0]);
        }
      } catch (err) {
        console.warn("[FssPromptService] PostgreSQL error on getPromptByFieldKey, using local:", (err as Error).message);
      }
    }

    return this.localPrompts.get(fieldKey) || DEFAULT_FSS_PROMPTS.find((p) => p.fieldKey === fieldKey) || null;
  }

  /**
   * Updates an existing FSS property prompt (Admin operation).
   */
  static async updatePrompt(
    fieldKey: string,
    updates: Partial<FssPropertyPrompt>,
    updatedBy: string = "admin"
  ): Promise<FssPropertyPrompt> {
    this.loadStorage();
    const existing = await this.getPromptByFieldKey(fieldKey);
    if (!existing) {
      throw new Error(`FSS prompt for property field '${fieldKey}' not found.`);
    }

    const now = new Date().toISOString();
    const updated: FssPropertyPrompt = {
      ...existing,
      ...updates,
      fieldKey,
      updatedAt: now,
      updatedBy,
    };

    if (isDbConfigured()) {
      try {
        const sql = await ensureDb();
        await sql`
          INSERT INTO fss_ai_prompts (
            id, field_key, property_name, placeholder_key,
            system_prompt, user_prompt, include_files, model,
            temperature, description, is_active, updated_at, updated_by
          ) VALUES (
            ${updated.id}, ${updated.fieldKey}, ${updated.propertyName}, ${updated.placeholderKey},
            ${updated.systemPrompt}, ${updated.userPrompt}, ${updated.includeFiles},
            ${updated.model || null}, ${updated.temperature !== undefined ? updated.temperature : null},
            ${updated.description || null}, ${updated.isActive}, ${now}, ${updatedBy}
          )
          ON CONFLICT (field_key) DO UPDATE SET
            property_name = EXCLUDED.property_name,
            placeholder_key = EXCLUDED.placeholder_key,
            system_prompt = EXCLUDED.system_prompt,
            user_prompt = EXCLUDED.user_prompt,
            include_files = EXCLUDED.include_files,
            model = EXCLUDED.model,
            temperature = EXCLUDED.temperature,
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by;
        `;
      } catch (err) {
        console.warn("[FssPromptService] PostgreSQL error on updatePrompt:", (err as Error).message);
      }
    }

    this.localPrompts.set(fieldKey, updated);
    this.saveStorage();
    return updated;
  }

  /**
   * Resets all FSS property prompts back to standard system defaults (Admin operation).
   */
  static async resetPromptsToDefaults(updatedBy: string = "admin"): Promise<FssPropertyPrompt[]> {
    this.loadStorage();
    const now = new Date().toISOString();

    for (const def of DEFAULT_FSS_PROMPTS) {
      const item: FssPropertyPrompt = {
        ...def,
        updatedAt: now,
        updatedBy,
      };
      this.localPrompts.set(def.fieldKey, item);

      if (isDbConfigured()) {
        try {
          const sql = await ensureDb();
          await sql`
            INSERT INTO fss_ai_prompts (
              id, field_key, property_name, placeholder_key,
              system_prompt, user_prompt, include_files, model,
              temperature, description, is_active, updated_at, updated_by
            ) VALUES (
              ${item.id}, ${item.fieldKey}, ${item.propertyName}, ${item.placeholderKey},
              ${item.systemPrompt}, ${item.userPrompt}, ${item.includeFiles},
              ${item.model || null}, ${item.temperature !== undefined ? item.temperature : null},
              ${item.description || null}, ${item.isActive}, ${now}, ${updatedBy}
            )
            ON CONFLICT (field_key) DO UPDATE SET
              property_name = EXCLUDED.property_name,
              placeholder_key = EXCLUDED.placeholder_key,
              system_prompt = EXCLUDED.system_prompt,
              user_prompt = EXCLUDED.user_prompt,
              include_files = EXCLUDED.include_files,
              model = EXCLUDED.model,
              temperature = EXCLUDED.temperature,
              description = EXCLUDED.description,
              is_active = EXCLUDED.is_active,
              updated_at = EXCLUDED.updated_at,
              updated_by = EXCLUDED.updated_by;
          `;
        } catch (err) {
          console.warn("[FssPromptService] PostgreSQL reset error:", (err as Error).message);
        }
      }
    }

    this.saveStorage();
    return this.listPrompts();
  }

  /**
   * Builds the comprehensive context string containing uploaded files and existing properties.
   */
  private static buildContext(
    properties?: Partial<FireSafetySolutionProperties>,
    files?: FssTechnicalDocumentationFile[],
    includeFiles: boolean = true
  ): { contextText: string; filesIncludedCount: number } {
    const parts: string[] = [];
    let filesCount = 0;

    // 1. Current form / project properties context
    if (properties) {
      const knownProps: string[] = [];
      if (properties.nazevStavby) knownProps.push(`Název stavby: ${properties.nazevStavby}`);
      if (properties.investorName) knownProps.push(`Investor / Stavebník: ${properties.investorName}`);
      if (properties.mistoStavby) knownProps.push(`Místo stavby: ${properties.mistoStavby}`);
      if (properties.stupenDokumentace) knownProps.push(`Stupeň dokumentace: ${properties.stupenDokumentace}`);
      if (properties.datum) knownProps.push(`Datum: ${properties.datum}`);
      if (properties.uvod) knownProps.push(`Úvod a popis stavby: ${properties.uvod.slice(0, 300)}...`);
      if (properties.konstrukcniReseniStavby) knownProps.push(`Konstrukční řešení: ${properties.konstrukcniReseniStavby.slice(0, 300)}...`);

      if (knownProps.length > 0) {
        parts.push(`--- ZNÁMÉ ÚDAJE O PROJEKTU A STAVBĚ ---\n${knownProps.join("\n")}`);
      }
    }

    // 2. Uploaded technical documentation files
    if (includeFiles && files && files.length > 0) {
      filesCount = files.length;
      const fileSummaries: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lines: string[] = [
          `Soubor #${i + 1}: ${file.name} (${(file.size / 1024).toFixed(1)} KB, typ: ${file.contentType})`,
        ];
        if (file.description) {
          lines.push(`Popis dokumentace: ${file.description}`);
        }

        // Try extracting text content for text-based or small local files
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (["txt", "json", "md", "csv", "xml", "html"].includes(ext || "")) {
          const localBufferInfo = FssBlobStorageService.getLocalFileBuffer(file.id);
          if (localBufferInfo?.buffer) {
            const textContent = localBufferInfo.buffer.toString("utf-8").slice(0, 2000);
            lines.push(`Obsah souboru (náhled):\n${textContent}`);
          }
        }

        fileSummaries.push(lines.join("\n"));
      }

      parts.push(`--- PŘILOŽENÁ TECHNICKÁ DOKUMENTACE A PODKLADY (${filesCount} souborů) ---\n${fileSummaries.join("\n\n")}`);
    }

    return {
      contextText: parts.join("\n\n"),
      filesIncludedCount: filesCount,
    };
  }

  /**
   * Generates a single FSS property using its configured AI prompt, uploaded files, and context.
   */
  static async generateProperty(input: GeneratePropertyInput): Promise<GeneratePropertyResult> {
    const startTime = Date.now();
    const promptDef = (await this.getPromptByFieldKey(input.fieldKey)) ||
      DEFAULT_FSS_PROMPTS.find((p) => p.fieldKey === input.fieldKey);

    if (!promptDef) {
      throw new Error(`Property field '${input.fieldKey}' is not a recognized FSS property.`);
    }

    const includeFiles = promptDef.includeFiles;
    const { contextText, filesIncludedCount } = this.buildContext(
      input.properties,
      input.files,
      includeFiles
    );

    let fullPrompt = promptDef.userPrompt;
    if (contextText) {
      fullPrompt = `${promptDef.userPrompt}\n\n${contextText}`;
    }
    if (input.customInstructions && input.customInstructions.trim()) {
      fullPrompt = `${fullPrompt}\n\nDODATEČNÉ POKYNY:\n${input.customInstructions.trim()}`;
    }

    // Resolve user settings and API key (per-user OpenAI token requirement)
    let userApiKey = input.apiKey?.trim();
    let userSettingsModel: string | undefined;
    let userWebSearch: boolean | undefined;
    let userOrg: string | undefined;

    if (input.userId) {
      const userSettings = await UserAiSettingsService.getSettings(input.userId);
      if (userSettings?.apiKey) {
        userApiKey = userApiKey || userSettings.apiKey.trim();
      }
      userSettingsModel = userSettings?.defaultModel;
      userWebSearch = userSettings?.webSearchEnabled;
      userOrg = userSettings?.organization;
    }

    const effectiveModel = input.model || promptDef.model || userSettingsModel || getEffectiveOpenAiModel();
    const effectiveTemperature = input.temperature !== undefined ? input.temperature : promptDef.temperature;

    if (!userApiKey) {
      return {
        fieldKey: promptDef.fieldKey,
        placeholderKey: promptDef.placeholderKey,
        propertyName: promptDef.propertyName,
        value: "",
        promptUsed: fullPrompt,
        systemPromptUsed: promptDef.systemPrompt,
        model: effectiveModel,
        durationMs: Date.now() - startTime,
        promptTokens: 0,
        completionTokens: 0,
        tokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        filesIncludedCount,
        error: "OpenAI API token není nastaven pro váš uživatelský účet. Nastavte prosím svůj osobní OpenAI token v menu 'AI Nastavení'.",
      };
    }

    try {
      const completionResult = await executeChatCompletion({
        prompt: fullPrompt,
        systemPrompt: promptDef.systemPrompt,
        model: effectiveModel,
        temperature: effectiveTemperature,
        userIdentifier: input.userIdentifier || "fss_user",
        source: `fss_gen_${input.fieldKey}`,
        apiKey: userApiKey,
        organization: userOrg,
        webSearch: userWebSearch,
      });

      const cleanValue = completionResult.completion
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();

      const promptTokens = completionResult.log?.promptTokens || 0;
      const completionTokens = completionResult.log?.completionTokens || 0;
      const totalTokens = completionResult.log?.totalTokens || promptTokens + completionTokens;
      const estimatedCostUsd = estimateCostUsd(effectiveModel, promptTokens, completionTokens);

      return {
        fieldKey: promptDef.fieldKey,
        placeholderKey: promptDef.placeholderKey,
        propertyName: promptDef.propertyName,
        value: cleanValue,
        promptUsed: fullPrompt,
        systemPromptUsed: promptDef.systemPrompt,
        model: effectiveModel,
        durationMs: Date.now() - startTime,
        promptTokens,
        completionTokens,
        tokens: totalTokens,
        totalTokens,
        estimatedCostUsd,
        filesIncludedCount,
      };
    } catch (err) {
      return {
        fieldKey: promptDef.fieldKey,
        placeholderKey: promptDef.placeholderKey,
        propertyName: promptDef.propertyName,
        value: "",
        promptUsed: fullPrompt,
        systemPromptUsed: promptDef.systemPrompt,
        model: effectiveModel,
        durationMs: Date.now() - startTime,
        promptTokens: 0,
        completionTokens: 0,
        tokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        filesIncludedCount,
        error: (err as Error).message,
      };
    }
  }

  /**
   * Generates all (or specified) FSS properties in parallel using AI prompts.
   */
  static async generateAllProperties(input: GenerateAllPropertiesInput): Promise<GenerateAllPropertiesResult> {
    const startTime = Date.now();
    const targetFields = input.fieldKeys && input.fieldKeys.length > 0
      ? input.fieldKeys
      : FSS_PROPERTY_FIELDS.map((f) => f.key);

    // Run parallel generation across all target properties
    const promises = targetFields.map((fieldKey) =>
      this.generateProperty({
        fieldKey,
        properties: input.properties,
        files: input.files,
        customInstructions: input.customInstructions,
        model: input.model,
        temperature: input.temperature,
        userIdentifier: input.userIdentifier,
        userId: input.userId,
        apiKey: input.apiKey,
      })
    );

    const settled = await Promise.allSettled(promises);

    const results: Record<string, GeneratePropertyResult> = {};
    const generatedProperties: Partial<FireSafetySolutionProperties> = {};
    const errors: Record<string, string> = {};
    let successfulCount = 0;
    let failedCount = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let estimatedTotalCostUsd = 0;

    for (let i = 0; i < targetFields.length; i++) {
      const fieldKey = targetFields[i];
      const outcome = settled[i];

      if (outcome.status === "fulfilled") {
        const item = outcome.value;
        results[fieldKey] = item;
        if (item.error) {
          errors[fieldKey] = item.error;
          failedCount++;
        } else {
          (generatedProperties as Record<string, string>)[fieldKey] = item.value;
          successfulCount++;
        }
        if (item.promptTokens) totalPromptTokens += item.promptTokens;
        if (item.completionTokens) totalCompletionTokens += item.completionTokens;
        if (item.tokens) totalTokens += item.tokens;
        if (item.estimatedCostUsd) estimatedTotalCostUsd += item.estimatedCostUsd;
      } else {
        const errMessage = (outcome.reason as Error)?.message || "Unknown generation error";
        errors[fieldKey] = errMessage;
        failedCount++;
        results[fieldKey] = {
          fieldKey,
          placeholderKey: `{{${fieldKey}}}`,
          propertyName: fieldKey,
          value: "",
          promptUsed: "",
          systemPromptUsed: "",
          model: input.model || getEffectiveOpenAiModel(),
          durationMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          tokens: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
          filesIncludedCount: 0,
          error: errMessage,
        };
      }
    }

    estimatedTotalCostUsd = Number(estimatedTotalCostUsd.toFixed(6));

    return {
      success: failedCount === 0 || successfulCount > 0,
      results,
      properties: generatedProperties,
      totalProperties: targetFields.length,
      successfulCount,
      failedCount,
      durationMs: Date.now() - startTime,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      tokens: totalTokens,
      estimatedTotalCostUsd,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }
}
