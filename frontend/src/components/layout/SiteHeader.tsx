"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ChevronDown, LogOut, User as UserIcon, Shield } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-white/80 backdrop-blur-md shadow-sm transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            🏛️
          </span>
          <span className="font-display text-xl font-bold text-slate-900 tracking-tight">LokPulse AI</span>
        </Link>

        {/* Global Navigation based on Auth State */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/browse" className="hover:text-blue-600 transition-colors">Public Dashboard</Link>
          <Link href="/schemes" className="hover:text-blue-600 transition-colors">Govt Schemes</Link>
          <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
        </nav>

        {/* Auth & Actions */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserIcon size={14} />
                </div>
                {user.name} <ChevronDown size={14} className="text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2">
                  <div className="px-4 py-2 border-b border-slate-100 mb-2">
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Shield size={12} className="text-blue-500" /> 
                      {user.role.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <Link href={`/${user.role === 'citizen' ? 'status' : 'dashboard'}`} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600">
                    My Portal
                  </Link>
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 sm:block">
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg"
              >
                Join Platform
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}