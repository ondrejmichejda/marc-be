"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { User } from "@/lib/auth/types";

export function AuthStatusCard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const [, startTransition] = useTransition();

  const fetchSessionAndUsers = useCallback(async () => {
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/auth/users"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        setConfigured(meData.configured);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
      }
    } catch (err) {
      console.error("Failed to load auth status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialize() {
      try {
        const [meRes, usersRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/auth/users"),
        ]);

        if (!ignore) {
          if (meRes.ok) {
            const meData = await meRes.json();
            setUser(meData.user);
            setConfigured(meData.configured);
          }
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsersList(usersData.users || []);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to load auth status:", err);
          setLoading(false);
        }
      }

      if (!ignore && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const auth = urlParams.get("auth");
        const registered = urlParams.get("registered");
        const authError = urlParams.get("auth_error");
        const errorMessage = urlParams.get("error_message");
        const email = urlParams.get("email");

        if (auth === "success") {
          if (registered === "true") {
            setToastMessage({
              type: "success",
              title: "🎉 Welcome to Marc Platform!",
              message: `Your Google account (${email || "Google Account"}) has been authenticated and provisioned.`,
            });
          } else {
            setToastMessage({
              type: "success",
              title: "✅ Welcome back!",
              message: `You have successfully signed in with your Google account (${email || ""}).`,
            });
          }
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else if (authError) {
          setToastMessage({
            type: "error",
            title: "❌ Authentication Error",
            message: errorMessage || `Google authentication failed with status: ${authError}.`,
          });
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse flex items-center justify-center min-h-[140px]">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Checking Google authentication status...</span>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-section" className="space-y-4 scroll-mt-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
              : toastMessage.type === "error"
              ? "bg-rose-950/40 border-rose-500/30 text-rose-200"
              : "bg-blue-950/40 border-blue-500/30 text-blue-200"
          }`}
        >
          <div>
            <h4 className="font-semibold text-sm">{toastMessage.title}</h4>
            <p className="text-xs mt-0.5 opacity-90">{toastMessage.message}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Authentication Card */}
      <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔐</span>
              <h3 className="text-lg font-semibold text-zinc-100">
                Google Authentication & Access Management
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Secure single sign-on with Google OAuth 2.0. Unregistered users are automatically provisioned upon login.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                configured
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  configured ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {configured ? "Google OAuth Configured" : "OAuth Setup Pending"}
            </span>
          </div>
        </div>

        {/* User is authenticated */}
        {user ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
              <div className="flex items-center gap-3.5">
                {user.picture ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-12 h-12 rounded-full border border-zinc-600 object-cover ring-2 ring-indigo-500/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100">{user.name}</span>
                    {user.emailVerified && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✓ Verified Google Account
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400">{user.email}</div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    ID: <code className="font-mono text-zinc-400">{user.id}</code> • Member since:{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-xs font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* User is NOT authenticated */
          <div className="mt-5 space-y-4">
            <div className="p-5 rounded-xl bg-zinc-800/30 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-5">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="font-medium text-zinc-200 text-sm">
                  Sign in with your Google account
                </h4>
                <p className="text-xs text-zinc-400 max-w-md">
                  One-click Google authentication. Unregistered users are automatically provisioned with a secure account and session.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-center">
                <GoogleSignInButton
                  label="Sign in with Google"
                  size="md"
                  prompt="select_account"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>

            {!configured && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300/90 leading-relaxed">
                <span className="font-semibold block mb-1">💡 Google OAuth Setup Note:</span>
                To enable live Google OAuth redirects, set <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono">GOOGLE_CLIENT_ID</code> and <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono">GOOGLE_CLIENT_SECRET</code> in your <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-200 font-mono">.env.local</code> file.
              </div>
            )}
          </div>
        )}

        {/* Registered Users List */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <span>👥 Registered Users</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                {usersList.length}
              </span>
            </h4>
            <button
              onClick={() => {
                startTransition(() => {
                  fetchSessionAndUsers();
                });
              }}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              🔄 Refresh List
            </button>
          </div>

          {usersList.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500 bg-zinc-950/20 rounded-xl border border-dashed border-zinc-800">
              No registered users yet. Sign in with Google to see accounts listed here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {usersList.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/60 hover:border-zinc-700/80 transition-all flex items-center gap-3"
                >
                  {u.picture ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.picture}
                      alt={u.name}
                      className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-zinc-200 truncate">{u.name}</div>
                    <div className="text-[11px] text-zinc-400 truncate">{u.email}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
