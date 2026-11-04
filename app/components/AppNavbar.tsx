"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/auth/types";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface AppNavbarProps {
  initialUser?: User | null;
}

export function AppNavbar({ initialUser = null }: AppNavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState<boolean>(!initialUser);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>("overview");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok && !ignore) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // silent fail
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setDropdownOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", href: "#overview", icon: "📊" },
    { id: "telegram", label: "Telegram Bot", href: "#telegram-controls", icon: "🤖" },
    { id: "tasks", label: "Tasks & Jobs", href: "#tasks-section", icon: "📋" },
    { id: "draculino", label: "Draculino", href: "#draculino-section", icon: "🥋" },
    { id: "api", label: "API Catalog", href: "#api-endpoints", icon: "🌐" },
    { id: "users", label: "Users & Auth", href: "#auth-section", icon: "👥" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group transition-transform active:scale-95"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white font-black text-base shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                ⚡
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Marc Platform
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Backend Microservice</span>
              </div>
            </Link>

            {/* Desktop Navigation Items */}
            <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-zinc-800">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setActiveNav(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeNav === item.id
                      ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80"
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Right: Auth Profile / Sign In */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-24 bg-zinc-900 animate-pulse rounded-lg border border-zinc-800" />
            ) : user ? (
              /* User Profile Menu */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 transition-all cursor-pointer group shadow-sm"
                >
                  {user.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-zinc-200 leading-none group-hover:text-white transition-colors">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 leading-tight truncate max-w-[120px]">
                      {user.email}
                    </span>
                  </div>

                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      dropdownOpen ? "rotate-180 text-zinc-200" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                          Google Account
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Authenticated
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      <p className="text-xs text-zinc-400 font-mono truncate">{user.email}</p>
                    </div>

                    <div className="px-2 py-1.5 space-y-0.5">
                      <a
                        href="#auth-section"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                      >
                        <span className="text-base">👤</span>
                        <div>
                          <p className="font-medium">User Profile & Sessions</p>
                          <p className="text-[10px] text-zinc-500">View registered accounts & tokens</p>
                        </div>
                      </a>

                      <a
                        href="/api/health"
                        target="_blank"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                      >
                        <span className="text-base">🩺</span>
                        <div>
                          <p className="font-medium">Health Check API</p>
                          <p className="text-[10px] text-zinc-500">Live system status JSON feed</p>
                        </div>
                      </a>

                      <a
                        href="#api-endpoints"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                      >
                        <span className="text-base">⚡</span>
                        <div>
                          <p className="font-medium">API Documentation</p>
                          <p className="text-[10px] text-zinc-500">View and test available endpoints</p>
                        </div>
                      </a>
                    </div>

                    <div className="pt-1.5 mt-1.5 border-t border-zinc-800/80 px-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span>Sign Out of Google</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not Signed In: Login with Google */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-zinc-800 space-y-1 animate-in fade-in duration-150">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium ${
                  activeNav === item.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}

            {!user && (
              <div className="pt-2">
                <GoogleSignInButton
                  label="Sign In with Google"
                  size="sm"
                  className="w-full justify-center"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
