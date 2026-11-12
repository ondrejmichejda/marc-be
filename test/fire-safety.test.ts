import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  FireSafetySolution,
  CreateFireSafetySolutionInput,
  FireSafetySolutionService,
  FSS_PROPERTY_FIELDS,
  TEMPLATE_PLACEHOLDER_TO_FIELD_KEY,
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
import { generateDocxExport, getExportFilename, FssBlobStorageService } from "../lib/fss";
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
  const exportByIdReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/export`);
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
  const exportParamReq = new NextRequest(`http://localhost:3000/api/fss/export?id=${solution.id}`);
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
  // 1. Create a solution
  const solution = await FireSafetySolutionService.createSolution({
    userId: "test_blob_user",
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
  const listFilesReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files`);
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
  });
  const uploadMultiRes = await uploadFssFilesApi(uploadMultiReq, { params: Promise.resolve({ id: solution.id }) });
  assert.equal(uploadMultiRes.status, 200);
  const uploadMultiData = await uploadMultiRes.json();
  assert.equal(uploadMultiData.success, true);
  assert.equal(uploadMultiData.uploaded.length, 2);
  assert.equal(uploadMultiData.files.length, 3); // 1 initial + 2 new

  // 6. GET /api/fss/[id]/files/[fileId] (Retrieve single file metadata)
  const targetFileId = uploadMultiData.uploaded[0].id;
  const getSingleFileReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}`);
  const getSingleFileRes = await getFssFileByIdApi(getSingleFileReq, {
    params: Promise.resolve({ id: solution.id, fileId: targetFileId }),
  });
  assert.equal(getSingleFileRes.status, 200);
  const singleFileData = await getSingleFileRes.json();
  assert.equal(singleFileData.file.name, "Vyres_1NP_Pozarni_Useky.dwg");

  // 7. GET /api/fss/[id]/files/[fileId]/download (Download streaming endpoint)
  const downloadReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}/download`);
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
  });
  const standaloneUploadRes = await uploadStandaloneFileApi(standaloneUploadReq);
  assert.equal(standaloneUploadRes.status, 200);
  const standaloneUploadData = await standaloneUploadRes.json();
  assert.equal(standaloneUploadData.file.name, "Staticky_Vypocet.pdf");

  // 10. DELETE /api/fss/[id]/files/[fileId] (Delete file endpoint)
  const deleteFileReq = new NextRequest(`http://localhost:3000/api/fss/${solution.id}/files/${targetFileId}`, {
    method: "DELETE",
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
});
