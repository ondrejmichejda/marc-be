import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  FireSafetySolution,
  CreateFireSafetySolutionInput,
  FireSafetySolutionService,
  FSS_PROPERTY_FIELDS,
  TEMPLATE_PLACEHOLDER_TO_FIELD_KEY,
  FssPromptService,
  DEFAULT_FSS_PROMPTS,
} from "../lib/fss";
import { GET as getFssApi, POST as createFssApi } from "../app/api/fss/route";
import {
  GET as getFssByIdApi,
  PUT as updateFssByIdApi,
  DELETE as deleteFssByIdApi,
} from "../app/api/fss/[id]/route";
import { GET as exportFssByIdApi } from "../app/api/fss/[id]/export/route";
import {
  GET as exportFssParamApi,
  POST as exportFssPostApi,
} from "../app/api/fss/export/route";
import {
  GET as getFssFilesApi,
  POST as uploadFssFilesApi,
} from "../app/api/fss/[id]/files/route";
import {
  GET as getFssFileByIdApi,
  DELETE as deleteFssFileByIdApi,
} from "../app/api/fss/[id]/files/[fileId]/route";
import { GET as downloadFssFileApi } from "../app/api/fss/[id]/files/[fileId]/download/route";
import { GET as downloadFssFileDirectApi } from "../app/api/fss/files/[fileId]/download/route";
import { POST as uploadStandaloneFileApi } from "../app/api/fss/files/upload/route";
import { GET as getFssPromptsApi } from "../app/api/fss/prompts/route";
import {
  GET as getFssPromptByFieldApi,
  PUT as putFssPromptByFieldApi,
} from "../app/api/fss/prompts/[fieldKey]/route";
import { POST as resetFssPromptsApi } from "../app/api/fss/prompts/reset/route";
import { POST as generateFssApi } from "../app/api/fss/generate/route";
import { generateDocxExport, getExportFilename, FssBlobStorageService, FssTemplateService } from "../lib/fss";
import { UserAiSettingsService } from "../lib/openai";
import { UserService } from "../lib/auth/userService";
import PizZip from "pizzip";

test("Fire Safety Solutions: 18 Template Property Fields Metadata & Mappings", () => {
  // Verify there are exactly 18 template property fields
  assert.equal(FSS_PROPERTY_FIELDS.length, 18, "Must contain all 18 specified property fields");

  const expectedPlaceholders = [
    "{{NAZEV_STAVBY}}",
    "{{INVESTOR_NAME}}",
    "{{MISTO_STAVBY}}",
    "{{STUPEN_DOKUMENTACE}}",
    "{{DATUM}}",
    "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}",
    "{{SEZNAM_PRILOH}}",
    "{{SEZNAM_PODKLADU}}",
    "{{UVOD}}",
    "{{KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI}}",
    "{{KONSTRUKCNI_RESENI_STAVBY}}",
    "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}",
    "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}",
    "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}",
    "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}",
    "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}",
    "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}",
    "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}",
  ];

  const fieldPlaceholders = FSS_PROPERTY_FIELDS.map((f) => f.placeholder);
  for (const expected of expectedPlaceholders) {
    assert.ok(
      fieldPlaceholders.includes(expected),
      `Field metadata must include placeholder ${expected}`
    );
    assert.ok(
      TEMPLATE_PLACEHOLDER_TO_FIELD_KEY[expected],
      `Mapping dictionary must contain mapping for ${expected}`
    );
  }
});

test("FireSafetySolutionService: Create, List, Retrieve, Update, and Delete with all 18 properties", async () => {
  await FireSafetySolutionService.clearAll();

  // 1. Create a solution with all 18 properties
  const created = await FireSafetySolutionService.createSolution({
    userId: "user_test_fss_1",
    title: "Polyfunkční dům Oasis",
    nazevStavby: "Polyfunkční dům Oasis Brno",
    investorName: "Oasis Living s.r.o.",
    mistoStavby: "Brno - Střed, Lidická 42",
    stupenDokumentace: "DSP - Stavební povolení",
    datum: "2026-11-12",
    uvod: "Požárně bezpečnostní řešení stavby polyfunkčního bytového a obchodního domu.",
    seznamPodkladu: "1. Projektová dokumentace Atelier Brno\n2. ČSN 73 0802",
    seznamPriloh: "Příloha č. 1: Koordinační situace\nPříloha č. 2: Půdorysy NP a PP",
    kategorizaceStavbyZHlediskaPozarniBezpecnosti: "Stavba kategorie II dle vyhlášky č. 246/2001 Sb.",
    konstrukcniReseniStavby: "Železobetonový monolitický skelet, DP1.",
    posouzeniPozarniBezpecnostiStaveb: "Rozděleno do 8 požárních úseků, SPB III a IV.",
    pozarniOdolnostStavebnichKonstrukci: "Nosné sloupy REI 90, stropy REI 60, stěny REI 120 DP1.",
    zhodnoceniTechnickychZarizeniStavby: "Ústřední topení, vzduchotechnika s požárními klapkami EI 60-S.",
    evakuaceADruhyAKapacityUnikovychCest: "1x CHÚC typu A, šířka 1,5 u (900 mm), pro 140 osob.",
    pozarneNebezpecnyProstorOdstupoveVzdalenosti: "Maximální odstup d = 3,8 m, nepřesahuje na sousední pozemky.",
    zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: "Podzemní hydrant DN 100 ve vzdálenosti 30 m, vnitřní hadicové systémy D25.",
    pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: "Elektrická požární signalizace (EPS), nouzové osvětlení 60 min, tabulky úniku.",
    pozadavkyProHaseniPozaruAZachrannePrace: "Nástupní plocha před západním průčelím, šířka příjezdu 4 m.",
  });

  assert.ok(created.id);
  assert.equal(created.nazevStavby, "Polyfunkční dům Oasis Brno");
  assert.equal(created.investorName, "Oasis Living s.r.o.");
  assert.equal(created.evakuaceADruhyAKapacityUnikovychCest, "1x CHÚC typu A, šířka 1,5 u (900 mm), pro 140 osob.");

  // 2. Retrieve by ID
  const retrieved = await FireSafetySolutionService.getSolutionById(created.id);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, created.id);
  assert.equal(retrieved?.pozarniOdolnostStavebnichKonstrukci, "Nosné sloupy REI 90, stropy REI 60, stěny REI 120 DP1.");

  // 3. List solutions with search
  const listAll = await FireSafetySolutionService.listSolutions();
  assert.ok(listAll.length >= 1);
  const searched = await FireSafetySolutionService.listSolutions({ search: "Oasis" });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, created.id);

  // 4. Update fields
  const updated = await FireSafetySolutionService.updateSolution(created.id, "user_test_fss_1", {
    investorName: "Oasis Living Development a.s.",
    datum: "2026-11-15",
    pozadavkyProHaseniPozaruAZachrannePrace: "Aktualizovaná nástupní plocha 4 x 15 m.",
  });
  assert.equal(updated.investorName, "Oasis Living Development a.s.");
  assert.equal(updated.datum, "2026-11-15");
  assert.equal(updated.nazevStavby, "Polyfunkční dům Oasis Brno"); // Unchanged property preserved

  // 5. Delete solution
  const deleted = await FireSafetySolutionService.deleteSolution(created.id);
  assert.equal(deleted, true);
  const afterDelete = await FireSafetySolutionService.getSolutionById(created.id);
  assert.equal(afterDelete, null);

  // 6. Verify permanence: re-initialize storage in memory and verify item does not reappear
  (FireSafetySolutionService as unknown as { initialized: boolean }).initialized = false;
  const listAfterReinit = await FireSafetySolutionService.listSolutions({ search: "Oasis" });
  assert.equal(listAfterReinit.length, 0, "Deleted solution must not reappear after storage reload");
});

test("Fire Safety Solutions: Deletion and persistence", async () => {
  // Create a solution, delete it, and verify it does not reappear after storage reload
  const temp = await FireSafetySolutionService.createSolution({
    userId: "admin",
    title: "Dočasný projekt k odstranění",
    nazevStavby: "Dočasný projekt",
  });

  const id = temp.id;
  const delRes = await FireSafetySolutionService.deleteSolution(id);
  assert.equal(delRes, true);

  // Force service storage re-initialization
  (FireSafetySolutionService as unknown as { initialized: boolean }).initialized = false;
  const found = await FireSafetySolutionService.getSolutionById(id);
  assert.equal(found, null);

  const list = await FireSafetySolutionService.listSolutions();
  assert.equal(list.some((s) => s.id === id), false);
});

test("Fire Safety Solutions: Template Placeholders Input Compatibility", async () => {
  // Test that raw placeholder tags in input correctly populate fields
  const created = await FireSafetySolutionService.createSolution({
    userId: "test_user_placeholders",
    "{{NAZEV_STAVBY}}": "Zimní stadion Arena",
    "{{INVESTOR_NAME}}": "Město Sportovní",
    "{{MISTO_STAVBY}}": "Sportovní 10",
    "{{STUPEN_DOKUMENTACE}}": "DSP",
    "{{DATUM}}": "2026-11-12",
    "{{ZHODNOCENI_TECHNICKYCH_ZARIZENI_STAVBY}}": "Chlazení ledové plochy čpavkem s detekcí úniku",
    "{{SEZNAM_PRILOH}}": "Přílohy 1-5",
    "{{SEZNAM_PODKLADU}}": "ČSN 73 0802",
    "{{UVOD}}": "Úvodní zpráva zimního stadionu",
    "{{KATEGORIZACE_STAVBY_Z_HLEDISKA)POZARNI_BEZPECNOSTI}}": "Kategorie III - shromažďovací prostor",
    "{{KONSTRUKCNI_RESENI_STAVBY}}": "Ocelové nosníky s požárním nástřikem",
    "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}": "Posouzení haly a tribun",
    "{{POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI}}": "R 45 DP1",
    "{{EVAKUACE_A_DRUHY_A_KAPACITY_UNIKOVYCH_CEST}}": "Volné únikové cesty z tribun do 3 minut",
    "{{POZARNE_NEBEZPECNY_PROSTOR_ODSTUPOVE_VZDALENOSTI}}": "Odstup 12 m",
    "{{ZABEZPECENI_POZARNI_VODOU_NEBO_JINYMI_HASEBNIMI_LATKAMI}}": "Hydranty DN 150",
    "{{POZADAVKY_NA_POZARNE_BEZPECNOSTNI_ZARIZENI_A_ZNACENI}}": "EPS, SOZ, evakuační rozhlas",
    "{{POZADAVKY_PRO_HASENI_POZARU_A_ZACHRANNE_PRACE}}": "Příjezdová komunikace a 2 nástupní plochy",
  } as unknown as CreateFireSafetySolutionInput);

  assert.equal(created.nazevStavby, "Zimní stadion Arena");
  assert.equal(created.investorName, "Město Sportovní");
  assert.equal(
    created.kategorizaceStavbyZHlediskaPozarniBezpecnosti,
    "Kategorie III - shromažďovací prostor"
  );
  assert.equal(
    created.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami,
    "Hydranty DN 150"
  );

  // Cleanup
  await FireSafetySolutionService.deleteSolution(created.id);
});

test("API Routes: /api/fss and /api/fss/[id] integration", async () => {
  // 1. POST /api/fss (Create)
  const createReq = new NextRequest("http://localhost:3000/api/fss", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "api_test_user",
    },
    body: JSON.stringify({
      title: "Bytový dům Květná",
      nazevStavby: "Bytový dům Květná",
      investorName: "Květná Rezidence s.r.o.",
      mistoStavby: "Olomouc, Květná 14",
      stupenDokumentace: "DSP",
      datum: "2026-11-12",
      uvod: "Novostavba 4-podlažního bytového domu s 16 byty.",
      kategorizaceStavbyZHlediskaPozarniBezpecnosti: "Stavba kategorie I.",
      konstrukcniReseniStavby: "Zděný stěnový systém z keramických tvárnic.",
      posouzeniPozarniBezpecnostiStaveb: "Byty tvoří samostatné požární úseky.",
      pozarniOdolnostStavebnichKonstrukci: "REI 60 DP1.",
      evakuaceADruhyAKapacityUnikovychCest: "CHÚC typu A, kapacita 48 osob.",
      pozarneNebezpecnyProstorOdstupoveVzdalenosti: "d = 2,5 m.",
      zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: "Podzemní hydrant 25 m.",
      pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: "Nouzové osvětlení a fotoluminiscenční značení.",
      pozadavkyProHaseniPozaruAZachrannePrace: "Příjezd z ulice Květná.",
    }),
  });

  const createRes = await createFssApi(createReq);
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  const createdId = createData.solution.id;
  assert.ok(createdId);

  // 2. GET /api/fss (List)
  const listReq = new NextRequest("http://localhost:3000/api/fss?search=Květná", {
    headers: { "x-user-id": "api_test_user" },
  });
  const listRes = await getFssApi(listReq);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(listData.solutions.some((s: FireSafetySolution) => s.id === createdId));

  // 3. GET /api/fss/[id]
  const getByIdReq = new NextRequest(`http://localhost:3000/api/fss/${createdId}`, {
    headers: { "x-user-id": "api_test_user" },
  });
  const getByIdRes = await getFssByIdApi(getByIdReq, { params: Promise.resolve({ id: createdId }) });
  assert.equal(getByIdRes.status, 200);
  const getByIdData = await getByIdRes.json();
  assert.equal(getByIdData.solution.investorName, "Květná Rezidence s.r.o.");

  // 4. PUT /api/fss/[id] (Update)
  const updateReq = new NextRequest(`http://localhost:3000/api/fss/${createdId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": "api_test_user",
    },
    body: JSON.stringify({
      investorName: "Květná Rezidence holding a.s.",
      stupenDokumentace: "DPS - Dokumentace pro provádění stavby",
    }),
  });
  const updateRes = await updateFssByIdApi(updateReq, { params: Promise.resolve({ id: createdId }) });
  assert.equal(updateRes.status, 200);
  const updateData = await updateRes.json();
  assert.equal(updateData.solution.investorName, "Květná Rezidence holding a.s.");
  assert.equal(updateData.solution.stupenDokumentace, "DPS - Dokumentace pro provádění stavby");

  // 5. DELETE /api/fss/[id] (Delete)
  const deleteReq = new NextRequest(`http://localhost:3000/api/fss/${createdId}`, {
    method: "DELETE",
    headers: { "x-user-id": "api_test_user" },
  });
  const deleteRes = await deleteFssByIdApi(deleteReq, { params: Promise.resolve({ id: createdId }) });
  assert.equal(deleteRes.status, 200);
  const deleteData = await deleteRes.json();
  assert.equal(deleteData.success, true);
});

test("Docx Export: generateDocxExport replaces all 18+ template placeholders and sets proper filename", async () => {
  await FssTemplateService.resetToDefault();
  const sampleSolution: Partial<FireSafetySolution> = {
    title: "Polyfunkční dům Oasis Brno",
    nazevStavby: "Polyfunkční dům Oasis Brno",
    investorName: "Oasis Real Estate a.s.",
    mistoStavby: "Brno, Lidická 100",
    stupenDokumentace: "DSP",
    datum: "2026-11-12",
    uvod: "Úvodní text projektu PBŘ polyfunkčního domu Oasis.",
    seznamPodkladu: "Podklady 1-3",
    seznamPriloh: "Příloha 1: Situace",
    kategorizaceStavbyZHlediskaPozarniBezpecnosti: "Kategorie II",
    konstrukcniReseniStavby: "ŽB skelet DP1",
    posouzeniPozarniBezpecnostiStaveb: "6 požárních úseků",
    pozarniOdolnostStavebnichKonstrukci: "REI 60 DP1",
    zhodnoceniTechnickychZarizeniStavby: "Vzduchotechnika s klapkami",
    evakuaceADruhyAKapacityUnikovychCest: "CHÚC A pro 120 osob",
    pozarneNebezpecnyProstorOdstupoveVzdalenosti: "d = 4,2 m",
    zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: "Hydrant DN 100",
    pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: "EPS a tabulky",
    pozadavkyProHaseniPozaruAZachrannePrace: "Nástupní plocha 4x12m",
  };

  // 1. Filename sanitization
  const filename = getExportFilename(sampleSolution);
  assert.equal(filename, "Polyfunkční_dům_Oasis_Brno.docx");

  // 2. Generate DOCX binary buffer
  const { buffer, filename: exportedFilename } = generateDocxExport(sampleSolution);
  assert.ok(buffer);
  assert.ok(buffer.length > 5000, "DOCX buffer must be generated");
  assert.equal(exportedFilename, "Polyfunkční_dům_Oasis_Brno.docx");

  // 3. Inspect generated docx contents to verify all placeholders replaced
  const zip = new PizZip(buffer);
  const documentXml = zip.file("word/document.xml")?.asText() || "";
  const textOnly = documentXml.replace(/<[^>]+>/g, "");

  // Verify none of the placeholders remain unsubstituted
  const remainingPlaceholders = textOnly.match(/\{\{[^}]+\}\}/g);
  assert.equal(remainingPlaceholders, null, `No placeholders should remain unreplaced, found: ${remainingPlaceholders}`);

  // Verify substituted text values appear inside
  assert.ok(textOnly.includes("Polyfunkční dům Oasis Brno"));
  assert.ok(textOnly.includes("Oasis Real Estate a.s."));
  assert.ok(textOnly.includes("Brno, Lidická 100"));
  assert.ok(textOnly.includes("ŽB skelet DP1"));
  assert.ok(textOnly.includes("Hydrant DN 100"));
});

test("API Routes: Export endpoints GET /api/fss/[id]/export and POST /api/fss/export", async () => {
  // 1. Create a solution first
  const solution = await FireSafetySolutionService.createSolution({
    userId: "test_export_user",
    title: "Centrum Výzkumu a Inovací",
    nazevStavby: "Centrum Výzkumu a Inovací",
    investorName: "Inovační Park a.s.",
    mistoStavby: "Praha 6, Dejvice",
    stupenDokumentace: "DPS",
    datum: "2026-11-12",
    uvod: "PBŘ pro budovu výzkumného centra.",
    kategorizaceStavbyZHlediskaPozarniBezpecnosti: "Kategorie II",
    konstrukcniReseniStavby: "Skelet DP1",
    posouzeniPozarniBezpecnostiStaveb: "SPB IV",
    pozarniOdolnostStavebnichKonstrukci: "REI 90",
    zhodnoceniTechnickychZarizeniStavby: "Klimatizace s EPS detektory",
    evakuaceADruhyAKapacityUnikovychCest: "2x CHÚC A",
    pozarneNebezpecnyProstorOdstupoveVzdalenosti: "d = 5,0 m",
    zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami: "Vnější hydrant DN 150",
    pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni: "EPS a nouzové osvětlení",
    pozadavkyProHaseniPozaruAZachrannePrace: "Nástupní plocha HZS",
    seznamPriloh: "Situace a půdorysy",
    seznamPodkladu: "ČSN 73 0802",
  });

  // 2. GET /api/fss/[id]/export
  const exportByIdReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/export`, {
    headers: { "x-user-id": "test_export_user" },
  });
  const exportByIdRes = await exportFssByIdApi(exportByIdReq, { params: Promise.resolve({ id: solution.id }) });

  assert.equal(exportByIdRes.status, 200);
  assert.equal(
    exportByIdRes.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const disposition = exportByIdRes.headers.get("content-disposition") || "";
  assert.ok(
    decodeURIComponent(disposition).includes("Centrum_Výzkumu_a_Inovací.docx") ||
    disposition.includes("Centrum_Vyzkumu_a_Inovaci.docx")
  );
  const arrayBuffer = await exportByIdRes.arrayBuffer();
  assert.ok(arrayBuffer.byteLength > 5000);

  // 3. GET /api/fss/export?id=...
  const exportParamReq = new NextRequest(`http://localhost:3000/api/fss/export?id=${solution.id}`, {
    headers: { "x-user-id": "test_export_user" },
  });
  const exportParamRes = await exportFssParamApi(exportParamReq);
  assert.equal(exportParamRes.status, 200);
  assert.equal(
    exportParamRes.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  // 4. POST /api/fss/export (on-the-fly export from body)
  const postExportReq = new NextRequest("http://localhost:3000/api/fss/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nazevStavby: "Rodinný dům Luční",
      investorName: "Petr Nový",
      mistoStavby: "Hradec Králové",
      stupenDokumentace: "DSP",
      datum: "2026-11-12",
      uvod: "Novostavba RD.",
    }),
  });
  const postExportRes = await exportFssPostApi(postExportReq);
  assert.equal(postExportRes.status, 200);
  assert.equal(
    postExportRes.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const postDisposition = postExportRes.headers.get("content-disposition") || "";
  assert.ok(
    decodeURIComponent(postDisposition).includes("Rodinný_dům_Luční.docx") ||
    postDisposition.includes("Rodinny_dum_Lucni.docx")
  );

  // Cleanup
  await FireSafetySolutionService.deleteSolution(solution.id);
});

test("FSS Technical Documentation Files: Upload, Persistence, Retrieval, Download, and Deletion via Vercel Blob solution", async () => {
  // Create an authenticated user for the test
  const testProfile = {
    id: `blob_test_${Date.now()}`,
    email: `blob.test.${Date.now()}@gmail.com`,
    name: "Blob Test User",
    emailVerified: true,
  };
  const { user: testUser, token: testToken } = await UserService.registerOrLoginGoogleUser(testProfile);

  // 1. Create a solution owned by the authenticated user
  const solution = await FireSafetySolutionService.createSolution({
    userId: testUser.id,
    title: "Nemocnice Motol - Pavilon F",
    nazevStavby: "Nemocnice Motol - Pavilon F",
    investorName: "FN Motol",
    mistoStavby: "Praha 5",
  });

  // 2. Upload file via FssBlobStorageService
  const samplePdfBuffer = Buffer.from("%PDF-1.4 Mock technical documentation content for Fire Safety Solution");
  const uploadedBlob = await FssBlobStorageService.uploadFile({
    buffer: samplePdfBuffer,
    filename: "Technicka_Zprava_PBR_Motol.pdf",
    contentType: "application/pdf",
    fssId: solution.id,
    uploadedBy: "test_blob_user",
    description: "Kompletní technická zpráva PBŘ",
  });

  assert.ok(uploadedBlob.id);
  assert.equal(uploadedBlob.name, "Technicka_Zprava_PBR_Motol.pdf");
  assert.equal(uploadedBlob.contentType, "application/pdf");
  assert.equal(uploadedBlob.size, samplePdfBuffer.length);
  assert.ok(uploadedBlob.url);
  assert.ok(uploadedBlob.downloadUrl);

  // 3. Attach file to solution
  const updatedWithFile = await FireSafetySolutionService.addFileToSolution(solution.id, uploadedBlob);
  assert.equal(updatedWithFile.files?.length, 1);
  assert.equal(updatedWithFile.files?.[0].id, uploadedBlob.id);

  // 4. GET /api/fss/[id]/files (List files endpoint)
  const listFilesReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files`, {
    headers: { Authorization: `Bearer ${testToken}` },
  });
  const listFilesRes = await getFssFilesApi(listFilesReq, { params: Promise.resolve({ id: solution.id }) });
  assert.equal(listFilesRes.status, 200);
  const listFilesData = await listFilesRes.json();
  assert.equal(listFilesData.files.length, 1);
  assert.equal(listFilesData.files[0].name, "Technicka_Zprava_PBR_Motol.pdf");

  // 5. POST /api/fss/[id]/files (Upload multiple files via multipart FormData)
  const formData = new FormData();
  const file1 = new File(["Drawing 1: Floorplan 1.NP DWG content"], "Vyres_1NP_Pozarni_Useky.dwg", {
    type: "application/acad",
  });
  const file2 = new File(["Drawing 2: Situation Map PDF content"], "Situace_Sireni_Pozaru.pdf", {
    type: "application/pdf",
  });
  formData.append("files", file1);
  formData.append("files", file2);
  formData.append("uploadedBy", "test_blob_user");

  const uploadMultiReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  const uploadMultiRes = await uploadFssFilesApi(uploadMultiReq, { params: Promise.resolve({ id: solution.id }) });
  assert.equal(uploadMultiRes.status, 200);
  const uploadMultiData = await uploadMultiRes.json();
  assert.equal(uploadMultiData.success, true);
  assert.equal(uploadMultiData.uploaded.length, 2);
  assert.equal(uploadMultiData.files.length, 3); // 1 initial + 2 new

  // 6. GET /api/fss/[id]/files/[fileId] (Retrieve single file metadata)
  const targetFileId = uploadMultiData.uploaded[0].id;
  const getSingleFileReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}`, {
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  const getSingleFileRes = await getFssFileByIdApi(getSingleFileReq, {
    params: Promise.resolve({ id: solution.id, fileId: targetFileId }),
  });
  assert.equal(getSingleFileRes.status, 200);
  const singleFileData = await getSingleFileRes.json();
  assert.equal(singleFileData.file.name, "Vyres_1NP_Pozarni_Useky.dwg");

  // 7. GET /api/fss/[id]/files/[fileId]/download (Download streaming endpoint)
  const downloadReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}/download`, {
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  const downloadRes = await downloadFssFileApi(downloadReq, {
    params: Promise.resolve({ id: solution.id, fileId: targetFileId }),
  });
  assert.equal(downloadRes.status, 200);
  const downloadDisposition = downloadRes.headers.get("content-disposition") || "";
  assert.ok(downloadDisposition.includes("attachment"));
  assert.ok(downloadDisposition.includes("Vyres_1NP_Pozarni_Useky.dwg"));
  const downloadedBytes = await downloadRes.arrayBuffer();
  assert.equal(
    Buffer.from(downloadedBytes).toString("utf-8"),
    "Drawing 1: Floorplan 1.NP DWG content"
  );

  // 8. GET /api/fss/files/[fileId]/download (Direct standalone download endpoint)
  const directDownloadReq = new NextRequest(`http://localhost:3000/api/fss/files/${targetFileId}/download`);
  const directDownloadRes = await downloadFssFileDirectApi(directDownloadReq, {
    params: Promise.resolve({ fileId: targetFileId }),
  });
  assert.equal(directDownloadRes.status, 200);
  const directDownloadedBytes = await directDownloadRes.arrayBuffer();
  assert.equal(
    Buffer.from(directDownloadedBytes).toString("utf-8"),
    "Drawing 1: Floorplan 1.NP DWG content"
  );

  // 9. POST /api/fss/files/upload (Standalone draft file upload endpoint)
  const standaloneFormData = new FormData();
  const draftFile = new File(["Staticky vypocet konstrukci DP1"], "Staticky_Vypocet.pdf", {
    type: "application/pdf",
  });
  standaloneFormData.append("file", draftFile);
  const standaloneUploadReq = new NextRequest("http://localhost:3000/api/fss/files/upload", {
    method: "POST",
    body: standaloneFormData,
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  const standaloneUploadRes = await uploadStandaloneFileApi(standaloneUploadReq);
  assert.equal(standaloneUploadRes.status, 200);
  const standaloneUploadData = await standaloneUploadRes.json();
  assert.equal(standaloneUploadData.file.name, "Staticky_Vypocet.pdf");

  // 10. DELETE /api/fss/[id]/files/[fileId] (Delete file endpoint)
  const deleteFileReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${testToken}`,
    },
  });
  const deleteFileRes = await deleteFssFileByIdApi(deleteFileReq, {
    params: Promise.resolve({ id: solution.id, fileId: targetFileId }),
  });
  assert.equal(deleteFileRes.status, 200);
  const deleteFileData = await deleteFileRes.json();
  assert.equal(deleteFileData.success, true);
  assert.equal(deleteFileData.files.length, 2);
  assert.ok(!deleteFileData.files.some((f: { id: string }) => f.id === targetFileId));

  // Cleanup
  await FireSafetySolutionService.deleteSolution(solution.id);
  await UserService.deleteUser(testUser.id);
});

test("FssPromptService: 18 General AI Prompts CRUD, Reset, and File Attachment Option", async () => {
  // 1. List all prompts (must have exactly 18 prompts)
  const prompts = await FssPromptService.listPrompts();
  assert.equal(prompts.length, 18, "Must contain general prompts for all 18 FSS properties");

  // Verify all fields are covered
  for (const field of FSS_PROPERTY_FIELDS) {
    const prompt = prompts.find((p) => p.fieldKey === field.key);
    assert.ok(prompt, `General prompt for field '${field.key}' must exist`);
    assert.equal(prompt.placeholderKey, field.placeholder);
    assert.ok(prompt.systemPrompt.length > 0, "System prompt must not be empty");
    assert.ok(prompt.userPrompt.length > 0, "User prompt must not be empty");
    assert.equal(typeof prompt.includeFiles, "boolean");
  }

  // 2. Retrieve a single prompt by fieldKey
  const promptNazev = await FssPromptService.getPromptByFieldKey("nazevStavby");
  assert.ok(promptNazev);
  assert.equal(promptNazev?.fieldKey, "nazevStavby");
  assert.equal(promptNazev?.propertyName, "Název stavby");

  // 3. Update prompt (Admin modification)
  const updatedPrompt = await FssPromptService.updatePrompt(
    "nazevStavby",
    {
      description: "Upravený popis pro název stavby",
      systemPrompt: "Vlastní systémový prompt pro název stavby",
      includeFiles: true,
      temperature: 0.15,
    },
    "admin_test"
  );

  assert.equal(updatedPrompt.description, "Upravený popis pro název stavby");
  assert.equal(updatedPrompt.systemPrompt, "Vlastní systémový prompt pro název stavby");
  assert.equal(updatedPrompt.temperature, 0.15);
  assert.equal(updatedPrompt.updatedBy, "admin_test");

  // Verify persistent retrieval
  const retrievedUpdated = await FssPromptService.getPromptByFieldKey("nazevStavby");
  assert.equal(retrievedUpdated?.systemPrompt, "Vlastní systémový prompt pro název stavby");

  // 4. Reset to defaults
  const resetList = await FssPromptService.resetPromptsToDefaults("admin_reset");
  assert.equal(resetList.length, 18);
  const resetNazev = await FssPromptService.getPromptByFieldKey("nazevStavby");
  assert.equal(resetNazev?.systemPrompt, DEFAULT_FSS_PROMPTS.find((p) => p.fieldKey === "nazevStavby")?.systemPrompt);
});

test("FssPromptService: Single Property & Parallel Generation across 18 Properties with Uploaded Files", async () => {
  const sampleFiles = [
    {
      id: "doc_test_1",
      name: "Architektonicka_studie_A1.pdf",
      size: 512000,
      contentType: "application/pdf",
      uploadedAt: new Date().toISOString(),
      description: "Architektonická studie 6NP bytového domu",
      url: "/api/fss/files/doc_test_1/download",
      pathname: "fss/general/doc_test_1",
    },
    {
      id: "doc_test_2",
      name: "Koordinacni_situace.dwg",
      size: 1024000,
      contentType: "application/acad",
      uploadedAt: new Date().toISOString(),
      description: "Situační výkres se sousedními parcelami",
      url: "/api/fss/files/doc_test_2/download",
      pathname: "fss/general/doc_test_2",
    },
  ];

  const knownProperties = {
    nazevStavby: "Bytový komplex Green Park",
    investorName: "Green Park Development a.s.",
    mistoStavby: "Brno, k.ú. Královo Pole",
  };

  // 1. Verify token enforcement: generation fails when user has not configured API key
  const unconfiguredResult = await FssPromptService.generateProperty({
    fieldKey: "konstrukcniReseniStavby",
    properties: knownProperties,
    files: sampleFiles,
    userId: "unconfigured_user_without_key",
  });
  assert.ok(unconfiguredResult.error, "Must return error when user has no API token configured");
  assert.ok(
    unconfiguredResult.error.includes("OpenAI API token není nastaven"),
    "Error message must instruct user to set OpenAI API token in AI Settings"
  );

  // 2. Configure personal OpenAI API token for test user
  const testUserId = "test_fss_engineer_user";
  await UserAiSettingsService.saveSettings(testUserId, {
    apiKey: "sk-test-mock-user-token-12345",
    defaultModel: "gpt-4o",
    webSearchEnabled: true,
  });

  // 3. Single property generation with configured user token
  const singleResult = await FssPromptService.generateProperty({
    fieldKey: "konstrukcniReseniStavby",
    properties: knownProperties,
    files: sampleFiles,
    userIdentifier: "test_engineer@company.cz",
    userId: testUserId,
  });

  assert.equal(singleResult.fieldKey, "konstrukcniReseniStavby");
  assert.ok(singleResult.value.length > 0, "Generated value must not be empty");
  assert.equal(singleResult.filesIncludedCount, 2);
  assert.ok(singleResult.durationMs >= 0);
  assert.ok(typeof singleResult.tokens === "number" && singleResult.tokens > 0, "Tokens must be tracked for single property");
  assert.ok(typeof singleResult.estimatedCostUsd === "number" && singleResult.estimatedCostUsd >= 0, "Estimated cost in USD must be calculated for single property");

  // 4. Full parallel generation for all 18 properties
  const allResult = await FssPromptService.generateAllProperties({
    properties: knownProperties,
    files: sampleFiles,
    userIdentifier: "test_engineer@company.cz",
    userId: testUserId,
  });

  assert.equal(allResult.success, true);
  assert.equal(allResult.totalProperties, 18);
  assert.equal(allResult.successfulCount, 18);
  assert.equal(allResult.failedCount, 0);
  assert.ok(typeof allResult.totalTokens === "number" && allResult.totalTokens > 0, "Total tokens must be aggregated");
  assert.ok(typeof allResult.estimatedTotalCostUsd === "number" && allResult.estimatedTotalCostUsd >= 0, "Total estimated USD cost must be aggregated");

  // Verify all 18 properties are present in generated properties map
  for (const field of FSS_PROPERTY_FIELDS) {
    const val = (allResult.properties as Record<string, string>)[field.key];
    assert.ok(val !== undefined, `Property ${field.key} must be generated in parallel`);
    assert.ok(val.length > 0, `Value for ${field.key} must not be empty`);
  }
});

test("FSS AI Prompts & Parallel Generation REST API Endpoints", async () => {
  const testUserId = "test_fss_api_user";
  await UserAiSettingsService.saveSettings(testUserId, {
    apiKey: "sk-test-fss-api-key",
    defaultModel: "gpt-4o",
  });

  // 1. GET /api/fss/prompts (Readable for anyone within application)
  const getPromptsRes = await getFssPromptsApi();
  assert.equal(getPromptsRes.status, 200);
  const getPromptsData = await getPromptsRes.json();
  assert.equal(getPromptsData.success, true);
  assert.equal(getPromptsData.count, 18);
  assert.equal(getPromptsData.prompts.length, 18);

  // 2. GET /api/fss/prompts/[fieldKey]
  const getSinglePromptReq = new NextRequest("http://localhost:3000/api/fss/prompts/posouzeniPozarniBezpecnostiStaveb");
  const getSinglePromptRes = await getFssPromptByFieldApi(getSinglePromptReq, {
    params: Promise.resolve({ fieldKey: "posouzeniPozarniBezpecnostiStaveb" }),
  });
  assert.equal(getSinglePromptRes.status, 200);
  const singlePromptData = await getSinglePromptRes.json();
  assert.equal(singlePromptData.prompt.fieldKey, "posouzeniPozarniBezpecnostiStaveb");
  assert.equal(singlePromptData.prompt.placeholderKey, "{{POSOUZENI_POZARNI_BEZPECNOSTI_STAVEB}}");

  // 3. PUT /api/fss/prompts/[fieldKey] (Update single prompt)
  const putReq = new NextRequest("http://localhost:3000/api/fss/prompts/posouzeniPozarniBezpecnostiStaveb", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userPrompt: "Aktualizovaný user prompt pro posouzení požární bezpečnosti staveb.",
      includeFiles: true,
      temperature: 0.25,
    }),
  });
  const putRes = await putFssPromptByFieldApi(putReq, {
    params: Promise.resolve({ fieldKey: "posouzeniPozarniBezpecnostiStaveb" }),
  });
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.success, true);
  assert.equal(putData.prompt.userPrompt, "Aktualizovaný user prompt pro posouzení požární bezpečnosti staveb.");

  // 4. POST /api/fss/generate (Single property generation endpoint with user token)
  const genSingleReq = new NextRequest("http://localhost:3000/api/fss/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fieldKey: "investorName",
      userId: testUserId,
      properties: {
        nazevStavby: "Rezidence Pod Lipami",
      },
      files: [
        {
          id: "test_f1",
          name: "Smlouva_o_dilo.pdf",
          size: 12000,
          contentType: "application/pdf",
          uploadedAt: new Date().toISOString(),
          description: "Investor: POD LIPAMI RESIDENCE s.r.o.",
        },
      ],
    }),
  });
  const genSingleRes = await generateFssApi(genSingleReq);
  assert.equal(genSingleRes.status, 200);
  const genSingleData = await genSingleRes.json();
  assert.equal(genSingleData.success, true);
  assert.equal(genSingleData.fieldKey, "investorName");
  assert.ok(genSingleData.value.length > 0);
  assert.ok(typeof genSingleData.tokens === "number" && genSingleData.tokens > 0, "Single API response must include tokens");
  assert.ok(typeof genSingleData.estimatedCostUsd === "number" && genSingleData.estimatedCostUsd >= 0, "Single API response must include cost in USD");

  // 5. POST /api/fss/generate (Parallel generation across all 18 properties)
  const genAllReq = new NextRequest("http://localhost:3000/api/fss/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: testUserId,
      properties: {
        nazevStavby: "Logistické centrum VGP Park",
        investorName: "VGP CZ s.r.o.",
        mistoStavby: "Plzeň - Borská pole",
      },
      files: [
        {
          id: "test_f2",
          name: "Technicka_dokumentace_Hala_A.pdf",
          size: 340000,
          contentType: "application/pdf",
          uploadedAt: new Date().toISOString(),
          description: "Jednopodlažní skladová hala, půdorys 80x40m, DP1",
        },
      ],
    }),
  });
  const genAllRes = await generateFssApi(genAllReq);
  assert.equal(genAllRes.status, 200);
  const genAllData = await genAllRes.json();
  assert.equal(genAllData.success, true);
  assert.equal(genAllData.totalProperties, 18);
  assert.equal(genAllData.successfulCount, 18);
  assert.ok(genAllData.properties.nazevStavby !== undefined);
  assert.ok(genAllData.properties.evakuaceADruhyAKapacityUnikovychCest !== undefined);
  assert.ok(genAllData.properties.pozadavkyProHaseniPozaruAZachrannePrace !== undefined);
  assert.ok(typeof genAllData.totalTokens === "number" && genAllData.totalTokens > 0, "Bulk API response must include totalTokens");
  assert.ok(typeof genAllData.estimatedTotalCostUsd === "number" && genAllData.estimatedTotalCostUsd >= 0, "Bulk API response must include estimatedTotalCostUsd");

  // 6. POST /api/fss/prompts/reset (Reset prompts endpoint)
  const resetReq = new NextRequest("http://localhost:3000/api/fss/prompts/reset", {
    method: "POST",
  });
  const resetRes = await resetFssPromptsApi(resetReq);
  assert.equal(resetRes.status, 200);
  const resetData = await resetRes.json();
  assert.equal(resetData.success, true);
  assert.equal(resetData.count, 18);
});

test("Fire Safety Solutions: Per-FSS Accumulated Cost and Token Tracking", async () => {
  const costUserId = "cost_tracker_user";
  await UserAiSettingsService.saveSettings(costUserId, {
    apiKey: "sk-test-cost-tracker-token",
    defaultModel: "gpt-4o",
  });

  // 1. Create a solution
  const testFss = await FireSafetySolutionService.createSolution({
    userId: costUserId,
    title: "Centrum Inovací a Výzkumu",
    nazevStavby: "Centrum Inovací a Výzkumu Brno",
    investorName: "VUT Brno",
    mistoStavby: "Technologická 1, Brno",
  });

  assert.equal(testFss.totalCostUsd, 0, "Initial cost should be 0");
  assert.equal(testFss.totalTokens, 0, "Initial tokens should be 0");
  assert.equal(testFss.generationCount, 0, "Initial generation count should be 0");

  // 2. Accumulate AI usage directly via service
  const updated1 = await FireSafetySolutionService.accumulateAiUsage(testFss.id, 0.00125, 450);
  assert.ok(updated1);
  assert.equal(updated1.totalCostUsd, 0.00125);
  assert.equal(updated1.totalTokens, 450);
  assert.equal(updated1.generationCount, 1);

  // 3. Second accumulation increments correctly
  const updated2 = await FireSafetySolutionService.accumulateAiUsage(testFss.id, 0.0025, 800);
  assert.ok(updated2);
  assert.equal(updated2.totalCostUsd, 0.00375);
  assert.equal(updated2.totalTokens, 1250);
  assert.equal(updated2.generationCount, 2);

  // 4. API generation with fssId accumulating cost for single property
  const genSingleReq = new NextRequest("http://localhost:3000/api/fss/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fssId: testFss.id,
      fieldKey: "uvod",
      userId: costUserId,
    }),
  });
  const genSingleRes = await generateFssApi(genSingleReq);
  assert.equal(genSingleRes.status, 200);
  const genSingleData = await genSingleRes.json();
  assert.equal(genSingleData.success, true);
  assert.equal(genSingleData.fssId, testFss.id);
  assert.ok(typeof genSingleData.accumulatedCostUsd === "number");
  assert.ok(genSingleData.accumulatedCostUsd > 0.00375, "Accumulated cost must increase after API call");
  assert.ok(genSingleData.accumulatedTokens > 1250, "Accumulated tokens must increase after API call");
  assert.equal(genSingleData.generationCount, 3, "Generation count must increment to 3");

  // Verify stored solution matches accumulated values
  const retrievedAfterSingle = await FireSafetySolutionService.getSolutionById(testFss.id);
  assert.ok(retrievedAfterSingle);
  assert.equal(retrievedAfterSingle.totalCostUsd, genSingleData.accumulatedCostUsd);
  assert.equal(retrievedAfterSingle.totalTokens, genSingleData.accumulatedTokens);
  assert.equal(retrievedAfterSingle.generationCount, 3);

  // 5. API generation with fssId accumulating cost for multiple specified properties (2 prompts)
  const genBatchReq = new NextRequest("http://localhost:3000/api/fss/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fssId: testFss.id,
      fieldKeys: ["nazevStavby", "investorName"],
      userId: costUserId,
    }),
  });
  const genBatchRes = await generateFssApi(genBatchReq);
  assert.equal(genBatchRes.status, 200);
  const genBatchData = await genBatchRes.json();
  assert.equal(genBatchData.success, true);
  assert.equal(genBatchData.fssId, testFss.id);
  assert.ok(genBatchData.accumulatedCostUsd > genSingleData.accumulatedCostUsd);
  assert.ok(genBatchData.accumulatedTokens > genSingleData.accumulatedTokens);
  assert.equal(genBatchData.generationCount, 5, "Generation count must increment by 2 for 2 fields (3 -> 5)");

  // Check on retrieved FSS after batch
  const retrievedAfterBatch = await FireSafetySolutionService.getSolutionById(testFss.id);
  assert.ok(retrievedAfterBatch);
  assert.equal(retrievedAfterBatch.totalCostUsd, genBatchData.accumulatedCostUsd);
  assert.equal(retrievedAfterBatch.totalTokens, genBatchData.accumulatedTokens);
  assert.equal(retrievedAfterBatch.generationCount, 5);

  // 6. API generation with fssId accumulating cost for all 18 properties
  const genAllReq = new NextRequest("http://localhost:3000/api/fss/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fssId: testFss.id,
      userId: costUserId,
    }),
  });
  const genAllRes = await generateFssApi(genAllReq);
  assert.equal(genAllRes.status, 200);
  const genAllData = await genAllRes.json();
  assert.equal(genAllData.success, true);
  assert.equal(genAllData.fssId, testFss.id);
  assert.equal(genAllData.successfulCount, 18);
  assert.ok(genAllData.accumulatedCostUsd > genBatchData.accumulatedCostUsd);
  assert.ok(genAllData.accumulatedTokens > genBatchData.accumulatedTokens);
  assert.equal(genAllData.generationCount, 23, "Generation count must increment by 18 for all 18 fields (5 -> 23)");

  // Final check on retrieved FSS
  const finalRetrieved = await FireSafetySolutionService.getSolutionById(testFss.id);
  assert.ok(finalRetrieved);
  assert.equal(finalRetrieved.totalCostUsd, genAllData.accumulatedCostUsd);
  assert.equal(finalRetrieved.totalTokens, genAllData.accumulatedTokens);
  assert.equal(finalRetrieved.generationCount, 23);
});
