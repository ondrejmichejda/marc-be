"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ScheduledAiPrompt,
  ScheduledPromptsSummary,
  PromptScheduledTime,
  SCHEDULED_TIME_OPTIONS,
  SCHEDULED_TIME_DETAILS,
} from "@/lib/prompts/types";

interface AiPromptsViewProps {
  userId?: string;
}

const SAMPLE_PROMPT_TEMPLATES = [
  {
    title: "Morning Routine & Focus",
    time: "9am" as PromptScheduledTime,
    text: "Připrav mi 3 hlavní priority pro dnešní den zaměřené na efektivitu, zdraví a bjj trénink. Piš stručně a energicky.",
  },
  {
    title: "Afternoon Energy Boost & BJJ Tip",
    time: "1pm" as PromptScheduledTime,
    text: "Vysvětli jeden taktický koncept pro odpolední trénink na žíněnce (např. guard retention nebo kontrolu vzdálenosti).",
  },
  {
    title: "Evening Reflection & Recovery",
    time: "5pm" as PromptScheduledTime,
    text: "Shrň večerní regenerační protokol: strečink, hydratace, spánková hygiena a mentální odpočinek.",
  },
];

export function AiPromptsView({ userId }: AiPromptsViewProps) {
  // State
  const [prompts, setPrompts] = useState<ScheduledAiPrompt[]>([]);
  const [summary, setSummary] = useState<ScheduledPromptsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create form state
  const [newTitle, setNewTitle] = useState<string>("");
  const [newPromptText, setNewPromptText] = useState<string>("");
  const [newScheduledTime, setNewScheduledTime] = useState<PromptScheduledTime>("9am");
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  // Edit modal state
  const [editingPrompt, setEditingPrompt] = useState<ScheduledAiPrompt | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editPromptText, setEditPromptText] = useState<string>("");
  const [editScheduledTime, setEditScheduledTime] = useState<PromptScheduledTime>("9am");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  // Execution modal/live preview state
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    promptId: string;
    promptTitle: string;
    promptText: string;
    time: string;
    completion: string;
    durationMs: number;
    telegramDelivery?: {
      sent: boolean;
      subscriber?: {
        chatId: number;
        firstName?: string;
        lastName?: string;
        username?: string;
      };
      error?: string;
    };
  } | null>(null);

  // Fetch prompts
  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedTimeFilter !== "all") params.set("time", selectedTimeFilter);
      if (selectedStatusFilter !== "all") params.set("status", selectedStatusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (userId) params.set("userId", userId);

      const res = await fetch(`/api/prompts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load scheduled prompts.");
        return;
      }

      setPrompts(data.prompts || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error loading prompts.");
    } finally {
      setLoading(false);
    }
  }, [selectedTimeFilter, selectedStatusFilter, searchQuery, userId]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (selectedTimeFilter !== "all") params.set("time", selectedTimeFilter);
        if (selectedStatusFilter !== "all") params.set("status", selectedStatusFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (userId) params.set("userId", userId);

        const res = await fetch(`/api/prompts?${params.toString()}`);
        const data = await res.json();

        if (!ignore) {
          if (!res.ok) {
            setError(data.error || "Failed to load scheduled prompts.");
          } else {
            setPrompts(data.prompts || []);
            if (data.summary) setSummary(data.summary);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Network error loading prompts.");
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
  }, [selectedTimeFilter, selectedStatusFilter, searchQuery, userId]);

  // Handle create
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim()) {
      setError("Please enter a prompt text.");
      return;
    }

    setCreating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newPromptText.trim(),
          scheduledTime: newScheduledTime,
          title: newTitle.trim() || undefined,
          isActive: newIsActive,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create scheduled prompt.");
        return;
      }

      setActionSuccess(`Prompt created for ${SCHEDULED_TIME_DETAILS[newScheduledTime].timeLabel}!`);
      setNewTitle("");
      setNewPromptText("");
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating scheduled prompt.");
    } finally {
      setCreating(false);
    }
  };

  // Handle open edit modal
  const openEditModal = (prompt: ScheduledAiPrompt) => {
    setEditingPrompt(prompt);
    setEditTitle(prompt.title);
    setEditPromptText(prompt.prompt);
    setEditScheduledTime(prompt.scheduledTime);
    setEditIsActive(prompt.isActive);
  };

  // Handle save edit
  const handleUpdatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;

    setUpdating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/prompts/${editingPrompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPromptText.trim(),
          scheduledTime: editScheduledTime,
          title: editTitle.trim(),
          isActive: editIsActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update prompt.");
        return;
      }

      setActionSuccess("Scheduled AI prompt updated successfully.");
      setEditingPrompt(null);
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating prompt.");
    } finally {
      setUpdating(false);
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (prompt: ScheduledAiPrompt) => {
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !prompt.isActive,
        }),
      });

      if (res.ok) {
        fetchPrompts();
      }
    } catch {
      // silent
    }
  };

  // Handle delete
  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled prompt?")) return;

    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete prompt.");
        return;
      }

      setActionSuccess("Prompt deleted successfully.");
      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting prompt.");
    }
  };

  // Handle run prompt now
  const handleRunPromptNow = async (prompt: ScheduledAiPrompt) => {
    setRunningPromptId(prompt.id);
    setError(null);

    try {
      const res = await fetch(`/api/prompts/${prompt.id}/run`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to execute prompt.");
        return;
      }

      setExecutionResult({
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptText: prompt.prompt,
        time: SCHEDULED_TIME_DETAILS[prompt.scheduledTime].timeLabel,
        completion: data.completion,
        durationMs: data.durationMs,
        telegramDelivery: data.telegramDelivery,
      });

      fetchPrompts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error executing prompt.");
    } finally {
      setRunningPromptId(null);
    }
  };

  // Template autofill
  const applyTemplate = (template: (typeof SAMPLE_PROMPT_TEMPLATES)[0]) => {
    setNewTitle(template.title);
    setNewScheduledTime(template.time);
    setNewPromptText(template.text);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-2xl">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Scheduled AI Prompts</h1>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  User Automation
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure personalized AI prompts scheduled at <strong>9:00 AM</strong>, <strong>1:00 PM</strong>, or <strong>5:00 PM</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPrompts}
            disabled={loading}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Time Option Quick Statistics */}
        <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase">Total Prompts</span>
            <p className="text-lg font-bold text-white">{summary?.total ?? prompts.length}</p>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-1">
            <span className="text-[11px] font-mono text-amber-300 uppercase flex items-center gap-1">
              <span>🌅</span> 9:00 AM
            </span>
            <p className="text-lg font-bold text-amber-300">
              {summary?.byTime["9am"] ?? prompts.filter((p) => p.scheduledTime === "9am").length}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-800/40 space-y-1">
            <span className="text-[11px] font-mono text-sky-300 uppercase flex items-center gap-1">
              <span>☀️</span> 1:00 PM
            </span>
            <p className="text-lg font-bold text-sky-300">
              {summary?.byTime["1pm"] ?? prompts.filter((p) => p.scheduledTime === "1pm").length}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1">
            <span className="text-[11px] font-mono text-purple-300 uppercase flex items-center gap-1">
              <span>🌇</span> 5:00 PM
            </span>
            <p className="text-lg font-bold text-purple-300">
              {summary?.byTime["5pm"] ?? prompts.filter((p) => p.scheduledTime === "5pm").length}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs font-medium text-emerald-300 flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} className="opacity-70 hover:opacity-100 font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs font-medium text-rose-300 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Live Execution Output Modal */}
      {executionResult && (
        <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-700/50 space-y-4 animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="text-sm font-bold text-white">Live Execution Result: {executionResult.promptTitle}</h3>
                <span className="text-[11px] text-indigo-300 font-mono">
                  Scheduled for {executionResult.time} • Duration: {executionResult.durationMs}ms
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExecutionResult(null)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold"
            >
              ✕ Close Preview
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 font-mono text-xs text-zinc-300 space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Prompt Input:</span>
            <p className="text-zinc-400">{executionResult.promptText}</p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900 border border-indigo-500/30 text-xs text-zinc-100 whitespace-pre-wrap leading-relaxed">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-2">
              Generated AI Completion:
            </span>
            {executionResult.completion}
          </div>

          {/* Johan Bot Telegram Delivery Status Badge */}
          {executionResult.telegramDelivery && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                executionResult.telegramDelivery.sent
                  ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-200"
                  : "bg-amber-950/30 border-amber-700/50 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🤖</span>
                <div>
                  <span className="font-semibold block text-xs">
                    Johan Bot Telegram Delivery:{" "}
                    {executionResult.telegramDelivery.sent ? "Odesláno" : "Nepodařilo se doručit"}
                  </span>
                  {executionResult.telegramDelivery.subscriber ? (
                    <span className="text-[11px] opacity-80 font-mono block">
                      Příjemce: {executionResult.telegramDelivery.subscriber.firstName || ""}{" "}
                      {executionResult.telegramDelivery.subscriber.lastName || ""} (Chat ID:{" "}
                      {executionResult.telegramDelivery.subscriber.chatId})
                    </span>
                  ) : (
                    <span className="text-[11px] opacity-80 block">
                      {executionResult.telegramDelivery.error ||
                        "Nebyl nalezen shodný Telegram odběratel dle jména a příjmení."}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                  executionResult.telegramDelivery.sent
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {executionResult.telegramDelivery.sent ? "DELIVERED" : "UNMATCHED"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Create Form on Left / Top, Saved Prompts List on Right / Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Form Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleCreatePrompt}
            className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>➕</span> Create Scheduled AI Prompt
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">3 Time Options</span>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Quick Starters
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition-all text-left"
                  >
                    {SCHEDULED_TIME_DETAILS[tmpl.time].icon} {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Prompt Title (Optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Morning Jiu-Jitsu Mindset"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* 3 Scheduled Time Options (9am, 1pm, 5pm) */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Select Execution Time * (3 Options)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SCHEDULED_TIME_OPTIONS.map((timeKey) => {
                  const details = SCHEDULED_TIME_DETAILS[timeKey];
                  const isSelected = newScheduledTime === timeKey;
                  return (
                    <button
                      key={timeKey}
                      type="button"
                      onClick={() => setNewScheduledTime(timeKey)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? `${details.colorClass.bg} ${details.colorClass.border} ring-2 ring-indigo-500/50 shadow-md`
                          : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{details.icon}</span>
                        {isSelected && <span className="text-[10px] text-indigo-400 font-bold">✓</span>}
                      </div>
                      <div className="mt-2">
                        <div className={`text-xs font-bold ${isSelected ? details.colorClass.text : "text-zinc-200"}`}>
                          {details.timeLabel}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{details.period}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Prompt Instructions *
              </label>
              <textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                rows={4}
                required
                placeholder="Enter prompt instructions for the AI model..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all font-mono leading-relaxed"
              />
            </div>

            {/* Status Toggle & Submit */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
                <input
                  type="checkbox"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0"
                />
                <span>Active Status</span>
              </label>

              <button
                type="submit"
                disabled={creating || !newPromptText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {creating ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>+</span>
                    <span>Save Prompt</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Saved Prompts Management Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts by text or title..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500">🔍</span>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused Only</option>
                </select>
              </div>
            </div>

            {/* Time Slot Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-zinc-800/60 pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedTimeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  selectedTimeFilter === "all"
                    ? "bg-zinc-100 text-zinc-950 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                All Times ({prompts.length})
              </button>

              {SCHEDULED_TIME_OPTIONS.map((timeKey) => {
                const details = SCHEDULED_TIME_DETAILS[timeKey];
                const count = prompts.filter((p) => p.scheduledTime === timeKey).length;
                const isSelected = selectedTimeFilter === timeKey;
                return (
                  <button
                    key={timeKey}
                    type="button"
                    onClick={() => setSelectedTimeFilter(timeKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span>{details.icon}</span>
                    <span>{details.timeLabel}</span>
                    <span className="text-[10px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompts List */}
          {loading && prompts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 space-y-2">
              <div className="animate-spin text-2xl mx-auto w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              <p className="text-xs text-zinc-400">Loading saved prompts...</p>
            </div>
          ) : prompts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800 space-y-3">
              <span className="text-3xl">📭</span>
              <h4 className="text-sm font-bold text-white">No Scheduled Prompts Found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No prompts match the current filter. Create a prompt using the form on the left with one of the 3 time options (9am, 1pm, 5pm).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map((p) => {
                const timeInfo = SCHEDULED_TIME_DETAILS[p.scheduledTime] || SCHEDULED_TIME_DETAILS["9am"];
                const isRunning = runningPromptId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      p.isActive
                        ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                        : "bg-zinc-950/40 border-zinc-800/50 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Time Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${timeInfo.colorClass.badge}`}
                          >
                            <span>{timeInfo.icon}</span>
                            <span>{timeInfo.timeLabel}</span>
                          </span>

                          {/* Model Badge */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {p.model}
                          </span>

                          {/* Active / Paused Pill */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            title="Click to toggle status"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                              p.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? "bg-emerald-400" : "bg-zinc-600"}`} />
                            <span>{p.isActive ? "Active" : "Paused"}</span>
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-white pt-1">{p.title}</h4>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Run Now */}
                        <button
                          type="button"
                          onClick={() => handleRunPromptNow(p)}
                          disabled={isRunning}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                          title="Execute prompt now via OpenAI"
                        >
                          {isRunning ? (
                            <>
                              <span className="animate-spin text-[10px]">🌀</span>
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>Run Now</span>
                            </>
                          )}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700/60 transition-all active:scale-95"
                          title="Edit prompt"
                        >
                          ✏️
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(p.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-all active:scale-95"
                          title="Delete prompt"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Prompt Content */}
                    <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {p.prompt}
                    </div>

                    {/* Last Run Info */}
                    {p.lastRunAt && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                        <span>🕒 Last run: {new Date(p.lastRunAt).toLocaleString()}</span>
                        {p.lastRunResult && (
                          <span className="text-emerald-400/90 truncate max-w-xs">
                            • Result saved
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✏️</span> Edit Scheduled Prompt
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrompt(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePrompt} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Prompt Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Time selection (9am, 1pm, 5pm) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Execution Time (3 Options)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SCHEDULED_TIME_OPTIONS.map((timeKey) => {
                    const details = SCHEDULED_TIME_DETAILS[timeKey];
                    const isSelected = editScheduledTime === timeKey;
                    return (
                      <button
                        key={timeKey}
                        type="button"
                        onClick={() => setEditScheduledTime(timeKey)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? `${details.colorClass.bg} ${details.colorClass.border} ring-2 ring-indigo-500/50`
                            : "bg-zinc-950/60 border-zinc-800 text-zinc-400"
                        }`}
                      >
                        <div className="text-sm">{details.icon}</div>
                        <div className={`text-xs font-bold ${isSelected ? details.colorClass.text : "text-zinc-200"}`}>
                          {details.timeLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Prompt Instructions
                </label>
                <textarea
                  value={editPromptText}
                  onChange={(e) => setEditPromptText(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 select-none">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Active Status</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPrompt(null)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating || !editPromptText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
