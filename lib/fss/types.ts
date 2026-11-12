export interface FssTechnicalDocumentationFile {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string;
  pathname: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateFireSafetySolutionInput extends Partial<FireSafetySolutionProperties> {
  userId: string;
  title?: string;
  nazevStavby?: string;
  files?: FssTechnicalDocumentationFile[];
  [key: string]: unknown;
}

export interface UpdateFireSafetySolutionInput extends Partial<FireSafetySolutionProperties> {
  title?: string;
  files?: FssTechnicalDocumentationFile[];
  [key: string]: unknown;
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
    label: "Datum",
    category: "identification",
    type: "text",
    description: "Datum vyhotovení nebo revize řešení",
  },
  {
    key: "uvod",
    placeholder: "{{UVOD}}",
    label: "Úvod",
    category: "documents",
    type: "textarea",
    description: "Úvodní popis záměru a cíl požárně bezpečnostního řešení",
  },
  {
    key: "seznamPodkladu",
    placeholder: "{{SEZNAM_PODKLADU}}",
    label: "Seznam podkladů",
    category: "documents",
    type: "textarea",
    description: "Projektové podklady, technické zprávy a platné normy ČSN",
  },
  {
    key: "seznamPriloh",
    placeholder: "{{SEZNAM_PRILOH}}",
    label: "Seznam příloh",
    category: "documents",
    type: "textarea",
    description: "Výkresová dokumentace, schémata požárních úseků",
  },
  {
    key: "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
    placeholder: "{{KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI}}",
    label: "Kategorizace stavby z hlediska požární bezpečnosti",
    category: "assessment",
    type: "textarea",
    description: "Zařazení dle vyhlášky a příslušných předpisů",
  },
  {
    key: "konstrukcniReseniStavby",
    placeholder: "{{KONSTRUKCNI_RESENI_STAVBY}}",
    label: "Konstrukční řešení stavby",
    category: "assessment",
    type: "textarea",
    description: "Konstrukční systém stavby (zděný, betonový, ocelový, dřevěný)",
  },
  {
    key: "posouzeniPozarniBezpecnostiStaveb",
    placeholder: "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}",
    label: "Posouzení požární bezpečnosti staveb",
    category: "assessment",
    type: "textarea",
    description: "Rozdělení do požárních úseků, požární riziko, SPB",
  },
  {
    key: "pozarniOdolnostStavebnichKonstrukci",
    placeholder: "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}",
    label: "Požární odolnost stavebních konstrukcí",
    category: "assessment",
    type: "textarea",
    description: "Požadovaná a navržená požární odolnost konstrukcí (REI, EW, EI)",
  },
  {
    key: "zhodnoceniTechnickychZarizeniStavby",
    placeholder: "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}",
    label: "Zhodnocení technických zařízení stavby",
    category: "assessment",
    type: "textarea",
    description: "Vytápění, vzduchotechnika, elektroinstalace, plyn",
  },
  {
    key: "evakuaceADruhyAKapacityUnikovychCest",
    placeholder: "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}",
    label: "Evakuace a druhy a kapacity únikových cest",
    category: "evacuation",
    type: "textarea",
    description: "Nechráněné a chráněné únikové cesty (NÚC, CHÚC), mezní délky a šířky",
  },
  {
    key: "pozarneNebezpecnyProstorOdstupoveVzdalenosti",
    placeholder: "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}",
    label: "Požárně nebezpečný prostor a odstupové vzdálenosti",
    category: "evacuation",
    type: "textarea",
    description: "Výpočet odstupových vzdáleností d a posouzení PNP",
  },
  {
    key: "zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
    placeholder: "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}",
    label: "Zabezpečení požární vodou nebo jinými hasebními látkami",
    category: "extinguishing",
    type: "textarea",
    description: "Vnější odběrná místa (hydranty) a vnitřní požární vodovody",
  },
  {
    key: "pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
    placeholder: "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}",
    label: "Požadavky na požárně bezpečnostní zařízení a značení",
    category: "extinguishing",
    type: "textarea",
    description: "EPS, SHZ, SOZ, nouzové osvětlení, bezpečnostní značení",
  },
  {
    key: "pozadavkyProHaseniPozaruAZachrannePrace",
    placeholder: "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}",
    label: "Požadavky pro hašení požárů a záchranné práce",
    category: "extinguishing",
    type: "textarea",
    description: "Příjezdové komunikace, nástupní plochy, zásahové cesty",
  },
];

export const TEMPLATE_PLACEHOLDER_TO_FIELD_KEY: Record<string, keyof FireSafetySolutionProperties> = {
  "{{NAZEV_STAVBY}}": "nazevStavby",
  "NAZEV_STAVBY": "nazevStavby",
  "{{INVESTOR_NAME}}": "investorName",
  "INVESTOR_NAME": "investorName",
  "{{MISTO_STAVBY}}": "mistoStavby",
  "MISTO_STAVBY": "mistoStavby",
  "{{STUPEN_DOKUMENTACE}}": "stupenDokumentace",
  "STUPEN_DOKUMENTACE": "stupenDokumentace",
  "{{DATUM}}": "datum",
  "DATUM": "datum",
  "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}": "zhodnoceniTechnickychZarizeniStavby",
  "ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY": "zhodnoceniTechnickychZarizeniStavby",
  "{{SEZNAM_PRILOH}}": "seznamPriloh",
  "SEZNAM_PRILOH": "seznamPriloh",
  "{{SEZNAM_PODKLADU}}": "seznamPodkladu",
  "SEZNAM_PODKLADU": "seznamPodkladu",
  "{{UVOD}}": "uvod",
  "UVOD": "uvod",
  "{{KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI}}": "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
  "{{KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI}}": "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
  "KATEGORIZACE_STAVBY_Z_HLEDISKA_POZARNI_BEZPECNOSTI": "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
  "KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI": "kategorizaceStavbyZHlediskaPozarniBezpecnosti",
  "{{KONSTRUKCNI_RESENI_STAVBY}}": "konstrukcniReseniStavby",
  "KONSTRUKCNI_RESENI_STAVBY": "konstrukcniReseniStavby",
  "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}": "posouzeniPozarniBezpecnostiStaveb",
  "POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB": "posouzeniPozarniBezpecnostiStaveb",
  "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}": "pozarniOdolnostStavebnichKonstrukci",
  "POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI": "pozarniOdolnostStavebnichKonstrukci",
  "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}": "evakuaceADruhyAKapacityUnikovychCest",
  "EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST": "evakuaceADruhyAKapacityUnikovychCest",
  "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}": "pozarneNebezpecnyProstorOdstupoveVzdalenosti",
  "POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI": "pozarneNebezpecnyProstorOdstupoveVzdalenosti",
  "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}": "zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
  "ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI": "zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami",
  "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}": "pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
  "POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI": "pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni",
  "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}": "pozadavkyProHaseniPozaruAZachrannePrace",
  "POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE": "pozadavkyProHaseniPozaruAZachrannePrace",
};
