"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserOpenAiConfigStatus,
  POPULAR_OPENAI_MODELS,
  ALL_KNOWN_OPENAI_MODELS,
  OpenAiModelInfo,
  UserAiUsageOverview,
} from "@/lib/openai/types";

interface UserAiSettingsViewProps {
  userId?: string;
  onNavigateToFss?: () => void;
}

export function UserAiSettingsView({ userId, onNavigateToFss }: UserAiSettingsViewProps) {
  const [config, setConfig] = useState<UserOpenAiConfigStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);

  // Usage Overview State
  const [usageOverview, setUsageOverview] = useState<UserAiUsageOverview | null>(null);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);
  const [showPricingGuide, setShowPricingGuide] = useState<boolean>(false);
  const [showDailyActivity, setShowDailyActivity] = useState<boolean>(false);

  // Form State
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [customModel, setCustomModel] = useState<string>("");
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);
  const [organization, setOrganization] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.3);
  const [reasoningEffort, setReasoningEffort] = useState<"low" | "medium" | "high">("medium");

  // Dynamic Models State
  const [availableModels, setAvailableModels] = useState<string[]>(ALL_KNOWN_OPENAI_MODELS);
  const [modelDetails, setModelDetails] = useState<OpenAiModelInfo[]>([]);
  const [modelsSource, setModelsSource] = useState<"openai-api" | "catalog">("catalog");
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);
  const [modelSearchQuery, setModelSearchQuery] = useState<string>("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [showAllModelsList, setShowAllModelsList] = useState<boolean>(false);

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Test Playground State
  const [testPrompt, setTestPrompt] = useState<string>(
    "Ověř spojení a stručně popiš výhody automatizovaného zpracování PBŘ."
  );
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    completion?: string;
    model?: string;
    tokens?: number;
    durationMs?: number;
    error?: string;
  } | null>(null);

  const isReasoning = useMemo(() => {
    const m = (isCustomModel ? customModel : selectedModel).toLowerCase();
    return m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.includes("-reasoning");
  }, [selectedModel, customModel, isCustomModel]);

  const filteredModels = useMemo(() => {
    let list = availableModels;
    if (selectedCategoryTab !== "all") {
      list = list.filter((m) => {
        const detail = modelDetails.find((d) => d.id === m);
        const category = detail?.category || "other";
        if (selectedCategoryTab === "flagship") return category === "flagship" || m.includes("gpt-4o") || m === "gpt-4";
        if (selectedCategoryTab === "reasoning") return detail?.isReasoning || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4");
        if (selectedCategoryTab === "fast") return category === "fast" || m.includes("mini") || m.includes("3.5");
        if (selectedCategoryTab === "preview") return category === "preview" || m.includes("preview") || m.includes("turbo");
        return true;
      });
    }

    if (modelSearchQuery.trim()) {
      const q = modelSearchQuery.toLowerCase().trim();
      list = list.filter((m) => {
        const detail = modelDetails.find((d) => d.id === m);
        return (
          m.toLowerCase().includes(q) ||
          detail?.name?.toLowerCase().includes(q) ||
          detail?.description?.toLowerCase().includes(q) ||
          detail?.categoryLabel?.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [availableModels, modelDetails, selectedCategoryTab, modelSearchQuery]);

  const activeModelDetail = useMemo(() => {
    const cur = isCustomModel ? customModel : selectedModel;
    return modelDetails.find((d) => d.id === cur);
  }, [selectedModel, customModel, isCustomModel, modelDetails]);

  const fetchAvailableModels = useCallback(async (customKey?: string) => {
    setFetchingModels(true);
    try {
      let res: Response;
      if (customKey && customKey.trim()) {
        res = await fetch("/api/user/ai-settings/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: customKey.trim(),
            organization: organization.trim() || undefined,
          }),
        });
      } else {
        res = await fetch("/api/user/ai-settings/models");
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setAvailableModels(data.models);
        if (Array.isArray(data.modelDetails)) {
          setModelDetails(data.modelDetails);
        }
        if (data.source) {
          setModelsSource(data.source);
        }
      }
    } catch (err) {
      console.warn("Could not load available models from API:", err);
    } finally {
      setFetchingModels(false);
    }
  }, [organization]);

  const fetchUsageOverview = useCallback(async (customKey?: string) => {
    setLoadingUsage(true);
    try {
      let res: Response;
      if (customKey && customKey.trim()) {
        res = await fetch("/api/user/ai-settings/usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: customKey.trim(),
            organization: organization.trim() || undefined,
          }),
        });
      } else {
        res = await fetch("/api/user/ai-settings/usage");
      }

      const data = await res.json();
      if (data.success && data.usage) {
        setUsageOverview(data.usage);
      }
    } catch (err) {
      console.warn("Could not load usage overview:", err);
    } finally {
      setLoadingUsage(false);
    }
  }, [organization]);

  const loadSettings = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/ai-settings");
      const data = await res.json();
      if (data.success && data.config) {
        const c: UserOpenAiConfigStatus = data.config;
        setConfig(c);

        if (c.customModel) {
          setIsCustomModel(true);
          setCustomModel(c.customModel);
        } else if (c.defaultModel) {
          setSelectedModel(c.defaultModel);
          setIsCustomModel(false);
        }

        if (c.availableModels && Array.isArray(c.availableModels) && c.availableModels.length > 0) {
          setAvailableModels(c.availableModels);
        }

        setWebSearchEnabled(c.webSearchEnabled !== false);
        setOrganization(c.organization || "");
        if (c.temperature !== undefined) setTemperature(c.temperature);
        if (c.reasoningEffort) setReasoningEffort(c.reasoningEffort);
      }
      await Promise.all([fetchAvailableModels(), fetchUsageOverview()]);
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Chyba při načítání nastavení: ${(err as Error).message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/user/ai-settings");
        const data = await res.json();
        if (!ignore && data.success && data.config) {
          const c: UserOpenAiConfigStatus = data.config;
          setConfig(c);

          if (c.customModel) {
            setIsCustomModel(true);
            setCustomModel(c.customModel);
          } else if (c.defaultModel) {
            setSelectedModel(c.defaultModel);
            setIsCustomModel(false);
          }

          if (c.availableModels && Array.isArray(c.availableModels) && c.availableModels.length > 0) {
            setAvailableModels(c.availableModels);
          }

          setWebSearchEnabled(c.webSearchEnabled !== false);
          setOrganization(c.organization || "");
          if (c.temperature !== undefined) setTemperature(c.temperature);
          if (c.reasoningEffort) setReasoningEffort(c.reasoningEffort);
        }
      } catch (err) {
        if (!ignore) {
          setFeedback({
            type: "error",
            message: `Chyba při načítání nastavení: ${(err as Error).message}`,
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
      fetchAvailableModels();
      fetchUsageOverview();
    }

    load();
    return () => {
      ignore = true;
    };
  }, [userId, fetchAvailableModels, fetchUsageOverview]);

  async function handleValidateKey() {
    const keyToValidate = apiKey.trim();
    if (!keyToValidate && !config?.isConfigured) {
      setFeedback({
        type: "error",
        message: "Zadejte OpenAI API token před validací.",
      });
      return;
    }

    setValidating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/ai-settings/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: keyToValidate || undefined,
          organization: organization.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.valid) {
        if (Array.isArray(data.models)) {
          setAvailableModels(data.models);
        }
        if (Array.isArray(data.modelDetails)) {
          setModelDetails(data.modelDetails);
        }
        setModelsSource("openai-api");
        fetchUsageOverview(keyToValidate || undefined);
        setFeedback({
          type: "success",
          message: `✅ OpenAI API token je platný a ověřený! Nalezeno ${data.models?.length || 0} dostupných modelů z OpenAI API.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: `❌ Neplatný API token: ${data.error || "Ověření selhalo."}`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Chyba při komunikaci s OpenAI: ${(err as Error).message}`,
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const effectiveModel = isCustomModel && customModel.trim() ? customModel.trim() : selectedModel;

    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          defaultModel: effectiveModel,
          customModel: isCustomModel ? customModel.trim() : undefined,
          webSearchEnabled,
          organization: organization.trim() || undefined,
          temperature,
          reasoningEffort,
        }),
      });

      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setApiKey("");
        fetchUsageOverview();
        setFeedback({
          type: "success",
          message: "✅ OpenAI nastavení bylo úspěšně uloženo a je připraveno k použití v PBŘ.",
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Uložení nastavení selhalo.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Chyba při ukládání: ${(err as Error).message}`,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    if (!confirm("Opravdu chcete odebrat svůj OpenAI API token? Bez něj nebude dostupné generování v PBŘ.")) {
      return;
    }

    setClearing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });

      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setApiKey("");
        fetchUsageOverview();
        setFeedback({
          type: "info",
          message: "ℹ️ OpenAI API token byl odebrán. Generování v PBŘ je nyní neaktivní.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Chyba při odebírání tokenu: ${(err as Error).message}`,
      });
    } finally {
      setClearing(false);
    }
  }

  async function handleRunTestPrompt() {
    if (!config?.isConfigured && !apiKey.trim()) {
      setFeedback({
        type: "error",
        message: "Pro testovací běh nejprve uložte nebo zadejte platný OpenAI API token.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const startTime = Date.now();
    const effectiveModel = isCustomModel && customModel.trim() ? customModel.trim() : selectedModel;

    try {
      const res = await fetch("/api/fss/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldKey: "uvod",
          customInstructions: testPrompt,
          model: effectiveModel,
          temperature,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          completion: data.value || data.result?.value,
          model: data.result?.model || effectiveModel,
          tokens: data.totalTokens || data.tokens,
          durationMs: data.durationMs || Date.now() - startTime,
        });
        fetchUsageOverview(apiKey.trim() || undefined);
      } else {
        setTestResult({
          error: data.error || data.result?.error || "Testovací dotaz selhal.",
          durationMs: Date.now() - startTime,
        });
      }
    } catch (err) {
      setTestResult({
        error: (err as Error).message,
        durationMs: Date.now() - startTime,
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Card */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-2xl shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Osobní OpenAI & Model Nastavení
              </h1>
              {config?.isConfigured ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Aktivní & Nastaveno
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Klíč nenastaven
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Spravujte svůj osobní OpenAI API token, výchozí model, vyhledávání na webu a parametry generování pro PBŘ.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSettings}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? "Načítání..." : "↻ Obnovit"}
        </button>
      </div>

      {/* Warning Banner if API key is missing */}
      {!config?.isConfigured && !loading && (
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-amber-100">
                OpenAI API token není pro váš účet nakonfigurován
              </p>
              <p className="text-[11px] text-amber-300/80">
                Automatické AI generování vlastností požárně bezpečnostních řešení (PBŘ) je v tuto chvíli neaktivní.
                Vložte níže svůj osobní OpenAI API klíč a uložte nastavení pro aktivaci asistence.
              </p>
            </div>
          </div>
          {onNavigateToFss && (
            <button
              type="button"
              onClick={onNavigateToFss}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold shadow transition-all active:scale-95 shrink-0"
            >
              🧯 Zobrazit PBŘ projekty
            </button>
          )}
        </div>
      )}

      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : feedback.type === "error"
              ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
              : "bg-indigo-950/40 border-indigo-500/40 text-indigo-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* AI Usage, Total Costs & Credit Balance Overview Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6 shadow-xl backdrop-blur-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 text-xl shadow-inner">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Přehled čerpání, nákladů & kreditu AI
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Live Telemetrie
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Sledování celkových finančních nákladů, spotřebovaných tokenů, zůstatku kreditu a efektivity modelů.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPricingGuide(!showPricingGuide)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                showPricingGuide
                  ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50"
                  : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              }`}
            >
              💡 {showPricingGuide ? "Skrýt ceník" : "Ceník & Tipy"}
            </button>
            <button
              type="button"
              onClick={() => setShowDailyActivity(!showDailyActivity)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                showDailyActivity
                  ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50"
                  : "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              }`}
            >
              📅 {showDailyActivity ? "Skrýt historii" : "Historie"}
            </button>
            <button
              type="button"
              onClick={() => fetchUsageOverview(apiKey.trim() || undefined)}
              disabled={loadingUsage}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loadingUsage ? (
                <>
                  <span className="w-2.5 h-2.5 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                  Načítání...
                </>
              ) : (
                "↻ Obnovit"
              )}
            </button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Estimated Cost */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-emerald-500/30 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Celkové Náklady
              </span>
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs">
                💰
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-emerald-400 tracking-tight">
                ${usageOverview?.estimatedTotalCostUsd !== undefined ? usageOverview.estimatedTotalCostUsd.toFixed(4) : "0.0000"}{" "}
                <span className="text-xs text-emerald-500/80 font-normal">USD</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                <span>≈ {usageOverview?.estimatedTotalCostCzk !== undefined ? usageOverview.estimatedTotalCostCzk.toFixed(2) : "0.00"} Kč</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">{usageOverview?.totalRequests || 0} dotazů</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              {usageOverview?.lastUsedAt
                ? `Naposledy: ${new Date(usageOverview.lastUsedAt).toLocaleDateString("cs-CZ", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Dosud bez čerpání"}
            </div>
          </div>

          {/* Card 2: Credit Balance / Account Status */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-sky-500/30 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-sky-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Kreditní Zůstatek
              </span>
              <span className="p-1 rounded-md bg-sky-500/10 text-sky-400 text-xs">
                💳
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-sky-300 tracking-tight">
                {usageOverview?.creditInfo?.totalAvailableUsd !== undefined ? (
                  <>
                    ${usageOverview.creditInfo.totalAvailableUsd.toFixed(2)}{" "}
                    <span className="text-xs text-sky-400/80 font-normal">USD</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-zinc-200">
                    {usageOverview?.creditInfo?.planTitle || (config?.isConfigured ? "Pay-as-you-go" : "Nenastaveno")}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {usageOverview?.creditInfo?.totalGrantedUsd !== undefined
                  ? `z přidělených $${usageOverview.creditInfo.totalGrantedUsd.toFixed(2)} USD`
                  : usageOverview?.creditInfo?.hasPaymentMethod
                  ? "Platební karta aktivní"
                  : "Aktivní osobní token"}
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>Stav:</span>
              <span className={`font-semibold ${config?.isConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                {config?.isConfigured ? "Aktivní klíč" : "Neaktivní"}
              </span>
            </div>
          </div>

          {/* Card 3: Token Usage Volume */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-amber-500/30 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Spotřeba Tokenů
              </span>
              <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 text-xs">
                ⚡
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-amber-300 tracking-tight">
                {(usageOverview?.totalTokens || 0).toLocaleString()}{" "}
                <span className="text-xs text-amber-400/80 font-normal">tok.</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                <span>In: {(usageOverview?.totalPromptTokens || 0).toLocaleString()}</span>
                <span className="text-zinc-600">/</span>
                <span>Out: {(usageOverview?.totalCompletionTokens || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              Průměr:{" "}
              {usageOverview?.totalRequests
                ? Math.round(usageOverview.totalTokens / usageOverview.totalRequests).toLocaleString()
                : 0}{" "}
              t / dotaz
            </div>
          </div>

          {/* Card 4: PBŘ FSS Usage */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-rose-500/30 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-rose-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Čerpání v PBŘ
              </span>
              <span className="p-1 rounded-md bg-rose-500/10 text-rose-400 text-xs">
                🧯
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-rose-300 tracking-tight">
                ${usageOverview?.fssStats?.totalFssCostUsd !== undefined ? usageOverview.fssStats.totalFssCostUsd.toFixed(4) : "0.0000"}{" "}
                <span className="text-xs text-rose-400/80 font-normal">USD</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {usageOverview?.fssStats?.totalFssGenerations || 0} generací v{" "}
                {usageOverview?.fssStats?.fssProjectsWithAi || 0} projektech
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              {(usageOverview?.fssStats?.totalFssTokens || 0).toLocaleString()} tokenů celkem
            </div>
          </div>

          {/* Card 5: Health & Latency */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-950 to-zinc-900 border border-purple-500/30 flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Spolehlivost
              </span>
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-400 text-xs">
                ⏱️
              </span>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-purple-300 tracking-tight">
                {usageOverview?.successRate !== undefined ? `${usageOverview.successRate}%` : "100%"}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Průměrná latence: <span className="text-zinc-200 font-mono">{usageOverview?.averageDurationMs || 0} ms</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500">
              {usageOverview?.successfulRequests || 0} úspěšných / {usageOverview?.failedRequests || 0} chyb
            </div>
          </div>
        </div>

        {/* Model Usage Breakdown Bars */}
        {usageOverview?.modelsUsed && usageOverview.modelsUsed.length > 0 && (
          <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                <span>📈</span> Rozpad nákladů a spotřeby podle modelů
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">
                {usageOverview.modelsUsed.length} aktivních modelů
              </span>
            </div>

            <div className="space-y-3">
              {usageOverview.modelsUsed.map((m) => (
                <div key={m.model} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-white">{m.model}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {m.requestsCount} dotazů
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {m.totalTokens.toLocaleString()} tokenů
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-emerald-400 font-semibold">
                        ${m.estimatedCostUsd.toFixed(4)} USD
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans">
                        ({m.percentageOfCost}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, Math.min(100, m.percentageOfCost))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit Information Notice Banner */}
        {usageOverview?.creditInfo?.message && (
          <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2.5">
            <span className="text-base shrink-0">ℹ️</span>
            <div className="space-y-0.5">
              <p className="font-medium text-zinc-300">
                {usageOverview.creditInfo.planTitle || "Informace o OpenAI účtu"}
              </p>
              <p className="leading-relaxed">{usageOverview.creditInfo.message}</p>
            </div>
          </div>
        )}

        {/* Collapsible Section: Pricing Guide & Savings Advice */}
        {showPricingGuide && (
          <div className="p-5 rounded-xl bg-zinc-950/90 border border-indigo-500/30 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Cenový průvodce & Doporučení pro úsporu nákladů
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Srovnání orientačních cen za 1M tokenů a doporučený výběr modelu podle typu požadavku.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(usageOverview?.pricingGuide || []).map((p) => (
                <div
                  key={p.model}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white font-mono">{p.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                        p.tier === "cheapest"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : p.tier === "very_low"
                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          : p.tier === "medium"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {p.tier}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Vstup (1M):</span>
                      <span className="text-zinc-200 font-semibold">${p.inputCostPer1M} USD</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Výstup (1M):</span>
                      <span className="text-zinc-200 font-semibold">${p.outputCostPer1M} USD</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Kontext:</span>
                      <span className="text-zinc-200">{p.contextWindow}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-800 leading-normal font-sans">
                    {p.recommendation}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-200/90 leading-relaxed">
              <strong>Tip pro úsporu:</strong> Pro prvotní hromadné generování a koncepty PBŘ je nejvýhodnější model{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-indigo-300 font-mono text-[10px]">
                gpt-4o-mini
              </code>
              , který ušetří až 90% nákladů oproti GPT-4o. Pro náročné technické výpočty a normy doporučujeme{" "}
              <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-indigo-300 font-mono text-[10px]">
                o3-mini
              </code>
              .
            </div>
          </div>
        )}

        {/* Collapsible Section: Recent Daily Usage */}
        {showDailyActivity && usageOverview?.recentDailyUsage && usageOverview.recentDailyUsage.length > 0 && (
          <div className="p-5 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-3 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📅</span> Denní aktivita a historie čerpání
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                    <th className="pb-2 font-semibold">Datum</th>
                    <th className="pb-2 font-semibold text-right">Požadavky</th>
                    <th className="pb-2 font-semibold text-right">Spotřebované tokeny</th>
                    <th className="pb-2 font-semibold text-right">Náklady (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {usageOverview.recentDailyUsage.map((d) => (
                    <tr key={d.date} className="hover:bg-zinc-900/40">
                      <td className="py-2 text-zinc-200 font-sans">{d.date}</td>
                      <td className="py-2 text-right text-zinc-300">{d.requests}x</td>
                      <td className="py-2 text-right text-amber-300/90">{d.tokens.toLocaleString()}</td>
                      <td className="py-2 text-right text-emerald-400 font-semibold">${d.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: API Token Management */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <div>
                <h3 className="text-sm font-bold text-white">OpenAI API Token (Osobní klíč)</h3>
                <p className="text-[11px] text-zinc-400">
                  Váš klíč je bezpečně přiřazen k vašemu uživatelskému účtu a používán výhradně pro vaše požadavky.
                </p>
              </div>
            </div>
            {config?.isConfigured && (
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                Aktivní: <strong className="text-emerald-400">{config.maskedKey}</strong>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              {config?.isConfigured ? "Změnit / Nový OpenAI API Key" : "Zadejte OpenAI API Key *"}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.isConfigured ? "Ponechte prázdné pro zachování stávajícího klíče" : "sk-proj-..."}
                className="w-full px-4 py-2.5 pr-24 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono tracking-wide"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 rounded border border-zinc-800"
                >
                  {showApiKey ? "Skrýt" : "Zobrazit"}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Klíč získáte na portálu{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:underline"
              >
                platform.openai.com/api-keys
              </a>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleValidateKey}
              disabled={validating || (!apiKey.trim() && !config?.isConfigured)}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-40"
            >
              {validating ? "Ověřování..." : "🔍 Ověřit platnost klíče"}
            </button>

            {config?.isConfigured && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={clearing}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-all active:scale-95 disabled:opacity-40"
              >
                {clearing ? "Odebírání..." : "🗑️ Odebrat token"}
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Model Selection & Runtime Usage */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <div>
                <h3 className="text-sm font-bold text-white">Výběr AI Modelu & Web Search</h3>
                <p className="text-[11px] text-zinc-400">
                  Vyberte model ze všech dostupných v OpenAI API nebo zadejte vlastní verzi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/80 text-zinc-300 font-mono">
                {modelsSource === "openai-api" ? "🟢 OpenAI API Live" : "⚪ Katalog modelů"}: {availableModels.length} modelů
              </span>
              <button
                type="button"
                onClick={() => fetchAvailableModels(apiKey.trim() || undefined)}
                disabled={fetchingModels}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-medium text-zinc-300 border border-zinc-700 transition-all flex items-center gap-1 active:scale-95 disabled:opacity-40"
                title="Znovu načíst modely z backend API"
              >
                <span className={fetchingModels ? "animate-spin" : ""}>🔄</span>
                <span>{fetchingModels ? "Načítání..." : "Obnovit modely"}</span>
              </button>
            </div>
          </div>

          {/* Active Selected Model Banner if selected model is outside basic list or custom */}
          {(!POPULAR_OPENAI_MODELS.includes(selectedModel) || isCustomModel) && (
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300">
                    🎯 Aktivní model:
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30">
                    {isCustomModel ? customModel || "Vlastní (nezadáno)" : selectedModel}
                  </span>
                  {activeModelDetail?.categoryLabel && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                      {activeModelDetail.categoryLabel}
                    </span>
                  )}
                  {isReasoning && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                      Reasoning
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400">
                  {activeModelDetail?.description || (isCustomModel ? "Vlastní uživatelsky specifikovaný model." : "Vybraný model z OpenAI API.")}
                </p>
              </div>
            </div>
          )}

          {/* Featured / Popular Models Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[10px] font-mono">
                ⭐ Doporučené & Populární Modely
              </span>
              <button
                type="button"
                onClick={() => setShowAllModelsList((prev) => !prev)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {showAllModelsList ? "Skrýt kompletní seznam ▲" : "Zobrazit kompletní seznam všech modelů z API ▼"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POPULAR_OPENAI_MODELS.map((m) => {
                const isSelected = !isCustomModel && selectedModel === m;
                const detail = modelDetails.find((d) => d.id === m);
                const isMReasoning = m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || detail?.isReasoning;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setIsCustomModel(false);
                      setSelectedModel(m);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold font-mono truncate">{m}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {m === "gpt-4o" && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                            Doporučeno
                          </span>
                        )}
                        {isMReasoning && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                            Reasoning
                          </span>
                        )}
                        {detail?.contextWindow && (
                          <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {detail.contextWindow}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                      {detail?.description ||
                        (m === "gpt-4o"
                          ? "Univerzální vlajkový model s vysokou přesností a rychlostí."
                          : m === "gpt-4o-mini"
                          ? "Ekonomický model s bleskovou odezvou a nízkou cenou."
                          : m === "o3-mini" || m === "o1"
                          ? "Hloubkové uvažování pro komplexní technické normy PBŘ."
                          : "Výkonný jazykový model pro expertní formulace.")}
                    </p>
                  </button>
                );
              })}

              {/* Custom Model Toggle Option */}
              <button
                type="button"
                onClick={() => setIsCustomModel(true)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isCustomModel
                    ? "bg-indigo-600/10 border-indigo-500 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500"
                    : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono">Vlastní Model</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                    Custom
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Zadejte vlastní OpenAI model nebo jemně doladěnou verzi (fine-tune).
                </p>
              </button>
            </div>
          </div>

          {/* Extended All Models Explorer & Search (Always accessible or expanded) */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                  📚 Kompletní Výběr Modelů z OpenAI API
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {filteredModels.length} / {availableModels.length}
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: `Všechny (${availableModels.length})` },
                  { id: "flagship", label: "Vlajkové" },
                  { id: "reasoning", label: "Reasoning" },
                  { id: "fast", label: "Rychlé" },
                  { id: "preview", label: "Preview / Turbo" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCategoryTab(tab.id)}
                    className={`px-2 py-0.8 rounded-lg text-[10px] font-medium transition-all ${
                      selectedCategoryTab === tab.id
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={modelSearchQuery}
                onChange={(e) => setModelSearchQuery(e.target.value)}
                placeholder="🔍 Hledat model v katalogu / API (např. o3-mini, gpt-4.5, gpt-4-turbo, chatgpt...)"
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="absolute left-3 top-2.5 text-zinc-500 text-xs pointer-events-none">
                🔎
              </span>
              {modelSearchQuery && (
                <button
                  type="button"
                  onClick={() => setModelSearchQuery("")}
                  className="absolute right-3 top-2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Select Grid of Filtered Models */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {filteredModels.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Žádný model neodpovídá vyhledávání &quot;{modelSearchQuery}&quot;. Můžete použít pole &quot;Vlastní Model&quot; níže.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredModels.map((m) => {
                    const isSelected = !isCustomModel && selectedModel === m;
                    const detail = modelDetails.find((d) => d.id === m);
                    const isMReasoning = m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || detail?.isReasoning;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setIsCustomModel(false);
                          setSelectedModel(m);
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className="text-xs font-mono font-bold truncate">{m}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && (
                              <span className="text-[10px] text-indigo-400 font-bold">✓ Vybráno</span>
                            )}
                            {isMReasoning && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                                Reasoning
                              </span>
                            )}
                          </div>
                        </div>
                        {detail?.description && (
                          <p className="text-[9px] text-zinc-400 mt-1 line-clamp-1">
                            {detail.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Custom Model Input if selected */}
          {isCustomModel && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Název vlastního OpenAI Modelu *
              </label>
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="např. gpt-4o-2024-08-06, ft:gpt-4o:my-org:... nebo interní model ID"
                required={isCustomModel}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-zinc-500">
                Můžete zadat libovolné model ID podporované vaším OpenAI API tokenem nebo jemně doladěnou verzi.
              </p>
            </div>
          )}

          {/* Advanced Switches: Web Search, Temperature, Organization */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Web Search Toggle */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-zinc-200 block">
                  🌐 Web Search / Web Využití
                </label>
                <span className="text-[11px] text-zinc-500 block">
                  Povolit živé dohledávání informací a norem na internetu
                </span>
              </div>
              <input
                type="checkbox"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer shrink-0"
              />
            </div>

            {/* Temperature Slider */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-200 block">
                  🌡️ Teplota (Kreativita)
                </label>
                <span className="text-xs font-mono font-bold text-indigo-400">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                disabled={isReasoning}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer disabled:opacity-30"
              />
              <span className="text-[10px] text-zinc-500 block">
                {isReasoning ? "Reasoning modely ignorují parametr teploty." : "0.0 = deterministické, 1.0 = kreativní"}
              </span>
            </div>

            {/* Organization ID */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-zinc-200 block">
                🏢 Organization ID (Volitelné)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="org-..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
            <span className="text-[11px] text-zinc-500">
              Nastavení se uloží ihned k vašemu uživatelskému profilu.
            </span>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Ukládání..." : "💾 Uložit Nastavení"}
            </button>
          </div>
        </div>
      </form>

      {/* Section 3: Interactive Prompt Test Playground */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <div>
              <h3 className="text-sm font-bold text-white">Testovací Playground & Verifikace</h3>
              <p className="text-[11px] text-zinc-400">
                Vyzkoušejte okamžitou odezvu s vaším zadaným tokenem a zvoleným modelem.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Testovací Prompt
          </label>
          <textarea
            rows={2}
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleRunTestPrompt}
            disabled={testing || (!config?.isConfigured && !apiKey.trim())}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-40"
          >
            {testing ? "Generuji odpověď..." : "▶️ Spustit Testovací Dotaz"}
          </button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-zinc-800">
              <span className="text-zinc-400">
                Model: <strong className="text-purple-300">{testResult.model || selectedModel}</strong>
              </span>
              <div className="flex items-center gap-3">
                {testResult.tokens && (
                  <span className="text-zinc-400">
                    Tokeny: <strong className="text-emerald-400">{testResult.tokens}</strong>
                  </span>
                )}
                {testResult.durationMs && (
                  <span className="text-zinc-400">
                    Doba: <strong className="text-sky-400">{testResult.durationMs} ms</strong>
                  </span>
                )}
              </div>
            </div>

            {testResult.error ? (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-200">
                <strong>Chyba:</strong> {testResult.error}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {testResult.completion}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
