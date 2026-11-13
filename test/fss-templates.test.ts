import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { NextRequest } from "next/server";
import {
  FssTemplateService,
  FireSafetySolutionService,
  generateDocxExport,
  KNOWN_FSS_PLACEHOLDERS,
} from "../lib/fss";
import { GET as getTemplatesApi, POST as postTemplatesApi } from "../app/api/fss/templates/route";
import { GET as getTemplateByIdApi, DELETE as deleteTemplateByIdApi } from "../app/api/fss/templates/[id]/route";
import { POST as activateTemplateApi } from "../app/api/fss/templates/[id]/activate/route";
import { GET as downloadTemplateByIdApi } from "../app/api/fss/templates/[id]/download/route";
import { GET as downloadActiveTemplateApi } from "../app/api/fss/templates/download/route";
import { POST as resetTemplatesApi } from "../app/api/fss/templates/reset/route";

/**
 * Helper to build a minimal valid docx buffer for testing with custom XML content.
 */
function createMockDocxBuffer(customMarker: string): Buffer {
  const zip = new PizZip();
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Custom PBŘ Document: ${customMarker}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Stavba: {{NAZEV_STAVBY}}, Investor: {{INVESTOR_NAME}}, Misto: {{MISTO_STAVBY}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Zaver: {{ZAVER}}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("word/document.xml", documentXml);

  return zip.generate({ type: "nodebuffer" });
}

test("FSS Template Management: Lifecycle, Overriding, and Active Template usage during FSS Generation", async () => {
  // 0. Reset any templates initially
  const existingTemplates = await FssTemplateService.listTemplates();
  for (const t of existingTemplates) {
    await FssTemplateService.deleteTemplate(t.id);
  }
  await FssTemplateService.resetToDefault();

  const initialActive = await FssTemplateService.getActiveTemplate();
  assert.equal(initialActive, null, "Initially no custom template is active, using built-in default");

  // Verify known placeholders list contains all 19 standard properties
  assert.ok(KNOWN_FSS_PLACEHOLDERS.includes("NAZEV_STAVBY"));
  assert.ok(KNOWN_FSS_PLACEHOLDERS.includes("INVESTOR_NAME"));
  assert.ok(KNOWN_FSS_PLACEHOLDERS.includes("POZARNI_ODOLNOST_STAVEBNICH_KONSTRUKCI"));
  assert.ok(KNOWN_FSS_PLACEHOLDERS.includes("ZAVER"));

  // 1. Upload Template Version 1
  const buf1 = createMockDocxBuffer("TEMPLATE_VERSION_1_MARKER");
  const tpl1 = await FssTemplateService.saveTemplate({
    buffer: buf1,
    filename: "company_template_v1.docx",
    uploadedBy: "admin_tester",
    notes: "Initial custom template version 1",
  });

  assert.ok(tpl1.id);
  assert.equal(tpl1.name, "company_template_v1.docx");
  assert.equal(tpl1.version, 1);
  assert.equal(tpl1.isActive, true);
  assert.ok(tpl1.placeholders.includes("NAZEV_STAVBY"));
  assert.ok(tpl1.placeholders.includes("INVESTOR_NAME"));
  assert.ok(tpl1.placeholders.includes("ZAVER"));

  // Check getActiveTemplate() returns tpl1
  const currentActive1 = await FssTemplateService.getActiveTemplate();
  assert.equal(currentActive1?.id, tpl1.id);
  assert.equal(currentActive1?.isActive, true);

  // 2. Verify that FSS generation now uses Template Version 1
  const testSolution = {
    title: "Administrativní budova Delta",
    nazevStavby: "Administrativní budova Delta",
    investorName: "Delta Development s.r.o.",
    mistoStavby: "Ostrava, Nová Karolina",
    zaver: "Požární bezpečnost splněna dle normy.",
  };

  const { buffer: exportBuf1 } = await FireSafetySolutionService.exportSolutionToDocx(testSolution as any);
  const zipExport1 = new PizZip(exportBuf1);
  const docXmlExport1 = zipExport1.file("word/document.xml")?.asText() || "";

  assert.ok(docXmlExport1.includes("TEMPLATE_VERSION_1_MARKER"), "Export must use Template Version 1");
  assert.ok(docXmlExport1.includes("Administrativní budova Delta"));
  assert.ok(docXmlExport1.includes("Delta Development s.r.o."));

  // 3. Upload Template Version 2 (Override)
  const buf2 = createMockDocxBuffer("TEMPLATE_VERSION_2_MARKER");
  const tpl2 = await FssTemplateService.saveTemplate({
    buffer: buf2,
    filename: "company_template_v2_updated.docx",
    uploadedBy: "admin_tester",
    notes: "Updated headers and legal footer v2",
  });

  assert.equal(tpl2.version, 2);
  assert.equal(tpl2.isActive, true);

  // Check that Version 1 is now inactive and Version 2 is active
  const currentActive2 = await FssTemplateService.getActiveTemplate();
  assert.equal(currentActive2?.id, tpl2.id);
  assert.equal(currentActive2?.version, 2);

  const tpl1Updated = await FssTemplateService.getTemplateById(tpl1.id);
  assert.equal(tpl1Updated?.isActive, false, "Previous template must be marked inactive");

  // 4. Verify that FSS generation now automatically uses the latest overridden Template Version 2
  const { buffer: exportBuf2 } = await FireSafetySolutionService.exportSolutionToDocx(testSolution as any);
  const zipExport2 = new PizZip(exportBuf2);
  const docXmlExport2 = zipExport2.file("word/document.xml")?.asText() || "";

  assert.ok(docXmlExport2.includes("TEMPLATE_VERSION_2_MARKER"), "Export must use latest Template Version 2");
  assert.ok(!docXmlExport2.includes("TEMPLATE_VERSION_1_MARKER"), "Export must not use previous Template Version 1");

  // 5. Activate older Version 1 again
  await FssTemplateService.setActiveTemplate(tpl1.id);
  const activeAfterSwitch = await FssTemplateService.getActiveTemplate();
  assert.equal(activeAfterSwitch?.id, tpl1.id);
  assert.equal(activeAfterSwitch?.version, 1);

  const { buffer: exportBuf3 } = await FireSafetySolutionService.exportSolutionToDocx(testSolution as any);
  const docXmlExport3 = new PizZip(exportBuf3).file("word/document.xml")?.asText() || "";
  assert.ok(docXmlExport3.includes("TEMPLATE_VERSION_1_MARKER"));

  // 6. Delete Version 1 and verify automatic fallback
  await FssTemplateService.deleteTemplate(tpl1.id);
  const activeAfterDelete = await FssTemplateService.getActiveTemplate();
  assert.equal(activeAfterDelete?.id, tpl2.id, "Active template falls back to remaining template v2");

  // 7. Reset to default built-in template
  await FssTemplateService.resetToDefault();
  const activeAfterReset = await FssTemplateService.getActiveTemplate();
  assert.equal(activeAfterReset, null, "Active template is now null, meaning built-in default is used");

  // Cleanup tpl2
  await FssTemplateService.deleteTemplate(tpl2.id);
});

test("FSS Template API Routes: GET, POST upload, activate, download, and reset", async () => {
  // 1. GET /api/fss/templates
  const getReq = new NextRequest("http://localhost:3000/api/fss/templates");
  const getRes = await getTemplatesApi();
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(Array.isArray(getData.templates));
  assert.ok(Array.isArray(getData.defaultPlaceholders));

  // 2. POST /api/fss/templates (Upload new template via JSON base64)
  const mockBuffer = createMockDocxBuffer("API_TEST_TEMPLATE_DOCX");
  const postReq = new NextRequest("http://localhost:3000/api/fss/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "admin",
      "x-user-id": "admin_api_user",
    },
    body: JSON.stringify({
      filename: "test_uploaded_template.docx",
      fileBase64: mockBuffer.toString("base64"),
      notes: "Uploaded via API test suite",
    }),
  });

  const postRes = await postTemplatesApi(postReq);
  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.ok(postData.template);
  assert.equal(postData.template.name, "test_uploaded_template.docx");
  assert.equal(postData.template.isActive, true);

  const uploadedId = postData.template.id;

  // 3. GET /api/fss/templates/[id]
  const getByIdReq = new NextRequest(`http://localhost:3000/api/fss/templates/${uploadedId}`);
  const getByIdRes = await getTemplateByIdApi(getByIdReq, { params: Promise.resolve({ id: uploadedId }) });
  assert.equal(getByIdRes.status, 200);
  const getByIdData = await getByIdRes.json();
  assert.equal(getByIdData.template.id, uploadedId);

  // 4. GET /api/fss/templates/[id]/download
  const downloadReq = new NextRequest(`http://localhost:3000/api/fss/templates/${uploadedId}/download`);
  const downloadRes = await downloadTemplateByIdApi(downloadReq, { params: Promise.resolve({ id: uploadedId }) });
  assert.equal(downloadRes.status, 200);
  assert.equal(
    downloadRes.headers.get("content-type"),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  const ab = await downloadRes.arrayBuffer();
  assert.ok(ab.byteLength > 100);

  // 5. GET /api/fss/templates/download (Active template download)
  const downloadActiveReq = new NextRequest("http://localhost:3000/api/fss/templates/download");
  const downloadActiveRes = await downloadActiveTemplateApi(downloadActiveReq);
  assert.equal(downloadActiveRes.status, 200);

  // 6. POST /api/fss/templates/reset (Reset to default)
  const resetReq = new NextRequest("http://localhost:3000/api/fss/templates/reset", {
    method: "POST",
    headers: { "x-user-role": "admin" },
  });
  const resetRes = await resetTemplatesApi(resetReq);
  assert.equal(resetRes.status, 200);

  // 7. POST /api/fss/templates/[id]/activate (Re-activate)
  const activateReq = new NextRequest(`http://localhost:3000/api/fss/templates/${uploadedId}/activate`, {
    method: "POST",
    headers: { "x-user-role": "admin" },
  });
  const activateRes = await activateTemplateApi(activateReq, { params: Promise.resolve({ id: uploadedId }) });
  assert.equal(activateRes.status, 200);
  const activateData = await activateRes.json();
  assert.equal(activateData.template.isActive, true);

  // 8. DELETE /api/fss/templates/[id]
  const deleteReq = new NextRequest(`http://localhost:3000/api/fss/templates/${uploadedId}`, {
    method: "DELETE",
    headers: { "x-user-role": "admin" },
  });
  const deleteRes = await deleteTemplateByIdApi(deleteReq, { params: Promise.resolve({ id: uploadedId }) });
  assert.equal(deleteRes.status, 200);

  // 9. Clean reset to default
  await FssTemplateService.resetToDefault();
});
