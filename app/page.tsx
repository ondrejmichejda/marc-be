import { Suspense } from "react";
import { connection } from "next/server";
import { AppSidebar } from "@/app/components/AppSidebar";
import { LoginView } from "@/app/components/LoginView";
import { getCurrentUser, isGoogleAuthConfigured } from "@/lib/auth";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans animate-pulse">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-zinc-950/80 border-r border-zinc-800/80 p-5 justify-between">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 bg-zinc-900 rounded" />
              <div className="h-2.5 w-16 bg-zinc-900 rounded" />
            </div>
          </div>
          <div className="space-y-2 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/50" />
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 h-24" />
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-6 lg:p-8 space-y-6">
        <div className="h-48 rounded-2xl bg-zinc-900/40 border border-zinc-800" />
      </main>
    </div>
  );
}

async function AuthenticatedDashboardView() {
  await connection();
  const user = await getCurrentUser();

  if (!user) {
    return <LoginView isConfigured={isGoogleAuthConfigured()} />;
  }

  return <AppSidebar initialUser={user} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboardView />
    </Suspense>
  );
}
