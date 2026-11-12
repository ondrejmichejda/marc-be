"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  FireSafetySolution,
  FireSafetySolutionProperties,
  FSS_PROPERTY_FIELDS,
  FssPropertyFieldMeta,
  FssTechnicalDocumentationFile,
} from "@/lib/fss/types";

interface FireSafetySolutionsViewProps {
  userId?: string;
}

const FORM_CATEGORIES = [
  { id: "all", label: "Všechna pole (18)" },
  { id: "identification", label: "1. Identifikace & Údaje" },
  { id: "documents", label: "2. Podklady & Úvod" },
  { id: "assessment", label: "3. Posouzení PBŘ" },
  { id: "evacuation", label: "4. Únikové cesty & Odstupy" },
  { id: "extinguishing", label: "5. Zabezpečení & Hašení" },
  { id: "files", label: "📁 Technická dokumentace" },
] as const;

type FormCategory = (typeof FORM_CATEGORIES)[number]["id"];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (ext === "dwg" || ext === "dxf") return "📐";
  if (ext === "docx" || ext === "doc") return "📝";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "📊";
  if (ext === "zip" || ext === "rar" || ext === "7z") return "📦";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext || "")) return "🖼️";
  return "📎";
}

const INITIAL_FORM_DATA: FireSafetySolutionProperties = {
  nazevStavby: "",
  investorName: "",
  mistoStavby: "",
  stupenDokumentace: "DSP - Dokumentace pro stavební povolení",
  datum: new Date().toISOString().split("T")[0],
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

export function FireSafetySolutionsView({ userId }: FireSafetySolutionsViewProps) {
  const [solutions, setSolutions] = useState<FireSafetySolution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FireSafetySolutionProperties>(INITIAL_FORM_DATA);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [modalFiles, setModalFiles] = useState<FssTechnicalDocumentationFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeFormCategory, setActiveFormCategory] = useState<FormCategory>("all");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Export state
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Detail / Preview modal state
  const [inspectingSolution, setInspectingSolution] = useState<FireSafetySolution | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch list of solutions
  const fetchSolutions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/fss?all=true${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se načíst seznam požárně bezpečnostních řešení.");
      }
      setSolutions(data.solutions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const url = `/api/fss?all=true${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setError(data.error || "Nepodařilo se načíst seznam požárně bezpečnostních řešení.");
          } else {
            setSolutions(data.solutions || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError((err as Error).message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setCustomTitle("");
    setModalFiles([]);
    setUploadError(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      datum: new Date().toISOString().split("T")[0],
    });
    setActiveFormCategory("all");
    setIsModalOpen(true);
    setError(null);
  };

  const handleOpenEditModal = (solution: FireSafetySolution) => {
    setEditingId(solution.id);
    setCustomTitle(solution.title || solution.nazevStavby);
    setModalFiles(solution.files || []);
    setUploadError(null);
    setFormData({
      nazevStavby: solution.nazevStavby || "",
      investorName: solution.investorName || "",
      mistoStavby: solution.mistoStavby || "",
      stupenDokumentace: solution.stupenDokumentace || "",
      datum: solution.datum || "",
      zhodnoceniTechnickychZarizeniStavby: solution.zhodnoceniTechnickychZarizeniStavby || "",
      seznamPriloh: solution.seznamPriloh || "",
      seznamPodkladu: solution.seznamPodkladu || "",
      uvod: solution.uvod || "",
      kategorizaceStavbyZHlediskaPozarniBezpecnosti:
        solution.kategorizaceStavbyZHlediskaPozarniBezpecnosti || "",
      konstrukcniReseniStavby: solution.konstrukcniReseniStavby || "",
      posouzeniPozarniBezpecnostiStaveb: solution.posouzeniPozarniBezpecnostiStaveb || "",
      pozarniOdolnostStavebnichKonstrukci: solution.pozarniOdolnostStavebnichKonstrukci || "",
      evakuaceADruhyAKapacityUnikovychCest: solution.evakuaceADruhyAKapacityUnikovychCest || "",
      pozarneNebezpecnyProstorOdstupoveVzdalenosti:
        solution.pozarneNebezpecnyProstorOdstupoveVzdalenosti || "",
      zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami:
        solution.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami || "",
      pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni:
        solution.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni || "",
      pozadavkyProHaseniPozaruAZachrannePrace:
        solution.pozadavkyProHaseniPozaruAZachrannePrace || "",
    });
    setActiveFormCategory("all");
    setIsModalOpen(true);
    setError(null);
  };

  const handleFieldChange = (key: keyof FireSafetySolutionProperties, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadFormData.append("files", files[i]);
      }
      uploadFormData.append("uploadedBy", userId || "admin");

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/fss/${encodeURIComponent(editingId)}/files`, {
          method: "POST",
          body: uploadFormData,
        });
      } else {
        res = await fetch("/api/fss/files/upload", {
          method: "POST",
          body: uploadFormData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se nahrát soubor(y) do Vercel Blob úložiště.");
      }

      if (editingId && data.files) {
        setModalFiles(data.files);
        await fetchSolutions();
      } else if (data.files) {
        setModalFiles((prev) => [...prev, ...data.files]);
      } else if (data.file) {
        setModalFiles((prev) => [...prev, data.file]);
      }

      setSuccessMessage("Soubor(y) technické dokumentace byly úspěšně nahrány.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAttachedFile = async (fileId: string) => {
    if (!confirm("Opravdu si přejete smazat tento soubor technické dokumentace?")) {
      return;
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/fss/${encodeURIComponent(editingId)}/files/${encodeURIComponent(fileId)}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Nepodařilo se smazat soubor.");
        }
        setModalFiles(data.files || []);
        await fetchSolutions();
      } else {
        setModalFiles((prev) => prev.filter((f) => f.id !== fileId));
      }
      setSuccessMessage("Soubor byl smazán.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setUploadError((err as Error).message);
    }
  };

  const handleDownloadFile = (file: FssTechnicalDocumentationFile, solutionId?: string) => {
    const downloadEndpoint = solutionId
      ? `/api/fss/${encodeURIComponent(solutionId)}/files/${encodeURIComponent(file.id)}/download`
      : `/api/fss/files/${encodeURIComponent(file.id)}/download`;

    const link = document.createElement("a");
    link.href = downloadEndpoint;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      title: customTitle.trim() || formData.nazevStavby || "Požárně bezpečnostní řešení",
      files: modalFiles,
      userId: userId || "admin",
    };

    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/fss/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Nepodařilo se aktualizovat požárně bezpečnostní řešení.");
        }
        setSuccessMessage(`Řešení "${data.solution.title}" bylo úspěšně uloženo.`);
      } else {
        // Create new
        const res = await fetch("/api/fss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Nepodařilo se vytvořit požárně bezpečnostní řešení.");
        }
        setSuccessMessage(`Nové řešení "${data.solution.title}" bylo úspěšně vytvořeno.`);
      }

      setIsModalOpen(false);
      await fetchSolutions();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSolution = async (id: string, title: string) => {
    if (!confirm(`Opravdu si přejete smazat požárně bezpečnostní řešení "${title}"?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/fss/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se smazat řešení.");
      }
      setSuccessMessage(`Požárně bezpečnostní řešení "${title}" bylo smazáno.`);
      await fetchSolutions();
      if (inspectingSolution?.id === id) {
        setInspectingSolution(null);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportSolution = async (
    solution: FireSafetySolution | (Partial<FireSafetySolutionProperties> & { title?: string; id?: string })
  ) => {
    const targetId = solution.id || "draft";
    setExportingId(targetId);
    setError(null);
    try {
      let res: Response;
      if (solution.id) {
        res = await fetch(`/api/fss/${encodeURIComponent(solution.id)}/export`);
      } else {
        res = await fetch(`/api/fss/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(solution),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Nepodařilo se vyexportovat dokument DOCX.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `${solution.nazevStavby || solution.title || "project-name"}.docx`;

      if (contentDisposition) {
        const matchUtf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        const matchStandard = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (matchUtf8 && matchUtf8[1]) {
          filename = decodeURIComponent(matchUtf8[1]);
        } else if (matchStandard && matchStandard[1]) {
          filename = matchStandard[1];
        }
      }

      if (!filename.endsWith(".docx")) {
        filename += ".docx";
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage(`Dokument "${filename}" byl úspěšně vyexportován a stažen.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExportingId(null);
    }
  };

  const handleCopyPlaceholder = (placeholder: string) => {
    navigator.clipboard.writeText(placeholder);
    setCopiedKey(placeholder);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredFields = useMemo(() => {
    if (activeFormCategory === "all") return FSS_PROPERTY_FIELDS;
    return FSS_PROPERTY_FIELDS.filter((f) => f.category === activeFormCategory);
  }, [activeFormCategory]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400 text-2xl shadow-inner">
              🧯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Fire Safety Solutions (FSS)</h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  Aktivní modul PBŘ
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Správa, editace a generování požárně bezpečnostních řešení staveb dle platných ČSN norem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/20 transition-all active:scale-95"
            >
              <span>➕</span>
              <span>Nové řešení PBŘ</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Celkem projektů PBŘ</span>
            <p className="text-sm font-bold text-rose-400">{solutions.length} evidováno</p>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Podporovaných polí</span>
            <p className="text-sm font-bold text-indigo-300">18 vlastností šablony</p>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Stupeň dokumentace</span>
            <p className="text-sm font-bold text-sky-400">DSP / DÚR / DPS</p>
          </div>
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Stav integrace</span>
            <p className="text-sm font-bold text-emerald-400">Plně editovatelné</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Hledat podle názvu stavby, investora, místa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-zinc-500 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={fetchSolutions}
          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs font-semibold transition-all inline-flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Obnovit</span>
        </button>
      </div>

      {/* Solutions List */}
      {loading ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <div className="inline-block w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Načítání požárně bezpečnostních řešení...</p>
        </div>
      ) : solutions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <div className="text-4xl">🧯</div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Nenalezena žádná řešení PBŘ</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              {searchQuery
                ? "Žádné řešení neodpovídá zadanému filtru vyhledávání."
                : "Zatím jste nevytvořili žádné požárně bezpečnostní řešení. Vytvořte první řešení kliknutím na tlačítko níže."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <span>➕ Vytvořit první PBŘ</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {solutions.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Title and Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                        {item.title || item.nazevStavby || "Nepojmenované PBŘ"}
                      </h3>
                      {item.stupenDokumentace && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {item.stupenDokumentace}
                        </span>
                      )}
                    </div>
                    {item.nazevStavby && item.nazevStavby !== item.title && (
                      <p className="text-xs text-zinc-400 font-medium">
                        Stavba: <span className="text-zinc-300">{item.nazevStavby}</span>
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                    {item.datum || new Date(item.updatedAt).toLocaleDateString("cs-CZ")}
                  </span>
                </div>

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Investor</span>
                    <p className="text-zinc-200 truncate mt-0.5 font-medium">
                      {item.investorName || "—"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/50">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block">Místo stavby</span>
                    <p className="text-zinc-200 truncate mt-0.5 font-medium">
                      {item.mistoStavby || "—"}
                    </p>
                  </div>
                </div>

                {/* Snippets */}
                {item.kategorizaceStavbyZHlediskaPozarniBezpecnosti && (
                  <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/40 text-[11px] text-zinc-400 space-y-1 line-clamp-2">
                    <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                      Kategorizace stavby:
                    </span>{" "}
                    {item.kategorizaceStavbyZHlediskaPozarniBezpecnosti}
                  </div>
                )}

                {/* Technical Documentation Files (Vercel Blob) */}
                {item.files && item.files.length > 0 && (
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-zinc-400 font-semibold flex items-center gap-1.5">
                        <span>📁</span>
                        <span>Technická dokumentace ({item.files.length}):</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.files.map((file) => (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => handleDownloadFile(file, item.id)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 text-[11px] font-medium transition-all inline-flex items-center gap-1.5 active:scale-95 group/file"
                          title={`Stáhnout ${file.name} (${formatBytes(file.size)})`}
                        >
                          <span>{getFileIcon(file.name)}</span>
                          <span className="max-w-[140px] truncate">{file.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({formatBytes(file.size)})</span>
                          <span className="text-emerald-400 group-hover/file:translate-y-0.5 transition-transform">📥</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingSolution(item)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                  >
                    <span>👁️</span>
                    <span>Zobrazit šablony</span>
                  </button>

                  <button
                    type="button"
                    disabled={exportingId === item.id}
                    onClick={() => handleExportSolution(item)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 inline-flex items-center gap-1.5 disabled:opacity-50"
                    title="Exportovat do DOCX s nahrazenými proměnnými"
                  >
                    <span>{exportingId === item.id ? "⏳" : "📥"}</span>
                    <span>{exportingId === item.id ? "Exportuji..." : "EXPORT"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5"
                  >
                    <span>✏️</span>
                    <span>Upravit PBŘ</span>
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDeleteSolution(item.id, item.title)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                    title="Smazat řešení"
                  >
                    {deletingId === item.id ? "⏳" : "🗑️"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xl">
                  {editingId ? "✏️" : "➕"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingId ? "Upravit požárně bezpečnostní řešení" : "Nové požárně bezpečnostní řešení"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Vyplňte formulář s 18 vlastnostmi pro generování kompletního PBŘ.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Category Sub-Tabs */}
            <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {FORM_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveFormCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeFormCategory === cat.id
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSolution} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Optional Custom Project Title */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">
                    Název projektu / položky PBŘ
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    (Vlastní interní identifikátor)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Např. Administrativní budova Alpha - PBŘ"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Dynamic Property Fields (18 properties) */}
              {activeFormCategory !== "files" && (
                <div className="space-y-4">
                  {filteredFields.map((field: FssPropertyFieldMeta) => {
                    const currentValue = formData[field.key] || "";
                    return (
                      <div
                        key={field.key}
                        className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 hover:border-zinc-700/80 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-zinc-200">
                              {field.label}
                            </label>
                            {field.key === "nazevStavby" && (
                              <span className="text-[10px] text-rose-400 font-bold">*</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              onClick={() => handleCopyPlaceholder(field.placeholder)}
                              title="Klikněte pro zkopírování tagu šablony"
                              className="cursor-pointer text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/20 font-semibold transition-colors"
                            >
                              {field.placeholder} {copiedKey === field.placeholder ? "✓" : "📋"}
                            </span>
                          </div>
                        </div>

                        {field.description && (
                          <p className="text-[11px] text-zinc-500">{field.description}</p>
                        )}

                        {field.type === "textarea" ? (
                          <textarea
                            rows={3}
                            placeholder={`Zadejte ${field.label.toLowerCase()}...`}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 resize-y leading-relaxed font-sans"
                          />
                        ) : (
                          <input
                            type={field.type === "date" ? "date" : "text"}
                            placeholder={`Zadejte ${field.label.toLowerCase()}...`}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 font-sans"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Technical Documentation Files Upload (Vercel Blob Storage) */}
              {(activeFormCategory === "all" || activeFormCategory === "files") && (
                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📁</span>
                        <span>Technická dokumentace & Přílohy</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          Vercel Blob
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Nahrajte technické zprávy, výkresy (DWG/PDF), situace a podklady k tomuto PBŘ.
                      </p>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={(e) => e.target.files && handleUploadFiles(e.target.files)}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={uploadingFiles}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 self-start sm:self-auto"
                    >
                      <span>{uploadingFiles ? "⏳" : "📤"}</span>
                      <span>{uploadingFiles ? "Nahrávám..." : "Nahrát soubory"}</span>
                    </button>
                  </div>

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      ❌ {uploadError}
                    </div>
                  )}

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleUploadFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl bg-zinc-950/40 text-center cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="text-2xl">☁️</div>
                    <p className="text-xs font-semibold text-zinc-300">
                      Přetáhněte soubory sem nebo klikněte pro výběr z počítače
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Podporovány jsou soubory PDF, DWG, DXF, DOCX, XLSX, ZIP, obrázky a další formáty.
                    </p>
                  </div>

                  {/* Attached Files List */}
                  {modalFiles.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono text-zinc-400 font-semibold uppercase block">
                        Připojené soubory ({modalFiles.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {modalFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3 group/item"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-lg">{getFileIcon(file.name)}</span>
                              <div className="min-w-0">
                                <p className="text-xs text-zinc-200 font-medium truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">
                                  {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString("cs-CZ")}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file, editingId || undefined)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600/20 text-zinc-400 hover:text-emerald-300 text-xs transition-colors"
                                title="Stáhnout soubor"
                              >
                                📥
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachedFile(file.id)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-600/20 text-zinc-400 hover:text-rose-300 text-xs transition-colors"
                                title="Smazat soubor"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 text-center italic py-2">
                      K tomuto řešení zatím nejsou nahrány žádné soubory technické dokumentace.
                    </p>
                  )}
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3 sticky bottom-0 bg-zinc-950/95 py-2 backdrop-blur-md">
                <button
                  type="button"
                  disabled={exportingId === "draft"}
                  onClick={() =>
                    handleExportSolution({
                      ...formData,
                      title: customTitle,
                      id: editingId || undefined,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                  title="Stáhnout DOCX s aktuálně vyplněnými údaji formuláře"
                >
                  <span>{exportingId === "draft" ? "⏳" : "📥"}</span>
                  <span>{exportingId === "draft" ? "Exportuji..." : "EXPORT"}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/20 transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {submitting && <span className="animate-spin">⏳</span>}
                    <span>{editingId ? "Uložit změny PBŘ" : "Vytvořit řešení PBŘ"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT / PLACEHOLDERS PREVIEW MODAL */}
      {inspectingSolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xl">
                  📋
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {inspectingSolution.title || inspectingSolution.nazevStavby}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Hodnoty přiřazené k 18 značkám šablony pro toto řešení.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingSolution(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Technical Documentation Files Section */}
              {inspectingSolution.files && inspectingSolution.files.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>📁</span>
                      <span>Technická dokumentace & Přílohy ({inspectingSolution.files.length}):</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">Připraveno ke stažení</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {inspectingSolution.files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base">{getFileIcon(file.name)}</span>
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-200 font-medium truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              {formatBytes(file.size)} • {new Date(file.uploadedAt).toLocaleDateString("cs-CZ")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file, inspectingSolution.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1 active:scale-95 shrink-0"
                          title="Stáhnout tento soubor"
                        >
                          <span>📥</span>
                          <span>Stáhnout</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {FSS_PROPERTY_FIELDS.map((f) => {
                const val = inspectingSolution[f.key] || "";
                return (
                  <div
                    key={f.key}
                    className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-300">{f.label}</span>
                      <span
                        onClick={() => handleCopyPlaceholder(f.placeholder)}
                        className="cursor-pointer text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-500/20"
                      >
                        {f.placeholder} {copiedKey === f.placeholder ? "✓" : "📋"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/60 font-mono whitespace-pre-wrap">
                      {val || <span className="text-zinc-600 italic">Nevyplněno</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={exportingId === inspectingSolution.id}
                  onClick={() => handleExportSolution(inspectingSolution)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all inline-flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <span>{exportingId === inspectingSolution.id ? "⏳" : "📥"}</span>
                  <span>{exportingId === inspectingSolution.id ? "Exportuji..." : "EXPORT DOCX"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const solutionToEdit = inspectingSolution;
                    setInspectingSolution(null);
                    handleOpenEditModal(solutionToEdit);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
                >
                  ✏️ Upravit toto řešení
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInspectingSolution(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
