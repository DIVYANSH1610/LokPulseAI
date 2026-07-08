// src/components/layout/MainDashboardShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, MessageSquare, Map, BarChart3, 
  Settings, Bell, Search, ChevronRight, Landmark
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function MainDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, permissions } = useAuth();

  const nav = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Complaints", href: "/dashboard/complaints", icon: MessageSquare },
    { name: "Map View", href: "/dashboard/map", icon: Map },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-100/60 p-4 sm:p-6 gap-6 text-slate-900 font-sans overflow-hidden">
      
      {/* Floating Sidebar */}
      <aside className="w-64 bg-white rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden shrink-0">
        <div className="p-8 pb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            🏛️
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">LokPulse</span>
        </div>

        <nav className="flex-1 px-5 space-y-2 mt-4 overflow-y-auto">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200 ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}

          {/* Dynamic RBAC Link: Only shows if the user has budget permissions */}
          {permissions?.canApproveBudgets && (
            <Link
              href="/dashboard/budgets"
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <Landmark size={20} strokeWidth={2} />
              Budgets
            </Link>
          )}
        </nav>

        {/* Dynamic User Profile Card */}
        <div className="p-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3 hover:border-slate-200 transition-colors cursor-pointer">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold border border-blue-200/50">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.name || "Guest"}</p>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider truncate">
                {user?.role?.replace('_', ' ') || "UNAUTHORIZED"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Main Content Window */}
      <main className="flex-1 flex flex-col min-w-0 bg-white rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] overflow-hidden">
        
        {/* Advanced Top Header */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0 border-b border-slate-100/50">
          
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 hidden sm:flex">
            <span className="hover:text-slate-900 cursor-pointer">Dashboard</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-slate-900 font-bold">Overview</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search wards, issues, or reports..." 
                className="w-80 rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button className="relative p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all">
              <Bell size={22} />
              <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}