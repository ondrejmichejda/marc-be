"use client";

import { useState, useEffect, useCallback } from "react";
import {
  OpenAiConfigStatus,
  OpenAiMessageLog,
  OpenAiUsageSummary,
} from "@/lib/openai/types";

export function OpenAiSystemView() {
  const [subTab, setSubTab] = useState<"usage" | "messages">("usage");

  // Usage & Config State
  const [config, setConfig] = useState<OpenAiConfigStatus | null>(null);
  const [usage, setUsage] = useState<OpenAiUsageSummary | null>(null);
  const [loadingUsage, setLoadingUsage] = useState<boolean>(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  // Messages Log State
  const [messages, setMessages] = useState<OpenAiMessageLog[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [selectedLog, setSelectedLog] = useState<OpenAiMessageLog | null>(null);

  // Test Playground State
  const [testPrompt, setTestPrompt] = useState<string>(
    "Zareaguj na zprávu 'Nestíhám trénink' vtipnou nadávkou, která nebude sprostá, ale pobaví."
  );
  const [testSystemPrompt, setTestSystemPrompt] = useState<string>("");
  const [testModel, setTestModel] = useState<string>("gpt-4o-mini");
  const [runningTest, setRunningTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    completion: string;
    log: OpenAiMessageLog;
  } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Fetch Usage & Config Summary
  const fetchUsageData = useCallback(async () => {
    setLoadingUsage(true);
    setUsageError(null);
    try {
      const res = await fetch("/api/openai/usage");
      const data = await res.json();

      if (!res.ok) {
        setUsageError(data.error || `Failed to fetch usage (${res.status})`);
        return;
      }

      if (data.config) setConfig(data.config);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : "Network error loading OpenAI usage.");
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  // Fetch Messages Log
  const fetchMessagesData = useCallback(async () => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (modelFilter !== "all") params.set("model", modelFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/openai/messages?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setMessagesError(data.error || `Failed to fetch messages (${res.status})`);
        return;
      }

      setMessages(data.messages || []);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Network error loading messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [limit, modelFilter, statusFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    let ignore = false;
    async function loadUsage() {
      try {
        const res = await fetch("/api/openai/usage");
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setUsageError(data.error || `Failed to fetch usage (${res.status})`);
          } else {
            if (data.config) setConfig(data.config);
            if (data.usage) setUsage(data.usage);
          }
        }
      } catch (err) {
        if (!ignore) {
          setUsageError(err instanceof Error ? err.message : "Network error loading OpenAI usage.");
        }
      }
    }
    loadUsage();
    return () => {
      ignore = true;
    };
  }, []);

  // Load messages on tab switch or filter changes
  useEffect(() => {
    if (subTab !== "messages") return;

    let ignore = false;
    async function loadMsg() {
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (modelFilter !== "all") params.set("model", modelFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/openai/messages?${params.toString()}`);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setMessagesError(data.error || `Failed to fetch messages (${res.status})`);
          } else {
            setMessages(data.messages || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          setMessagesError(err instanceof Error ? err.message : "Network error loading messages.");
        }
      }
    }
    loadMsg();
    return () => {
      ignore = true;
    };
  }, [subTab, limit, modelFilter, statusFilter, searchQuery]);

  // Handle Test Execution
  const handleExecuteTest = async () => {
    if (!testPrompt.trim()) return;
    setRunningTest(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/openai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: testPrompt.trim(),
          systemPrompt: testSystemPrompt.trim() || undefined,
          model: testModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || "Execution failed.");
      } else {
        setTestResult({
          completion: data.completion,
          log: data.log,
        });
        // Refresh usage telemetry after test
        fetchUsageData();
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to execute test prompt.");
    } finally {
      setRunningTest(false);
    }
  };

  // Handle Clearing Message Logs
  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to reset OpenAI message logs?")) return;
    try {
      const res = await fetch("/api/openai/messages", { method: "DELETE" });
      if (res.ok) {
        fetchMessagesData();
        fetchUsageData();
      }
    } catch (err) {
      console.error("Failed to clear logs:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submenu Header & Toggle */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-2xl">
            🧠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">OpenAI Intelligence Subsystem</h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                  config?.isConfigured
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {config?.isConfigured ? "API Key Active" : "Offline / Simulation Mode"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live token consumption metrics, estimated API costs, model telemetry, and prompt completion logs.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher: usage | messages */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          <button
            type="button"
            onClick={() => setSubTab("usage")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "usage"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📊 Usage Overview
          </button>
          <button
            type="button"
            onClick={() => setSubTab("messages")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "messages"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            💬 Messages Log
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: USAGE OVERVIEW */}
      {subTab === "usage" && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Total Requests</span>
              <p className="text-xl font-bold text-white font-mono">
                {usage ? usage.totalRequests : loadingUsage ? "..." : "0"}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="text-emerald-400">● {usage?.successfulRequests ?? 0} ok</span>
                {usage && usage.failedRequests > 0 && (
                  <span className="text-rose-400">● {usage.failedRequests} err</span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Total Tokens</span>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                {usage ? usage.totalTokens.toLocaleString() : loadingUsage ? "..." : "0"}
              </p>
              <div className="text-[10px] text-zinc-400 truncate">
                {usage ? `${usage.totalPromptTokens.toLocaleString()} in / ${usage.totalCompletionTokens.toLocaleString()} out` : "0 in / 0 out"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Estimated Cost</span>
              <p className="text-xl font-bold text-sky-400 font-mono">
                {usage ? `$${usage.estimatedTotalCostUsd.toFixed(4)}` : "$0.0000"}
              </p>
              <div className="text-[10px] text-zinc-500">Based on standard pricing</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Avg Response Time</span>
              <p className="text-xl font-bold text-indigo-300 font-mono">
                {usage ? `${usage.averageDurationMs} ms` : "0 ms"}
              </p>
              <div className="text-[10px] text-zinc-500">Mean request latency</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Success Rate</span>
              <p className="text-xl font-bold text-purple-300 font-mono">
                {usage && usage.totalRequests > 0
                  ? `${Math.round((usage.successfulRequests / usage.totalRequests) * 100)}%`
                  : "100%"}
              </p>
              <div className="text-[10px] text-zinc-500">Operational reliability</div>
            </div>
          </div>

          {usageError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{usageError}</span>
              </div>
              <button
                type="button"
                onClick={fetchUsageData}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Model Breakdown & Subsystem Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Usage Breakdown Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Model Usage Distribution
                </h3>
                <button
                  type="button"
                  onClick={fetchUsageData}
                  disabled={loadingUsage}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-50"
                >
                  {loadingUsage ? "Refreshing..." : "↻ Refresh"}
                </button>
              </div>

              {usage?.modelsUsed && usage.modelsUsed.length > 0 ? (
                <div className="space-y-3">
                  {usage.modelsUsed.map((m) => {
                    const percentage =
                      usage.totalTokens > 0
                        ? Math.round((m.totalTokens / usage.totalTokens) * 100)
                        : 0;

                    return (
                      <div
                        key={m.model}
                        className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              {m.model}
                            </span>
                            <span className="text-zinc-400">
                              {m.requestsCount} {m.requestsCount === 1 ? "call" : "calls"}
                            </span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-white font-bold">{m.totalTokens.toLocaleString()} tokens</span>
                            <span className="text-zinc-500 text-[11px] ml-1.5">(${m.estimatedCostUsd.toFixed(4)})</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${Math.max(5, percentage)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                          <span>Prompt: {m.promptTokens.toLocaleString()}</span>
                          <span>Completion: {m.completionTokens.toLocaleString()}</span>
                          <span>Share: {percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                  No model consumption recorded yet. Execute a test prompt below to generate telemetry.
                </div>
              )}
            </div>

            {/* Subsystem Configuration Telemetry Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Subsystem Environment & Quotas
              </h3>

              <div className="divide-y divide-zinc-800/60 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">API Key Status</span>
                  <span
                    className={`font-semibold font-mono ${
                      config?.isConfigured ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {config?.isConfigured
                      ? `Configured (${config.maskedKey || "Active"})`
                      : "Unconfigured (Simulated Fallback)"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Default Model</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {config?.defaultModel || "gpt-4o-mini"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Organization ID</span>
                  <span className="font-mono text-zinc-300">
                    {config?.organization || "Default Organization"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Supported Model Tiers</span>
                  <span className="text-zinc-300 font-mono text-[11px]">
                    gpt-4o-mini, gpt-4o, gpt-4-turbo
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Last Telemetry Event</span>
                  <span className="text-zinc-400 font-mono text-[11px]">
                    {usage?.lastUsedAt
                      ? new Date(usage.lastUsedAt).toLocaleTimeString()
                      : "Recently initialized"}
                  </span>
                </div>
              </div>

              {!config?.isConfigured && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed">
                  💡 <strong>Tip:</strong> Add <code className="text-amber-400 font-mono">OPENAI_API_KEY=&quot;sk-...&quot;</code> to your <code className="font-mono">.env.local</code> to enable live GPT API completions. In development without a key, all requests run seamlessly with realistic token simulation.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Prompt Playground Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🧪</span> OpenAI Prompt Playground & Diagnostics
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Test prompt completions in real-time and observe exact token usage and latency metrics.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setTestPrompt(
                      "Zareaguj na zprávu 'Nestíhám trénink' vtipnou nadávkou, která nebude sprostá, ale pobaví."
                    )
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300"
                >
                  Funny Insult
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTestPrompt("Vysvětli rozdíl mezi armbar a kimura v BJJ stručně ve dvou větách.")
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300"
                >
                  BJJ Terminology
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTestPrompt("Zanalyzuj efektivitu tréninkového plánu pro turnaj v Draculinu.")
                  }
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300"
                >
                  Schedule Strategy
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="w-full sm:w-1/3 space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400">Target Model</label>
                  <select
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Efficient)</option>
                    <option value="gpt-4o">gpt-4o (High Intelligence)</option>
                    <option value="gpt-4-turbo">gpt-4-turbo (Legacy High Cap)</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (Basic)</option>
                  </select>
                </div>

                <div className="w-full sm:w-2/3 space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400">Optional System Directive</label>
                  <input
                    type="text"
                    placeholder="e.g. Jsi instruktor brazilského jiu-jitsu..."
                    value={testSystemPrompt}
                    onChange={(e) => setTestSystemPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400">Prompt Text</label>
                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">
                  {testPrompt.length} characters (~{Math.round(testPrompt.length / 4)} tokens)
                </span>
                <button
                  type="button"
                  onClick={handleExecuteTest}
                  disabled={runningTest || !testPrompt.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
                >
                  {runningTest ? (
                    <>
                      <span className="animate-spin">↻</span> Generating Completion...
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Execute Prompt Test
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test Execution Result Banner */}
            {testError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                ⚠️ {testError}
              </div>
            )}

            {testResult && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2.5">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>✅</span> Completion Output ({testResult.log.model})
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                      ⏱ {testResult.log.durationMs}ms
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      🪙 {testResult.log.totalTokens} tokens ({testResult.log.promptTokens} in / {testResult.log.completionTokens} out)
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-100 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80">
                  {testResult.completion}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: MESSAGES OVERVIEW */}
      {subTab === "messages" && (
        <div className="space-y-4">
          {/* Controls & Search Toolbar */}
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search prompts, completions, or identifiers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="absolute left-2.5 top-2.5 text-zinc-500 text-xs">🔍</span>
              </div>

              {/* Model Filter */}
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="all">All Models</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>

              {/* Status Filter */}
              <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-zinc-800 text-white font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("success")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === "success"
                      ? "bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Success
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("error")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === "error"
                      ? "bg-rose-600/30 text-rose-300 font-bold border border-rose-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Error
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono"
              >
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </select>

              <button
                type="button"
                onClick={fetchMessagesData}
                disabled={loadingMessages}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs disabled:opacity-50"
                title="Refresh messages"
              >
                ↻
              </button>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-2 bg-zinc-800/80 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 rounded-xl text-xs font-medium transition-all border border-zinc-700/50"
                title="Reset log history"
              >
                Clear
              </button>
            </div>
          </div>

          {messagesError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              ⚠️ {messagesError}
            </div>
          )}

          {/* Messages Log Table / Cards */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center text-xs text-zinc-400 font-mono">
              <span>{messages.length} interactions logged</span>
              <span className="text-[11px] text-zinc-500">Sorted by newest first</span>
            </div>

            {loadingMessages ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                <span className="animate-spin inline-block mr-2">↻</span> Loading OpenAI interaction stream...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-xs">
                No OpenAI messages match your search criteria.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedLog(m)}
                    className="p-4 hover:bg-zinc-800/30 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            m.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {m.status.toUpperCase()}
                        </span>
                        <span className="font-mono font-bold text-zinc-200 px-2 py-0.5 rounded bg-zinc-800/80 text-[11px]">
                          {m.model}
                        </span>
                        {m.source && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            src: {m.source}
                          </span>
                        )}
                        {m.userIdentifier && (
                          <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">
                            usr: {m.userIdentifier}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                        <span className="text-zinc-500">{new Date(m.createdAt).toLocaleTimeString()}</span>
                        <span className="text-zinc-300">⏱ {m.durationMs}ms</span>
                        <span className="text-emerald-400 font-semibold">
                          🪙 {m.totalTokens} tok ({m.promptTokens} in / {m.completionTokens} out)
                        </span>
                      </div>
                    </div>

                    {/* Prompt & Completion Snippets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Prompt</span>
                        <p className="text-zinc-300 line-clamp-2 font-mono text-[11px]">
                          {m.prompt || "(empty prompt)"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">
                          {m.status === "error" ? "Error Message" : "Completion"}
                        </span>
                        <p
                          className={`line-clamp-2 font-mono text-[11px] ${
                            m.status === "error" ? "text-rose-400 font-semibold" : "text-emerald-300/90"
                          }`}
                        >
                          {m.status === "error"
                            ? m.errorMessage || "Unknown error"
                            : m.completion || "(empty completion)"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw Payload & Detail Modal Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🧠</span> OpenAI Message Log Details
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  ID: {selectedLog.id} • {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Telemetry pill row */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200">
                  Model: <strong className="text-emerald-400">{selectedLog.model}</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200">
                  Status: <strong className={selectedLog.status === "success" ? "text-emerald-400" : "text-rose-400"}>{selectedLog.status}</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200">
                  Duration: <strong className="text-indigo-300">{selectedLog.durationMs} ms</strong>
                </span>
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200">
                  Tokens: <strong className="text-emerald-300">{selectedLog.totalTokens}</strong> ({selectedLog.promptTokens} in / {selectedLog.completionTokens} out)
                </span>
              </div>

              {/* Full Prompt */}
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">Full Prompt:</span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                  {selectedLog.prompt}
                </pre>
              </div>

              {/* Full Completion */}
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">
                  {selectedLog.status === "error" ? "Error Details:" : "Full Completion:"}
                </span>
                <pre
                  className={`p-3 bg-zinc-950 border rounded-xl whitespace-pre-wrap break-words max-h-48 overflow-y-auto ${
                    selectedLog.status === "error"
                      ? "border-rose-900/60 text-rose-300"
                      : "border-zinc-800 text-emerald-300"
                  }`}
                >
                  {selectedLog.status === "error"
                    ? selectedLog.errorMessage
                    : selectedLog.completion}
                </pre>
              </div>

              {/* Raw Payload JSON */}
              {selectedLog.rawPayload && (
                <div className="space-y-1">
                  <span className="text-[11px] text-zinc-400 uppercase font-semibold">Raw JSON Payload:</span>
                  <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 text-[11px] overflow-x-auto max-h-48 overflow-y-auto">
                    {JSON.stringify(selectedLog.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
