export interface FssTechnicalDocumentationFile {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  pathname?: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy?: string;
  description?: string;
}

export interface FireSafetySolutionProperties {
  nazevStavby: string;
  investorName: string;
  mistoStavby: string;
  stupenDokumentace: string;
  datum: string;
  zhodnoceniTechnickychZarizeniStavby: string;
  seznamPriloh: string;
  seznamPodkladu: string;
  uvod: string;
  kategorizaceStavbyZHlediskaPozarniBezpecnosti: string;
  konstrukcniReseniStavby: string;
  posouzeniPozarniBezpecnostiStaveb: string;
  pozarniOdolnostStavebnichKonstrukci: string;
  evakuaceADruhyAKapacityUnikovychCest: string;
  pozarneNebezpecnyProstorOdstupoveVzdalenosti: string;
  zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: string;
  pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: string;
  pozadavkyProHaseniPozaruAZachrannePrace: string;
}

export interface FireSafetySolution extends FireSafetySolutionProperties {
  id: string;
  userId: string;
  title: string;
  files?: FssTechnicalDocumentationFile[];
  totalCostUsd?: number;
  totalTokens?: number;
  generationCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FssPropertyFieldMeta {
  key: keyof FireSafetySolutionProperties;
  placeholder: string;
  label: string;
  category: "identification" | "documents" | "assessment" | "evacuation" | "extinguishing";
  type: "text" | "textarea" | "date";
  description?: string;
}

export const FSS_PROPERTY_FIELDS: FssPropertyFieldMeta[] = [
  {
    key: "nazevStavby",
    placeholder: "{{NAZEV_STAVBY}}",
    label: "Název stavby",
    category: "identification",
    type: "text",
    description: "Oficiální název posuzované stavby",
  },
  {
    key: "investorName",
    placeholder: "{{INVESTOR_NAME}}",
    label: "Jméno investora",
    category: "identification",
    type: "text",
    description: "Identifikace investora nebo objednatele stavby",
  },
  {
    key: "mistoStavby",
    placeholder: "{{MISTO_STAVBY}}",
    label: "Místo stavby",
    category: "identification",
    type: "text",
    description: "Adresa a parcelní čísla místa realizace stavby",
  },
  {
    key: "stupenDokumentace",
    placeholder: "{{STUPEN_DOKUMENTACE}}",
    label: "Stupeň dokumentace",
    category: "identification",
    type: "text",
    description: "Např. DSP, DÚR, DPS, Pasportizace",
  },
  {
    key: "datum",
    placeholder: "{{DATUM}}",
    label: "Datum vyhotovení",
    category: "identification",
    type: "date",
    description: "Datum zpracování nebo revize posouzení PBŘ",
  },
  {
    key: "uvod",
    placeholder: "{{UVOD}}",
    label: "Úvod a cíl řešení",
    category: "documents",
    type: "textarea",
    description: "Základní popis záměru, účel dokumentace a rozsah řešení PBŘ",
  },
  {
    key: "seznamPodkladu",
    placeholder: "{{SEZNAM_PODKLADU}}",
    label: "Seznam podkladů",
    category: "documents",
    type: "textarea",
    description: "Projektová dokumentace, normy ČSN, technické zprávy",
  },
  {
    key: "seznamPriloh",
    placeholder: "{{SEZNAM_PRILOH}}",
    label: "Seznam příloh",
    category: "documents",
    type: "textarea",
    description: "Výkresová dokumentace, schémata požárních úseků a situace",
  },
  {
    key: "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
    placeholder: "{{KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI}}",
    label: "Kategorizace stavby z hlediska PB",
    category: "assessment",
    type: "textarea",
    description: "Zařazení stavby do kategorie 0, I, II, III dle zákona o požární ochraně",
  },
  {
    key: "konstrukcniReseniStavby",
    placeholder: "{{KONSTRUKCNI_RESENI_STAVBY}}",
    label: "Konstrukční řešení stavby",
    category: "assessment",
    type: "textarea",
    description: "Druh konstrukčního systému (nehořlavý DP1, smíšený DP2, hořlavý DP3)",
  },
  {
    key: "posouzeniPozarniBezpecnostiStaveb",
    placeholder: "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}",
    label: "Posouzení požární bezpečnosti staveb",
    category: "assessment",
    type: "textarea",
    description: "Členění na požární úseky, požární riziko a stupeň PB",
  },
  {
    key: "pozarniOdolnostStavebnichKonstrukci",
    placeholder: "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}",
    label: "Požární odolnost stavebních konstrukcí",
    category: "assessment",
    type: "textarea",
    description: "Požadovaná a skutečná odolnost stěn, stropů, nosníků (REI, EW)",
  },
  {
    key: "evakuaceADruhyAKapacityUnikovychCest",
    placeholder: "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}",
    label: "Evakuace osob a únikové cesty",
    category: "evacuation",
    type: "textarea",
    description: "NÚC / CHÚC (A, B, C), šířky únikových cest a mezní délky",
  },
  {
    key: "pozarneNebezpecnyProstorOdstupoveVzdalenosti",
    placeholder: "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}",
    label: "Odstupové vzdálenosti a PNP",
    category: "evacuation",
    type: "textarea",
    description: "Požárně nebezpečný prostor, sálání tepla a odpadávání konstrukcí",
  },
  {
    key: "zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
    placeholder: "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}",
    label: "Zásobování požární vodou",
    category: "extinguishing",
    type: "textarea",
    description: "Vnější a vnitřní odběrní místa, hydranty a vydatnost zdrojů",
  },
  {
    key: "pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
    placeholder: "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}",
    label: "Požárně bezpečnostní zařízení",
    category: "extinguishing",
    type: "textarea",
    description: "EPS, SHZ, SOZ, nouzové osvětlení, bezpečnostní značení",
  },
  {
    key: "pozadavkyProHaseniPozaruAZachrannePrace",
    placeholder: "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}",
    label: "Zásahové cesty a hašení",
    category: "extinguishing",
    type: "textarea",
    description: "Přístupové komunikace, nástupní plochy pro techniku HZS",
  },
  {
    key: "zhodnoceniTechnickychZarizeniStavby",
    placeholder: "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}",
    label: "Zhodnocení technických zařízení",
    category: "extinguishing",
    type: "textarea",
    description: "VZT, vytápění, elektroinstalace, požární ucpávky",
  },
];

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

export type FssPromptTemplate = FssPropertyPrompt;

export interface GenerateFieldResponse {
  success: boolean;
  fieldKey: string;
  value?: string;
  generatedText?: string;
  tokens?: number;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  accumulatedCostUsd?: number;
  accumulatedTokens?: number;
  generationCount?: number;
  durationMs?: number;
  error?: string;
  result?: {
    fieldKey: string;
    placeholderKey: string;
    propertyName: string;
    value: string;
    promptUsed: string;
    systemPromptUsed: string;
    model: string;
    durationMs: number;
    tokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
  };
}

export interface GenerateBatchResponse {
  success: boolean;
  results?: Record<string, {
    fieldKey: string;
    placeholderKey: string;
    propertyName: string;
    value: string;
    promptUsed: string;
    systemPromptUsed: string;
    model: string;
    durationMs: number;
    tokens?: number;
    totalTokens?: number;
    estimatedCostUsd?: number;
    error?: string;
  }>;
  totalProperties?: number;
  successfulCount?: number;
  failedCount?: number;
  durationMs?: number;
  totalTokens?: number;
  tokens?: number;
  estimatedTotalCostUsd?: number;
  accumulatedCostUsd?: number;
  accumulatedTokens?: number;
  generationCount?: number;
  errors?: Record<string, string>;
}
