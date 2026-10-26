"use client";

import { useState } from "react";

interface WebhookDeploymentControlsProps {
  defaultAppUrl?: string;
  telegramConfigured: boolean;
}

interface CommandResult {
  action: string;
  status: "success" | "error" | "loading";
  statusCode?: number;
  data?: unknown;
  timestamp: string;
  error?: string;
}

export function WebhookDeploymentControls({
  defaultAppUrl = "",
  telegramConfigured,
}: WebhookDeploymentControlsProps) {
  const [customUrl, setCustomUrl] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("Manual release via dashboard");
  const [deployId, setDeployId] = useState<string>(() => `deploy-${Date.now().toString(36)}`);
  const [secretKey, setSecretKey] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"webhook" | "broadcast" | "cli">("webhook");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);

  const runSetupWebhook = async () => {
    setLoadingAction("setup");
    const timestamp = new Date().toLocaleTimeString();
    try {
      const payload: { url?: string } = {};
      if (customUrl.trim()) {
        payload.url = customUrl.trim();
      }

      const res = await fetch("/api/telegram/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
      });

      const data = await res.json();
      setLastResult({
        action: "Register Webhook (POST /api/telegram/setup-webhook)",
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data,
        timestamp,
        error: !res.ok ? data.error || `HTTP error ${res.status}` : undefined,
      });
    } catch (err) {
      setLastResult({
        action: "Register Webhook (POST /api/telegram/setup-webhook)",
        status: "error",
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const runCheckWebhook = async () => {
    setLoadingAction("check");
    const timestamp = new Date().toLocaleTimeString();
    try {
      const res = await fetch("/api/telegram/setup-webhook", {
        method: "GET",
      });

      const data = await res.json();
      setLastResult({
        action: "Check Webhook Info (GET /api/telegram/setup-webhook)",
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data,
        timestamp,
        error: !res.ok ? data.error || `HTTP error ${res.status}` : undefined,
      });
    } catch (err) {
      setLastResult({
        action: "Check Webhook Info (GET /api/telegram/setup-webhook)",
        status: "error",
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const runDeleteWebhook = async () => {
    if (!window.confirm("Are you sure you want to delete the registered Telegram webhook?")) {
      return;
    }

    setLoadingAction("delete");
    const timestamp = new Date().toLocaleTimeString();
    try {
      const res = await fetch("/api/telegram/setup-webhook", {
        method: "DELETE",
      });

      const data = await res.json();
      setLastResult({
        action: "Delete Webhook (DELETE /api/telegram/setup-webhook)",
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data,
        timestamp,
        error: !res.ok ? data.error || `HTTP error ${res.status}` : undefined,
      });
    } catch (err) {
      setLastResult({
        action: "Delete Webhook (DELETE /api/telegram/setup-webhook)",
        status: "error",
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const runNotifyDeployment = async () => {
    setLoadingAction("notify");
    const timestamp = new Date().toLocaleTimeString();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (secretKey.trim()) {
        headers["x-api-key"] = secretKey.trim();
        headers["Authorization"] = `Bearer ${secretKey.trim()}`;
      }

      const res = await fetch("/api/telegram/notify-deployment", {
        method: "POST",
        headers,
        body: JSON.stringify({
          deployId: deployId.trim() || `deploy-${Date.now().toString(36)}`,
          commitMessage: commitMessage.trim() || "Manual deployment notification",
          environment: "production",
        }),
      });

      const data = await res.json();
      setLastResult({
        action: "Trigger Deployment Broadcast (POST /api/telegram/notify-deployment)",
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        data,
        timestamp,
        error: !res.ok ? data.error || `HTTP error ${res.status}` : undefined,
      });

      // Generate a new fresh deploy ID for next run
      if (res.ok) {
        setDeployId(`deploy-${Date.now().toString(36)}`);
      }
    } catch (err) {
      setLastResult({
        action: "Trigger Deployment Broadcast (POST /api/telegram/notify-deployment)",
        status: "error",
        timestamp,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-800 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("webhook")}
          className={`px-3.5 py-2 -mb-px border-b-2 transition-colors cursor-pointer ${
            activeTab === "webhook"
              ? "border-emerald-400 text-emerald-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          ⚡ Webhook Actions
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("broadcast")}
          className={`px-3.5 py-2 -mb-px border-b-2 transition-colors cursor-pointer ${
            activeTab === "broadcast"
              ? "border-indigo-400 text-indigo-400 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📢 Deployment Broadcast
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cli")}
          className={`px-3.5 py-2 -mb-px border-b-2 transition-colors cursor-pointer ${
            activeTab === "cli"
              ? "border-zinc-300 text-zinc-200 font-semibold"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          💻 CLI Commands
        </button>
      </div>

      {/* Tab 1: Webhook Actions */}
      {activeTab === "webhook" && (
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              Custom Webhook Base URL (Optional override)
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder={defaultAppUrl ? `${defaultAppUrl}/api/telegram/webhook` : "https://your-domain.vercel.app/api/telegram/webhook"}
              className="w-full bg-black/60 border border-zinc-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
            />
            <p className="text-[11px] text-zinc-500">
              Leave blank to auto-use the server-configured <code className="text-zinc-400">APP_URL</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={runSetupWebhook}
              disabled={loadingAction !== null || !telegramConfigured}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-950"
            >
              {loadingAction === "setup" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Register Webhook</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={runCheckWebhook}
              disabled={loadingAction !== null || !telegramConfigured}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer border border-zinc-700/60"
            >
              {loadingAction === "check" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-100 rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Check Status</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={runDeleteWebhook}
              disabled={loadingAction !== null || !telegramConfigured}
              className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              {loadingAction === "delete" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <span>🗑️</span>
                  <span>Delete Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Deployment Broadcast */}
      {activeTab === "broadcast" && (
        <div className="space-y-3.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                Commit / Release Note
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="e.g. Production release v1.2"
                className="w-full bg-black/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
                Deployment ID
              </label>
              <input
                type="text"
                value={deployId}
                onChange={(e) => setDeployId(e.target.value)}
                placeholder="deploy-xxxx"
                className="w-full bg-black/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
              Admin / Secret Key (Optional if secured)
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter ADMIN_API_KEY or TELEGRAM_WEBHOOK_SECRET if configured"
              className="w-full bg-black/60 border border-zinc-800 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={runNotifyDeployment}
              disabled={loadingAction !== null || !telegramConfigured}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-indigo-950"
            >
              {loadingAction === "notify" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Broadcasting to subscribers...</span>
                </>
              ) : (
                <>
                  <span>📢</span>
                  <span>Broadcast Deployment Notification</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: CLI Commands */}
      {activeTab === "cli" && (
        <div className="rounded-lg bg-black/80 border border-zinc-800 p-3 font-mono text-xs text-zinc-300 overflow-x-auto space-y-2">
          <div className="text-zinc-500"># Register webhook endpoint with Telegram:</div>
          <div className="text-indigo-300 select-all">
            curl -X POST {defaultAppUrl || "https://your-domain.vercel.app"}/api/telegram/setup-webhook
          </div>
          <div className="text-zinc-500 pt-2"># Check current registered webhook status:</div>
          <div className="text-sky-300 select-all">
            curl -X GET {defaultAppUrl || "https://your-domain.vercel.app"}/api/telegram/setup-webhook
          </div>
          <div className="text-zinc-500 pt-2"># Trigger deployment broadcast notification:</div>
          <div className="text-emerald-300 select-all">
            curl -X POST {defaultAppUrl || "https://your-domain.vercel.app"}/api/telegram/notify-deployment -H &quot;Content-Type: application/json&quot; -d &apos;{JSON.stringify({ deployId: "deploy-1", commitMessage: "Production release" })}&apos;
          </div>
        </div>
      )}

      {/* Live Command Execution Output Console */}
      {lastResult && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-black/90 p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  lastResult.status === "success"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {lastResult.status === "success" ? "Success" : "Error"}
                {lastResult.statusCode ? ` (${lastResult.statusCode})` : ""}
              </span>
              <span className="text-zinc-300 text-[11px] truncate max-w-[260px] sm:max-w-md">
                {lastResult.action}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-[10px]">{lastResult.timestamp}</span>
              <button
                type="button"
                onClick={() => setLastResult(null)}
                className="text-zinc-500 hover:text-zinc-300 text-[11px] px-1 cursor-pointer"
                title="Clear output"
              >
                ✕
              </button>
            </div>
          </div>

          {lastResult.error && (
            <div className="text-rose-400 text-[11px]">
              Error: {lastResult.error}
            </div>
          )}

          {lastResult.data !== undefined && (
            <pre className="text-zinc-300 text-[11px] overflow-x-auto max-h-48 p-2 rounded bg-zinc-950/80 border border-zinc-800/60">
              {typeof lastResult.data === "string"
                ? lastResult.data
                : JSON.stringify(lastResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
