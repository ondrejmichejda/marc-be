"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface LoginViewProps {
  isConfigured?: boolean;
}

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  const err = searchParams?.get("auth_error");
  const errMsg = searchParams?.get("error_message") || searchParams?.get("error_description");

  if (!err || dismissed) return null;

  const title = "Authentication Failed";
  const message =
    errMsg ||
    (err === "state_mismatch"
      ? "Security state verification failed. Please try signing in again."
      : err === "missing_code"
      ? "No authorization code returned from Google."
      : `Google sign-in was not completed (${err}).`);

  return (
    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs space-y-1 animate-in fade-in duration-200">
      <div className="font-semibold flex items-center justify-between">
        <span>⚠️ {title}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 p-0.5"
        >
          ✕
        </button>
      </div>
      <p className="opacity-90">{message}</p>
    </div>
  );
}

export function LoginView({ isConfigured = true }: LoginViewProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[15%] left-[20%] w-[450px] h-[450px] rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="absolute bottom-[15%] right-[20%] w-[450px] h-[450px] rounded-full bg-emerald-600/10 blur-[150px]" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-3xl shadow-xl shadow-indigo-500/10">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Marc Platform
            </h1>
            <p className="text-sm font-medium text-zinc-300 mt-1">
              Sign In with Google
            </p>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Please sign in to access Marc Backend services, Telegram controls, and tasks. Unregistered accounts are automatically provisioned.
          </p>
        </div>

        {/* Auth Error Banner */}
        <Suspense fallback={null}>
          <AuthErrorBanner />
        </Suspense>

        {/* Card */}
        <div className="p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-4">
            <GoogleSignInButton
              label="Sign in with Google"
              size="lg"
              prompt="select_account"
              className="w-full justify-center shadow-lg hover:shadow-indigo-500/20"
            />

            {!isConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-300/90 leading-relaxed">
                <span className="font-semibold block mb-0.5">⚠️ Setup Required:</span>
                Set <code className="font-mono text-amber-200">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="font-mono text-amber-200">GOOGLE_CLIENT_SECRET</code> in{" "}
                <code className="font-mono text-amber-200">.env.local</code> to enable Google OAuth.
              </div>
            )}
          </div>

          <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Single sign-on with verified Google Account</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Automatic user account provisioning</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Secure JWT session token management</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-zinc-600">
          Protected by Google OAuth 2.0 & Next.js Session Security
        </div>
      </div>
    </main>
  );
}
