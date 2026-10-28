"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@/lib/auth/types";
import {
  MenuItem,
  MenuCategory,
  RoleDefinition,
  RoleBadgeColor,
  BUILTIN_ROLES,
  BASE_MENU_ITEMS,
  DEFAULT_MENU_MAPPINGS,
  getRoleBadgeInfo,
} from "@/lib/auth/roles";
import { TelegramBotSystemView } from "./TelegramBotSystemView";
import { OpenAiSystemView } from "./OpenAiSystemView";

interface AppSidebarProps {
  initialUser?: User | null;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children?: React.ReactNode;
}

const BADGE_COLOR_PRESETS: { name: string; colors: RoleBadgeColor }[] = [
  {
    name: "Purple",
    colors: {
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      border: "border-purple-500/30",
      dot: "bg-purple-400",
    },
  },
  {
    name: "Sky Blue",
    colors: {
      bg: "bg-sky-500/10",
      text: "text-sky-300",
      border: "border-sky-500/30",
      dot: "bg-sky-400",
    },
  },
  {
    name: "Emerald Green",
    colors: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
    },
  },
  {
    name: "Amber Orange",
    colors: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
      dot: "bg-amber-400",
    },
  },
  {
    name: "Rose Red",
    colors: {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/30",
      dot: "bg-rose-400",
    },
  },
  {
    name: "Indigo Blue",
    colors: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-300",
      border: "border-indigo-500/30",
      dot: "bg-indigo-400",
    },
  },
];

export function AppSidebar({
  initialUser = null,
  activeTab = "mock_a",
  onTabChange,
  children,
}: AppSidebarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Dynamic roles and menu mapping state
  const [rolesList, setRolesList] = useState<RoleDefinition[]>(Object.values(BUILTIN_ROLES));
  const [menuMappings, setMenuMappings] = useState<Record<string, string[]>>(DEFAULT_MENU_MAPPINGS);
  const [accessibleMenuItems, setAccessibleMenuItems] = useState<MenuItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);

  // System view sub-tab
  const [systemSubTab, setSystemSubTab] = useState<"roles" | "users" | "mappings" | "telegram" | "openai" | "info">("roles");

  // User management state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Create role form state
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [newRoleName, setNewRoleName] = useState<string>("");
  const [newRoleDesc, setNewRoleDesc] = useState<string>("");
  const [newRoleColorIndex, setNewRoleColorIndex] = useState<number>(0);
  const [creatingRole, setCreatingRole] = useState<boolean>(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // Menu mapping edit state
  const [editableMappings, setEditableMappings] = useState<Record<string, string[]>>(DEFAULT_MENU_MAPPINGS);
  const [savingMappings, setSavingMappings] = useState<boolean>(false);

  // Status messages
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Fetch dynamic roles, mappings, and user info on mount
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [meRes, rolesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/auth/roles"),
        ]);
        if (!ignore && meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) setUser(meData.user);
          if (Array.isArray(meData.menu)) setAccessibleMenuItems(meData.menu);
        }
        if (!ignore && rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (rolesData.definitions) {
            setRolesList(Object.values(rolesData.definitions) as RoleDefinition[]);
          }
          if (rolesData.mappings) {
            setMenuMappings(rolesData.mappings);
            setEditableMappings(rolesData.mappings);
          }
        }
      } catch {
        // silent fallback
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const fetchRolesAndMappings = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const res = await fetch("/api/auth/roles");
      if (res.ok) {
        const data = await res.json();
        if (data.definitions) {
          setRolesList(Object.values(data.definitions) as RoleDefinition[]);
        }
        if (data.mappings) {
          setMenuMappings(data.mappings);
          setEditableMappings(data.mappings);
        }
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/auth/users?limit=100");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch {
      setActionMessage({ type: "error", text: "Failed to load registered users list." });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadUserSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
        if (Array.isArray(data.menu)) {
          setAccessibleMenuItems(data.menu);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin" && currentTab === "system") {
      let ignore = false;
      fetch("/api/auth/users?limit=100")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
        .then((data) => {
          if (!ignore) {
            setUsersList(data.users || []);
          }
        })
        .catch(() => {
          if (!ignore) {
            setActionMessage({ type: "error", text: "Failed to load registered users list." });
          }
        });
      return () => {
        ignore = true;
      };
    }
  }, [user?.role, currentTab]);

  // Compute allowed menu items based on current mappings & role
  const userRole = user?.role || "user";
  const userRoleDefinition = useMemo(() => {
    const found = rolesList.find((r) => r.id === userRole);
    return found || getRoleBadgeInfo(userRole);
  }, [rolesList, userRole]);

  // Filter menu items for current user role
  const computedMenuItems = useMemo(() => {
    return BASE_MENU_ITEMS.map((item) => {
      const allowed = menuMappings[item.id] || (item.id === "system" ? ["admin"] : ["admin"]);
      return {
        ...item,
        allowedRoles: allowed,
      };
    }).filter((item) => item.allowedRoles.includes(userRole));
  }, [menuMappings, userRole]);

  const activeMenuItems = accessibleMenuItems.length > 0 ? accessibleMenuItems : computedMenuItems;

  // Derive active effective tab to ensure user is always on an accessible module
  const effectiveTab = useMemo(() => {
    if (activeMenuItems.length > 0 && !activeMenuItems.some((m) => m.id === currentTab)) {
      return activeMenuItems[0].id;
    }
    return currentTab;
  }, [activeMenuItems, currentTab]);

  // Group menu items by category
  const groupedMenuItems = useMemo(() => {
    const groups: Record<MenuCategory, MenuItem[]> = {
      General: [],
      Operations: [],
      Administration: [],
      System: [],
    };
    for (const item of activeMenuItems) {
      if (groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups.General.push(item);
      }
    }
    return groups;
  }, [activeMenuItems]);

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  // Admin Action: Create New Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId.trim() || !newRoleName.trim()) {
      setActionMessage({ type: "error", text: "Role ID and Role Name are required." });
      return;
    }

    setCreatingRole(true);
    setActionMessage(null);
    try {
      const selectedColor = BADGE_COLOR_PRESETS[newRoleColorIndex].colors;
      const res = await fetch("/api/auth/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newRoleId.trim().toLowerCase(),
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          badgeColor: selectedColor,
        }),
      });

      const data = await res.json();
      if (res.ok && data.role) {
        setActionMessage({
          type: "success",
          text: `Role "${data.role.name}" (${data.role.id}) created successfully.`,
        });
        setNewRoleId("");
        setNewRoleName("");
        setNewRoleDesc("");
        await fetchRolesAndMappings();
        await loadUserSession();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to create role." });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error creating role",
      });
    } finally {
      setCreatingRole(false);
    }
  };

  // Admin Action: Delete Custom Role
  const handleDeleteRole = async (roleId: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleId}"?`)) return;

    setDeletingRoleId(roleId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/auth/roles?roleId=${encodeURIComponent(roleId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({
          type: "success",
          text: `Role "${roleId}" deleted successfully.`,
        });
        await fetchRolesAndMappings();
        await loadUserSession();
      } else {
        setActionMessage({ type: "error", text: data.error || "Failed to delete role." });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error deleting role",
      });
    } finally {
      setDeletingRoleId(null);
    }
  };

  // Admin Action: Assign User Role
  const handleAssignUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    setActionMessage(null);
    try {
      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        if (user && user.id === userId) {
          setUser({ ...user, role: newRole });
        }
        setActionMessage({
          type: "success",
          text: `Updated role for ${data.user.name || data.user.email} to ${newRole.toUpperCase()}.`,
        });
        await loadUserSession();
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to update role.",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error updating role",
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Admin Action: Toggle Role-to-Menu Mapping
  const handleToggleMenuRole = (menuItemId: string, roleId: string) => {
    if (menuItemId === "system") {
      // System is strictly locked to admin
      return;
    }

    setEditableMappings((prev) => {
      const currentList = prev[menuItemId] || [];
      const hasRole = currentList.includes(roleId);
      const updatedList = hasRole
        ? currentList.filter((r) => r !== roleId)
        : [...currentList, roleId];

      return {
        ...prev,
        [menuItemId]: updatedList,
      };
    });
  };

  // Admin Action: Save Role-to-Menu Mappings
  const handleSaveMappings = async () => {
    setSavingMappings(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/auth/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: editableMappings }),
      });
      const data = await res.json();
      if (res.ok && data.mappings) {
        setMenuMappings(data.mappings);
        setActionMessage({
          type: "success",
          text: "Menu item access mappings updated and applied successfully.",
        });
        await loadUserSession();
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to save menu mappings.",
        });
      }
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving mappings",
      });
    } finally {
      setSavingMappings(false);
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const isCurrentTabAccessible = activeMenuItems.some((m) => m.id === effectiveTab);

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 group transition-transform active:scale-95"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white font-black text-lg shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              Marc Platform
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">Backend Microservice</span>
          </div>
        </Link>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Online
        </span>
      </div>

      {/* Role-Based Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {(Object.entries(groupedMenuItems) as [MenuCategory, MenuItem[]][]).map(
          ([category, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  {category}
                </div>
                {items.map((item) => {
                  const isActive = effectiveTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/40 font-semibold"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            isActive
                              ? "bg-white/20 text-white"
                              : item.badge === "Admin"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          }
        )}
      </div>

      {/* User Panel at Bottom with Role Indicator */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40 space-y-3">
        {user ? (
          <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-md space-y-3">
            <div className="flex items-center gap-3 min-w-0">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-inner">
                  {userInitials}
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-zinc-100 truncate">
                  {user.name}
                </span>
                <span className="text-[11px] text-zinc-400 truncate font-mono">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
                Role
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${userRoleDefinition.badgeColor.bg} ${userRoleDefinition.badgeColor.text} border ${userRoleDefinition.badgeColor.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${userRoleDefinition.badgeColor.dot}`} />
                {userRoleDefinition.name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/90 hover:bg-rose-950/50 hover:text-rose-200 hover:border-rose-800/50 border border-zinc-700/60 text-xs font-medium text-zinc-300 transition-all shadow-sm active:scale-98 disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">⎋</span>
                  <span>Log out</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
            <span className="text-xs text-zinc-400">Guest Session</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Accent Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[140px]" />
      </div>

      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-40 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow">
            ⚡
          </div>
          <span className="font-bold text-sm text-white">Marc Platform</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs flex items-center gap-1.5"
        >
          <span>{mobileOpen ? "✕ Close" : "☰ Menu"}</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
          <div className="w-72 max-w-[80vw] bg-zinc-950 border-r border-zinc-800 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop Left Pane Menu */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-zinc-950/80 border-r border-zinc-800/80 backdrop-blur-xl h-screen sticky top-0 shrink-0 z-30 shadow-xl">
        {sidebarContent}
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 flex flex-col justify-between">
        <div className="max-w-5xl w-full mx-auto space-y-6">
          {actionMessage && (
            <div
              className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
                actionMessage.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800/60 text-rose-300"
              }`}
            >
              <span>{actionMessage.text}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="opacity-70 hover:opacity-100 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {children ? (
            children
          ) : !isCurrentTabAccessible ? (
            /* Access Denied View for unauthorized tabs */
            <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-800/50 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-2xl mx-auto border border-rose-500/20">
                🔒
              </div>
              <h2 className="text-xl font-bold text-white">Access Restricted</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Your assigned role (<strong>{userRoleDefinition.name}</strong>) does not have permission to access the <strong>{effectiveTab}</strong> module.
              </p>
              <button
                type="button"
                onClick={() => handleTabClick(activeMenuItems[0]?.id || "mock_a")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                Return to Default Module
              </button>
            </div>
          ) : (
            /* Dynamic Content Tabs */
            <div className="space-y-6">
              {/* Tab: Mock Menu Item A */}
              {effectiveTab === "mock_a" && (
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-2xl">
                          🅰️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">Menu Item A</h1>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Active Mock Module
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Business analytics, telemetry dashboard, and workspace metrics.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Workspaces Active</span>
                        <p className="text-sm font-bold text-emerald-400">12 Connected</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Throughput</span>
                        <p className="text-sm font-bold text-sky-400">1,480 req/min</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Latency</span>
                        <p className="text-sm font-bold text-indigo-300">18 ms avg</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">System Health</span>
                        <p className="text-sm font-bold text-purple-300">99.98% Uptime</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>📊</span> Real-Time Analytics Stream
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Data ingestion stream is functioning normally. All telemetry collectors are reporting nominal throughput.
                      </p>
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 space-y-1">
                        <p className="text-emerald-400">✓ Ingestion Worker #1: ACTIVE (PID 4021)</p>
                        <p className="text-emerald-400">✓ Ingestion Worker #2: ACTIVE (PID 4022)</p>
                        <p className="text-zinc-500">• Buffer queue depth: 0 items</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>⚡</span> Module A Actions
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Trigger mock background analytics computation or refresh collector buffers.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActionMessage({ type: "success", text: "Mock Task A triggered successfully." })}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                        >
                          Trigger Mock Task A
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionMessage({ type: "success", text: "Telemetry cache flushed." })}
                          className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all active:scale-95"
                        >
                          Flush Cache
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Mock Menu Item B */}
              {effectiveTab === "mock_b" && (
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-400 text-2xl">
                          🅱️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">Menu Item B</h1>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Active Mock Module
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Data processing, queue workers, and background task dispatching.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Queue Dispatcher</span>
                        <p className="text-sm font-bold text-sky-400">Idle / Ready</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Concurrency</span>
                        <p className="text-sm font-bold text-indigo-300">4 Workers</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Completed Jobs</span>
                        <p className="text-sm font-bold text-emerald-400">8,240 Total</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚙️</span> Queue Dispatch Controls
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Simulate dispatching background batch jobs to worker instances.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActionMessage({ type: "success", text: "Dispatched mock batch job #4092 to queue." })}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                      >
                        Dispatch Batch Job
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Mock Menu Item C */}
              {effectiveTab === "mock_c" && (
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-2xl">
                          🅲
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">Menu Item C</h1>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Active Mock Module
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Reporting studio, compliance audits, and third-party integrations.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Integration Connectors</span>
                        <p className="text-sm font-bold text-purple-300">3 Configured (Google, Neon, Telegram)</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase">Audit Status</span>
                        <p className="text-sm font-bold text-emerald-400">Compliant (No warnings)</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>📑</span> Report Generator
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Generate mock summary exports for reporting and audit logs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActionMessage({ type: "success", text: "Mock report generated and exported." })}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
                    >
                      Export System Audit Report
                    </button>
                  </div>
                </div>
              )}

              {/* Tab: System Menu (Administrator Only) */}
              {effectiveTab === "system" && user?.role === "admin" && (
                <div className="space-y-6">
                  {/* System Header */}
                  <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-2xl">
                        ⚙️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl sm:text-2xl font-bold text-white">System Administration</h1>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                            Administrator Only
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Manage system roles, assign user permissions, and map menu item access.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        fetchRolesAndMappings();
                        fetchUsers();
                      }}
                      disabled={loadingRoles || loadingUsers}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loadingRoles || loadingUsers ? "Refreshing..." : "↻ Refresh All"}
                    </button>
                  </div>

                  {/* System Section Navigation Tabs */}
                  <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("roles")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "roles"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      🛡️ Roles & Creation ({rolesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("users")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "users"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      👥 User Assignments ({usersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("mappings")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "mappings"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      🗺️ Menu-to-Role Mapping
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("telegram")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "telegram"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      🤖 Telegram Bot
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("openai")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "openai"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      🧠 OpenAI
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemSubTab("info")}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        systemSubTab === "info"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      }`}
                    >
                      ℹ️ Environment Telemetry
                    </button>
                  </div>

                  {/* Sub-Tab 1: Roles Management & Creation */}
                  {systemSubTab === "roles" && (
                    <div className="space-y-6">
                      {/* Create Role Form */}
                      <form
                        onSubmit={handleCreateRole}
                        className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>✨</span> Create New System / Custom Role
                          </h3>
                          <span className="text-[11px] text-zinc-500 font-mono">Dynamic RBAC</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                              Role Key (ID) *
                            </label>
                            <input
                              type="text"
                              value={newRoleId}
                              onChange={(e) => setNewRoleId(e.target.value)}
                              placeholder="e.g. auditor, manager, guest"
                              required
                              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                              Role Name (Label) *
                            </label>
                            <input
                              type="text"
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="e.g. Compliance Auditor"
                              required
                              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                              Badge Color Theme
                            </label>
                            <select
                              value={newRoleColorIndex}
                              onChange={(e) => setNewRoleColorIndex(parseInt(e.target.value, 10))}
                              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
                            >
                              {BADGE_COLOR_PRESETS.map((p, idx) => (
                                <option key={p.name} value={idx}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                              Description & Purpose
                            </label>
                            <input
                              type="text"
                              value={newRoleDesc}
                              onChange={(e) => setNewRoleDesc(e.target.value)}
                              placeholder="e.g. Access to reporting studio and read-only telemetry modules"
                              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                          <span className="text-[11px] text-zinc-500">
                            Roles are persisted in database and immediately available for user assignment.
                          </span>
                          <button
                            type="submit"
                            disabled={creatingRole}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                          >
                            {creatingRole ? "Creating Role..." : "+ Create Role"}
                          </button>
                        </div>
                      </form>

                      {/* Existing Roles Catalog */}
                      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>🛡️</span> Registered Roles Catalog ({rolesList.length})
                          </h3>
                          <span className="text-xs text-zinc-500 font-mono">
                            Admin is set only in DB
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {rolesList.map((r) => {
                            const isSystemRole = r.isSystem || r.id === "admin";
                            return (
                              <div
                                key={r.id}
                                className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.badgeColor.bg} ${r.badgeColor.text} border ${r.badgeColor.border}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${r.badgeColor.dot}`} />
                                      {r.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                                      id: {r.id}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-400 leading-relaxed">{r.description}</p>
                                </div>

                                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {isSystemRole ? "🔒 System Protected" : "Custom Role"}
                                  </span>
                                  {!isSystemRole && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRole(r.id)}
                                      disabled={deletingRoleId === r.id}
                                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
                                    >
                                      {deletingRoleId === r.id ? "Deleting..." : "Delete"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 2: User Role Assignment */}
                  {systemSubTab === "users" && (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">👥</span>
                          <div>
                            <h2 className="text-lg font-bold text-white">Assign Users to Roles</h2>
                            <p className="text-xs text-zinc-400">
                              Administrators can assign registered accounts to any active role. Administrator permissions are set strictly in the database.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={fetchUsers}
                          disabled={loadingUsers}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {loadingUsers ? "Refreshing..." : "↻ Refresh"}
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
                        <table className="w-full text-left text-xs text-zinc-300">
                          <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                              <th className="p-4">User</th>
                              <th className="p-4">Current Role</th>
                              <th className="p-4">Assign Role</th>
                              <th className="p-4">Last Login</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {usersList.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-zinc-500">
                                  {loadingUsers ? "Loading user accounts..." : "No users found."}
                                </td>
                              </tr>
                            ) : (
                              usersList.map((u) => {
                                const uRole = getRoleBadgeInfo(u.role);
                                const isSelf = u.id === user?.id;
                                return (
                                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        {u.picture ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={u.picture}
                                            alt={u.name}
                                            className="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-700"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-xs">
                                            {u.name.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div>
                                          <div className="font-semibold text-white flex items-center gap-1.5">
                                            {u.name}
                                            {isSelf && (
                                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[11px] text-zinc-400 font-mono">{u.email}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[11px] ${uRole.badgeColor.bg} ${uRole.badgeColor.text} border ${uRole.badgeColor.border}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${uRole.badgeColor.dot}`} />
                                        {uRole.name}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <select
                                        value={u.role}
                                        disabled={updatingUserId === u.id}
                                        onChange={(e) => handleAssignUserRole(u.id, e.target.value)}
                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                                      >
                                        {rolesList.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.name} ({r.id})
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="p-4 text-[11px] text-zinc-400 font-mono">
                                      {new Date(u.lastLoginAt || u.createdAt).toLocaleDateString()}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 3: Menu-to-Role Mapping Matrix */}
                  {systemSubTab === "mappings" && (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🗺️</span>
                          <div>
                            <h2 className="text-lg font-bold text-white">Menu Item to Role Access Matrix</h2>
                            <p className="text-xs text-zinc-400">
                              Map mock menu items A, B, and C to designated roles. System menu item is locked strictly to Administrator.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveMappings}
                          disabled={savingMappings}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {savingMappings ? "Saving..." : "💾 Save Mappings"}
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
                        <table className="w-full text-left text-xs text-zinc-300">
                          <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                              <th className="p-4">Menu Item</th>
                              <th className="p-4">Category</th>
                              {rolesList.map((r) => (
                                <th key={r.id} className="p-4 text-center">
                                  {r.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {BASE_MENU_ITEMS.map((menuItem) => {
                              const isSystemItem = menuItem.id === "system";
                              const allowedList = editableMappings[menuItem.id] || [];

                              return (
                                <tr key={menuItem.id} className="hover:bg-zinc-800/30 transition-colors">
                                  <td className="p-4">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-lg">{menuItem.icon}</span>
                                      <div>
                                        <div className="font-semibold text-white flex items-center gap-1.5">
                                          {menuItem.label}
                                          {menuItem.badge && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                              {menuItem.badge}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-zinc-400">{menuItem.description}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-zinc-400 text-[11px]">{menuItem.category}</td>

                                  {rolesList.map((r) => {
                                    const isChecked = allowedList.includes(r.id);
                                    const isLockedAdmin = isSystemItem && r.id === "admin";
                                    const isLockedNonAdmin = isSystemItem && r.id !== "admin";

                                    return (
                                      <td key={r.id} className="p-4 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isLockedAdmin ? true : isChecked}
                                          disabled={isSystemItem}
                                          onChange={() => handleToggleMenuRole(menuItem.id, r.id)}
                                          className={`w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 ${
                                            isLockedNonAdmin ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                          }`}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 4: Telegram Bot Subsystem */}
                  {systemSubTab === "telegram" && (
                    <TelegramBotSystemView />
                  )}

                  {/* Sub-Tab 5: OpenAI Subsystem */}
                  {systemSubTab === "openai" && (
                    <OpenAiSystemView />
                  )}

                  {/* Sub-Tab 6: Environment Telemetry */}
                  {systemSubTab === "info" && (
                    <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
                      <h3 className="text-sm font-semibold text-white">System & Environment Telemetry</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 font-mono text-[11px]">Database Provider</span>
                          <p className="font-semibold text-emerald-400">Neon Serverless PostgreSQL / Local Storage Fallback</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 font-mono text-[11px]">Authentication Provider</span>
                          <p className="font-semibold text-sky-400">Google Cloud Identity (OAuth 2.0 / Gmail)</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 font-mono text-[11px]">Administrator Policy</span>
                          <p className="font-semibold text-purple-300">Set strictly via Database Records (users.role = &apos;admin&apos;)</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                          <span className="text-zinc-500 font-mono text-[11px]">Active Roles Count</span>
                          <p className="font-semibold text-indigo-300">{rolesList.length} Roles Configured</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <footer className="mt-8 pt-4 border-t border-zinc-900 text-center text-xs text-zinc-600 font-mono">
          Marc Backend Microservice • Protected Session • RBAC Active
        </footer>
      </main>
    </div>
  );
}
