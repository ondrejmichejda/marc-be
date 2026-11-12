"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { FssPropertyPrompt } from "@/lib/fss/prompts";

export function FssPromptsSystemView() {
  const [prompts, setPrompts] = useState<FssPropertyPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Edit modal / drawer state
  const [editingPrompt, setEditingPrompt] = useState<FssPropertyPrompt | null>(null);
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);
  const [editSystemPrompt, setEditSystemPrompt] = useState<string>("");
  const [editUserPrompt, setEditUserPrompt] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editIncludeFiles, setEditIncludeFiles] = useState<boolean>(true);
  const [editModel, setEditModel] = useState<string>("");
  const [editTemperature, setEditTemperature] = useState<number>(0.3);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Test run state
  const [testingFieldKey, setTestingFieldKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    fieldKey: string;
    propertyName: string;
    value: string;
    durationMs: number;
    tokens?: number;
    costUsd?: number;
    promptUsed: string;
  } | null>(null);

  const formatCostUsd = (cost?: number) => {
    if (cost === undefined || cost === null) return "$0.0000";
    if (cost === 0) return "$0.00";
    if (cost < 0.0001) return "< $0.0001";
    return `$${cost.toFixed(4)}`;
  };

  // Reset to defaults state
  const [resetting, setResetting] = useState<boolean>(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fss/prompts");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se načíst FSS AI prompty.");
      }
      setPrompts(data.prompts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadPrompts() {
      try {
        const res = await fetch("/api/fss/prompts");
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setError(data.error || "Nepodařilo se načíst FSS AI prompty.");
          } else {
            setPrompts(data.prompts || []);
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

    loadPrompts();
    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesSearch =
        searchQuery === "" ||
        p.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.placeholderKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.fieldKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = categoryFilter === "all" || p.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [prompts, searchQuery, categoryFilter]);

  const handleOpenEdit = (p: FssPropertyPrompt) => {
    setEditingPrompt(p);
    setEditSystemPrompt(p.systemPrompt || "");
    setEditUserPrompt(p.userPrompt || "");
    setEditDescription(p.description || "");
    setEditIncludeFiles(p.includeFiles !== undefined ? p.includeFiles : true);
    setEditModel(p.model || "");
    setEditTemperature(p.temperature !== undefined ? p.temperature : 0.3);
    setEditIsActive(p.isActive !== undefined ? p.isActive : true);
    setError(null);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;

    setSavingPrompt(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/fss/prompts/${editingPrompt.fieldKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: editSystemPrompt,
          userPrompt: editUserPrompt,
          description: editDescription,
          includeFiles: editIncludeFiles,
          model: editModel || null,
          temperature: editTemperature,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se uložit prompt.");
      }

      setSuccessMessage(`Prompt pro '${editingPrompt.propertyName}' byl úspěšně aktualizován.`);
      setEditingPrompt(null);
      await fetchPrompts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleTestPrompt = async (p: FssPropertyPrompt) => {
    setTestingFieldKey(p.fieldKey);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch("/api/fss/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey: p.fieldKey,
          properties: {
            nazevStavby: "Administrativní budova City Point",
            investorName: "DEVELOPMENT ALPHA s.r.o., IČO: 12345678",
            mistoStavby: "Praha 4, parc. č. 1024/1, k.ú. Michle",
            stupenDokumentace: "DSP - Dokumentace pro stavební povolení",
          },
          files: [
            {
              id: "test_doc_1",
              name: "Technicka_zprava_ASR.pdf",
              size: 2450000,
              contentType: "application/pdf",
              uploadedAt: new Date().toISOString(),
              description: "Architektonicko-stavební řešení objektu, 5 NP + 1 PP, ŽB skelet.",
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.result?.error || "Chyba při testovacím generování.");
      }

      setTestResult({
        fieldKey: p.fieldKey,
        propertyName: p.propertyName,
        value: data.value || data.result?.value || "",
        durationMs: data.result?.durationMs || data.durationMs || 0,
        tokens: Number(data.tokens ?? data.result?.tokens ?? 0),
        costUsd: Number(data.estimatedCostUsd ?? data.result?.estimatedCostUsd ?? 0),
        promptUsed: data.result?.promptUsed || "",
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingFieldKey(null);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Opravdu chcete obnovit všech 18 FSS promptů na výchozí systémové hodnoty?")) {
      return;
    }

    setResetting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/fss/prompts/reset", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nepodařilo se obnovit výchozí prompty.");
      }

      setSuccessMessage("Všech 18 FSS promptů bylo úspěšně obnoveno na výchozí hodnoty.");
      await fetchPrompts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-900 border border-indigo-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧯</span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Správa systémových AI Promptů pro Fire Safety Solutions
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30 font-semibold">
              Admin Only • Globální
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Tyto prompty jsou obecné pro celou aplikaci a generují jednotlivé vlastnosti PBŘ (všech 18 polí).
            Všichni uživatelé si je mohou ve formuláři tvorby FSS prohlížet, ale editace je povolena výhradně administrátorům.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPrompts}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>↻</span> {loading ? "Načítám..." : "Obnovit"}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={resetting}
            className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800/60 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>🔄</span> {resetting ? "Obnovuji..." : "Výchozí šablony"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Hledat vlastnost, placeholder či popis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === "all"
                ? "bg-indigo-600 text-white font-bold"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Všechny kategorie ({prompts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-xs font-mono">
          Načítám katalogy systémových AI promptů...
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 text-xs">
          Žádné prompty neodpovídají zadanému filtru.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((p, idx) => (
            <div
              key={p.fieldKey}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      #{idx + 1} • {p.category}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {p.propertyName}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                    {p.placeholderKey}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {p.description || "Bez doplňujícího popisu."}
                </p>

                {/* Tags and Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      p.includeFiles
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    <span>{p.includeFiles ? "📁 Soubory: Ano" : "🚫 Bez souborů"}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    🌡️ T: {p.temperature !== undefined ? p.temperature : 0.3}
                  </span>
                  {p.model && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      🤖 {p.model}
                    </span>
                  )}
                </div>

                {/* Prompt Preview Snippet */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">User Prompt</span>
                  <p className="text-[11px] text-zinc-300 line-clamp-2 font-mono">
                    {p.userPrompt}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTestPrompt(p)}
                  disabled={testingFieldKey === p.fieldKey}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                >
                  <span>⚡</span> {testingFieldKey === p.fieldKey ? "Testuji..." : "Otestovat"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(p)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center gap-1"
                >
                  <span>✏️</span> Upravit prompt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test Execution Output Modal */}
      {testResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Výsledek testovacího generování: {testResult.propertyName}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 flex-wrap">
                    <span>Doba: {testResult.durationMs} ms</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-semibold">
                      Spotřeba: {testResult.tokens ? `${testResult.tokens.toLocaleString()} tokenů` : "0 tokenů"}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-semibold">
                      Náklad: {formatCostUsd(testResult.costUsd)} USD
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Vygenerovaná hodnota pro FSS
                </span>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {testResult.value || "(Prázdná odpověď)"}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Plný sestavený prompt (včetně kontextu a souborů)
                </span>
                <pre className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {testResult.promptUsed}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
              >
                Zavřít náhled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prompt Modal */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePrompt}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
          >
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✏️</span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Upravit AI Prompt: {editingPrompt.propertyName}
                  </h3>
                  <span className="text-xs text-indigo-400 font-mono">
                    {editingPrompt.placeholderKey} (fieldKey: {editingPrompt.fieldKey})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPrompt(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Popis a účel vlastnosti
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Popis účelu této vlastnosti v PBŘ dokumentaci"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  System Prompt (Instrukce pro expertní roli & normy ČSN) *
                </label>
                <textarea
                  rows={4}
                  value={editSystemPrompt}
                  onChange={(e) => setEditSystemPrompt(e.target.value)}
                  required
                  placeholder="Definice expertní role AI inženýra požární bezpečnosti staveb..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  User Prompt Template (Zadání pro generování této vlastnosti) *
                </label>
                <textarea
                  rows={3}
                  value={editUserPrompt}
                  onChange={(e) => setEditUserPrompt(e.target.value)}
                  required
                  placeholder="Šablona promptu, která se provede s kontextem FSS a souborů..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Zahrnout nahrané soubory
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={editIncludeFiles}
                      onChange={(e) => setEditIncludeFiles(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-zinc-200 font-semibold text-xs">
                      {editIncludeFiles ? "✅ Zahrnout soubory" : "❌ Nezahrnovat"}
                    </span>
                  </label>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Teplota (Temperature: {editTemperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editTemperature}
                    onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Přesný (0.0)</span>
                    <span>Kreativní (1.0)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Model Override (Volitelné)
                  </label>
                  <input
                    type="text"
                    list="fss-prompt-models-list"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    placeholder="Výchozí z AI nastavení"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-600 font-mono focus:outline-none"
                  />
                  <datalist id="fss-prompt-models-list">
                    <option value="gpt-4o" />
                    <option value="gpt-4o-mini" />
                    <option value="o3-mini" />
                    <option value="o1" />
                    <option value="o4-mini" />
                    <option value="gpt-4.5-preview" />
                    <option value="gpt-4-turbo" />
                    <option value="chatgpt-4o-latest" />
                  </datalist>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Změny se okamžitě projeví ve formuláři generování FSS.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={savingPrompt}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPrompt ? "Ukládám..." : "💾 Uložit změny promptu"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
