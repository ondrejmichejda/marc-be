"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageLog, MessageDirection } from "@/lib/telegram/types";

interface BotMeInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export function TelegramBotSystemView() {
  const [subTab, setSubTab] = useState<"info" | "messages">("info");

  // Bot Info & Webhook State
  const [botInfo, setBotInfo] = useState<BotMeInfo | null>(null);
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Webhook action state
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>("");
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Broadcast test state
  const [broadcastMsg, setBroadcastMsg] = useState<string>("Test broadcast message from System Console");
  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);

  // Messages Log State
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<"all" | MessageDirection>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [selectedRawMessage, setSelectedRawMessage] = useState<MessageLog | null>(null);

  // Fetch Telegram Bot & Webhook Info
  const fetchBotAndWebhookInfo = useCallback(async () => {
    setLoadingInfo(true);
    setInfoError(null);
    try {
      const res = await fetch("/api/telegram/setup-webhook");
      const data = await res.json();

      if (!res.ok) {
        setIsConfigured(false);
        setInfoError(data.error || `Failed to fetch Telegram status (${res.status})`);
        return;
      }

      setIsConfigured(true);
      if (data.bot) setBotInfo(data.bot);
      if (data.webhook) setWebhookInfo(data.webhook);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Failed to load bot telemetry.");
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  // Fetch Messages Log
  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (directionFilter !== "all") {
        params.set("direction", directionFilter);
      }

      const res = await fetch(`/api/telegram/messages?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setMessagesError(data.error || "Failed to load message logs");
        return;
      }

      setMessages(data.messages || []);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [limit, directionFilter]);

  // Initial load for Bot Info
  useEffect(() => {
    let ignore = false;
    async function loadInfo() {
      try {
        const res = await fetch("/api/telegram/setup-webhook");
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setIsConfigured(false);
            setInfoError(data.error || `Failed to fetch Telegram status (${res.status})`);
          } else {
            setIsConfigured(true);
            if (data.bot) setBotInfo(data.bot);
            if (data.webhook) setWebhookInfo(data.webhook);
          }
        }
      } catch (err) {
        if (!ignore) {
          setInfoError(err instanceof Error ? err.message : "Failed to load bot telemetry.");
        }
      }
    }
    loadInfo();
    return () => {
      ignore = true;
    };
  }, []);

  // Load messages when tab is switched to messages or filters change
  useEffect(() => {
    if (subTab !== "messages") return;

    let ignore = false;
    async function loadMsg() {
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (directionFilter !== "all") {
          params.set("direction", directionFilter);
        }

        const res = await fetch(`/api/telegram/messages?${params.toString()}`);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setMessagesError(data.error || "Failed to load message logs");
          } else {
            setMessages(data.messages || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          setMessagesError(err instanceof Error ? err.message : "Failed to load messages.");
        }
      }
    }
    loadMsg();
    return () => {
      ignore = true;
    };
  }, [subTab, limit, directionFilter]);

  // Webhook action handlers
  const handleRegisterWebhook = async () => {
    setRunningAction("register");
    setActionFeedback(null);
    try {
      const body: { url?: string } = {};
      if (customWebhookUrl.trim()) {
        body.url = customWebhookUrl.trim();
      }

      const res = await fetch("/api/telegram/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: "error",
          message: data.error || `Registration failed (HTTP ${res.status})`,
        });
      } else {
        setActionFeedback({
          type: "success",
          message: `Webhook registered successfully: ${data.webhookUrl || "Active"}`,
        });
        if (data.webhookInfo) setWebhookInfo(data.webhookInfo);
      }
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error during registration.",
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!window.confirm("Are you sure you want to unregister and delete the active Telegram webhook?")) {
      return;
    }

    setRunningAction("delete");
    setActionFeedback(null);
    try {
      const res = await fetch("/api/telegram/setup-webhook", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: "error",
          message: data.error || "Failed to delete webhook.",
        });
      } else {
        setActionFeedback({
          type: "success",
          message: "Telegram webhook deleted successfully.",
        });
        fetchBotAndWebhookInfo();
      }
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Network error during deletion.",
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleSendTestBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSendingBroadcast(true);
    setActionFeedback(null);
    try {
      const res = await fetch("/api/telegram/notify-deployment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: broadcastMsg,
          releaseNotes: "Triggered from System Administration Console",
          force: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: "error",
          message: data.error || "Broadcast failed",
        });
      } else {
        setActionFeedback({
          type: "success",
          message: `Broadcast delivered: ${data.result?.sent ?? 0} sent, ${data.result?.total ?? 0} total subscribers.`,
        });
      }
    } catch (err) {
      setActionFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Broadcast network error",
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Filter messages by search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const textMatch = m.text?.toLowerCase().includes(q);
    const userMatch = m.username?.toLowerCase().includes(q) || m.firstName?.toLowerCase().includes(q);
    const chatMatch = String(m.chatId).includes(q) || String(m.userId || "").includes(q);
    return textMatch || userMatch || chatMatch;
  });

  return (
    <div className="space-y-6">
      {/* Submenu Header & Toggle */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-400 text-2xl">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Telegram Bot Subsystem</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                isConfigured
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {isConfigured ? "Token Configured" : "Config Notice"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live bot telemetry, webhook routing parameters, diagnostics, and real-time message stream.
            </p>
          </div>
        </div>

        {/* Sub-tab Switcher: info | messages log */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
          <button
            type="button"
            onClick={() => setSubTab("info")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "info"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ℹ️ Bot Info
          </button>
          <button
            type="button"
            onClick={() => setSubTab("messages")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === "messages"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20 font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            📋 Messages Log
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
            actionFeedback.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
              : "bg-rose-950/40 text-rose-300 border-rose-800/60"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionFeedback.type === "success" ? "✅" : "⚠️"}</span>
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUBVIEW 1: INFO */}
      {subTab === "info" && (
        <div className="space-y-6">
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Bot Username</span>
              <p className="text-sm font-bold text-sky-400 truncate">
                {botInfo?.username ? `@${botInfo.username}` : (loadingInfo ? "Loading..." : "Not Connected")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Bot Identity ID</span>
              <p className="text-sm font-bold text-indigo-300 font-mono">
                {botInfo?.id ? botInfo.id : (loadingInfo ? "Loading..." : "—")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Webhook Status</span>
              <p className={`text-sm font-bold ${webhookInfo?.url ? "text-emerald-400" : "text-amber-400"}`}>
                {webhookInfo?.url ? "Active Hook" : (loadingInfo ? "Checking..." : "No Webhook")}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Pending Updates</span>
              <p className="text-sm font-bold text-zinc-200 font-mono">
                {webhookInfo ? `${webhookInfo.pending_update_count} queued` : "0"}
              </p>
            </div>
          </div>

          {infoError && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{infoError}</span>
              </div>
              <button
                type="button"
                onClick={fetchBotAndWebhookInfo}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Bot Profile & Webhook Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bot Profile Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🤖</span> Bot Profile & Capabilities
                </h3>
                <button
                  type="button"
                  onClick={fetchBotAndWebhookInfo}
                  disabled={loadingInfo}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold disabled:opacity-50"
                >
                  {loadingInfo ? "Refreshing..." : "↻ Refresh Info"}
                </button>
              </div>

              <div className="divide-y divide-zinc-800/60 text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Display Name</span>
                  <span className="font-semibold text-white">{botInfo?.first_name || "—"}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Telegram Username</span>
                  <span className="font-mono text-sky-400">{botInfo?.username ? `@${botInfo.username}` : "—"}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Account Type</span>
                  <span className="text-zinc-200">Verified Telegram Bot</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Can Join Groups</span>
                  <span className={botInfo?.can_join_groups ? "text-emerald-400 font-semibold" : "text-zinc-400"}>
                    {botInfo?.can_join_groups ? "Yes (Enabled)" : "No"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Read All Group Messages</span>
                  <span className={botInfo?.can_read_all_group_messages ? "text-emerald-400 font-semibold" : "text-zinc-400"}>
                    {botInfo?.can_read_all_group_messages ? "Yes (Privacy Disabled)" : "No (Privacy Mode)"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Supports Inline Queries</span>
                  <span className={botInfo?.supports_inline_queries ? "text-emerald-400 font-semibold" : "text-zinc-400"}>
                    {botInfo?.supports_inline_queries ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Webhook Configuration Card */}
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚡</span> Live Webhook Status
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">API Endpoint</span>
              </div>

              <div className="divide-y divide-zinc-800/60 text-xs">
                <div className="py-2.5 space-y-1">
                  <span className="text-zinc-400 block">Registered Webhook URL</span>
                  <p className="font-mono text-zinc-200 break-all bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[11px]">
                    {webhookInfo?.url || "No active webhook URL registered"}
                  </p>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Custom SSL Certificate</span>
                  <span className="text-zinc-300 font-mono">
                    {webhookInfo?.has_custom_certificate ? "True (Self-signed)" : "False (CA Verified)"}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-zinc-400">Max Concurrent Connections</span>
                  <span className="text-zinc-300 font-mono">{webhookInfo?.max_connections ?? 40}</span>
                </div>
                {webhookInfo?.ip_address && (
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-zinc-400">Resolved IP Address</span>
                    <span className="text-zinc-300 font-mono">{webhookInfo.ip_address}</span>
                  </div>
                )}
                {webhookInfo?.last_error_message && (
                  <div className="py-2.5 space-y-1">
                    <span className="text-rose-400 font-semibold">Last Webhook Error</span>
                    <p className="text-rose-300 font-mono text-[11px] bg-rose-950/30 p-2 rounded border border-rose-800/50">
                      {webhookInfo.last_error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Webhook Management Actions & Testing */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🛠️</span> Webhook Registration & Controls
            </h3>
            <p className="text-xs text-zinc-400">
              Register or update the Telegram Webhook callback endpoint. Leave custom URL empty to use server default <code className="text-zinc-300 font-mono">APP_URL</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="sm:col-span-2">
                <input
                  type="url"
                  value={customWebhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  placeholder="https://your-public-domain.com/api/telegram/webhook"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRegisterWebhook}
                  disabled={runningAction !== null}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {runningAction === "register" ? "Registering..." : "🚀 Set Webhook"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteWebhook}
                  disabled={runningAction !== null}
                  className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  {runningAction === "delete" ? "Deleting..." : "🗑️ Delete"}
                </button>
              </div>
            </div>

            {/* Test Broadcast trigger */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Broadcast Test Notification to Subscribers
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Notification text..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendTestBroadcast}
                  disabled={sendingBroadcast || !broadcastMsg.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {sendingBroadcast ? "Sending..." : "📢 Test Broadcast"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 2: MESSAGES LOG */}
      {subTab === "messages" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Direction selector */}
              <div className="flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setDirectionFilter("all")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === "all"
                      ? "bg-sky-600 text-white font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Directions
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter("incoming")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === "incoming"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📥 Incoming
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter("outgoing")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === "outgoing"
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📤 Outgoing
                </button>
              </div>

              {/* Limit dropdown */}
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-mono focus:outline-none focus:border-sky-500"
              >
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </select>
            </div>

            {/* Search Input & Refresh Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text, chat ID, username..."
                className="w-full sm:w-56 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={fetchMessages}
                disabled={loadingMessages}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all active:scale-95 shrink-0 disabled:opacity-50"
              >
                {loadingMessages ? "↻ ..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          {messagesError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <span>⚠️ {messagesError}</span>
              <button
                type="button"
                onClick={fetchMessages}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Messages Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="p-3.5">Direction</th>
                  <th className="p-3.5">Chat / User</th>
                  <th className="p-3.5">Message Content</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loadingMessages && messages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      Loading Telegram message history...
                    </td>
                  </tr>
                ) : filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No Telegram messages found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((msg) => {
                    const isIncoming = msg.direction === "incoming";
                    const senderDisplay = msg.username
                      ? `@${msg.username}`
                      : msg.firstName || `Chat ${msg.chatId}`;

                    return (
                      <tr key={String(msg.id)} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                              isIncoming
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                            }`}
                          >
                            <span>{isIncoming ? "📥 In" : "📤 Out"}</span>
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {senderDisplay}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Chat ID: {msg.chatId} {msg.chatType ? `(${msg.chatType})` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 max-w-md">
                          <p className="font-mono text-xs text-zinc-200 line-clamp-2 break-all bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                            {msg.text || (msg.messageType ? `[${msg.messageType}]` : "—")}
                          </p>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                          {new Date(msg.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRawMessage(msg)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono border border-zinc-700/60 transition-all active:scale-95"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Raw Payload Modal */}
          {selectedRawMessage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Raw Message Payload</span>
                    <span className="text-xs font-mono text-zinc-400">
                      ID: {String(selectedRawMessage.id)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRawMessage(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 bg-zinc-950/80">
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedRawMessage, null, 2)}
                  </pre>
                </div>
                <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedRawMessage(null)}
                    className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
