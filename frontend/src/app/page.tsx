"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Languages, Database, TrendingUp, Eye, ArrowRight, Play,
  ChevronDown, LogOut, User as UserIcon, Shield
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/lib/auth-context"; // Integrating the new Auth Context

const ROLE_LINKS: Record<string, { href: string; enabled: boolean }> = {
  mp_office: { href: "/dashboard", enabled: true },
  citizen: { href: "/submit", enabled: true },
  district_admin: { href: "/district", enabled: true },
  panchayat_officer: { href: "/panchayat", enabled: true },
  mla_office: { href: "/dashboard", enabled: true },
};

const ROLE_ICONS: Record<string, string> = {
  mp_office: "🏛️",
  mla_office: "🗳️",
  district_admin: "🗂️",
  panchayat_officer: "📍",
  citizen: "🧑‍🤝‍🧑",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <Roles />
      <SiteFooter />
    </div>
  );
}

// ----------------------------------------------------------------------
// ENHANCED NAVBAR (Now connected to Auth Context)
// ----------------------------------------------------------------------
function SiteHeader() {
  const { t } = useLanguage();
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

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
            {t.nav.howItWorks}
          </a>
          <a href="#roles" className="hover:text-blue-600 transition-colors">
            {t.nav.roles}
          </a>
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
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-1 uppercase tracking-wider">
                      <Shield size={12} /> 
                      {user.role.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="p-2">
                    <Link 
                      href={`/${user.role === 'citizen' ? 'submit' : 'dashboard'}`} 
                      className="block px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      Enter Portal →
                    </Link>
                    <button 
                      onClick={() => { logout(); setMenuOpen(false); }} 
                      className="w-full text-left px-4 py-2 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors mt-1"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg sm:block"
              >
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

// ----------------------------------------------------------------------
// HERO & OTHER SECTIONS (Unchanged, cinematic aesthetic maintained)
// ----------------------------------------------------------------------
function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-slate-950 pt-20">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/images/hero-citizen-report-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-luminosity"
      >
        <source src="/videos/hero-citizen-report.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-950/90" />
      <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 text-center">
        <div className="animate-fade-in-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal-400" />
            {t.hero.eyebrow}
          </div>

          <h1 className="font-display mx-auto max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-7xl">
            {t.hero.headline}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
            {t.hero.subhead}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-1 hover:bg-blue-500 hover:shadow-xl"
            >
              {t.hero.ctaPrimary} <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/20"
            >
              <Play size={18} fill="currentColor" /> {t.hero.ctaSecondary}
            </Link>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Voice, Text, Photo or WhatsApp — Your choice!
          </p>
        </div>
      </div>

      <div className="absolute -bottom-px left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
    </section>
  );
}

function StatsBar() {
  const { t } = useLanguage();
  return (
    <section className="relative z-20 mx-auto -mt-10 max-w-6xl px-6">
      <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 sm:grid-cols-4 sm:gap-8">
        {t.stats.map((s, i) => (
          <div key={i} className="text-center sm:text-left">
            <div className="font-display text-4xl font-extrabold text-blue-600">{s.value}</div>
            <div className="mt-2 text-sm font-medium text-slate-500 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <div className="mb-16 text-center">
        <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900">{t.howItWorks.heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{t.howItWorks.subheading}</p>
      </div>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {t.howItWorks.steps.map((step, i) => (
          <div key={i} className="group relative rounded-3xl bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              {i + 1}
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">{step.title}</h3>
            <p className="text-base leading-relaxed text-slate-600">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const { t } = useLanguage();
  const icons = [Languages, Database, TrendingUp, Eye];
  const chipColors = ["bg-purple-100", "bg-blue-100", "bg-teal-100", "bg-amber-100"];
  const iconColors = ["text-purple-600", "text-blue-600", "text-teal-600", "text-amber-600"];

  return (
    <section className="bg-slate-900 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 max-w-2xl">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white">{t.features.heading}</h2>
          <p className="mt-4 text-lg text-slate-400">{t.features.subheading}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.items.map((f, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={i} className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:bg-white/10">
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${chipColors[i % chipColors.length]}`}>
                  <Icon size={24} className={iconColors[i % iconColors.length]} />
                </div>
                <h3 className="mb-3 text-xl font-bold text-white">{f.title}</h3>
                <p className="text-base leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const { t } = useLanguage();
  const order = ["mp_office", "mla_office", "district_admin", "panchayat_officer", "citizen"];

  return (
    <section id="roles" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
      <div className="mb-16 text-center">
        <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900">{t.roles.heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{t.roles.subheading}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((key) => {
          const role = t.roles.items[key as keyof typeof t.roles.items];
          const link = ROLE_LINKS[key];
          return (
            <Link
              key={key}
              href={link.href}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-100"
            >
              <div>
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110 group-hover:origin-left">{ROLE_ICONS[key]}</div>
                <div className="mb-2 text-xl font-bold text-slate-900">{role.label}</div>
                <p className="text-base text-slate-600">{role.desc}</p>
              </div>
              <div className="mt-6 font-semibold text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                Access Portal →
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            🏛️
          </span>
          <span className="font-display text-xl font-bold text-slate-900">LokPulse AI</span>
        </div>
        <p className="text-base font-medium text-slate-600">{t.footer.tagline}</p>
        <p className="mt-2 text-sm text-slate-400">{t.footer.builtWith}</p>
      </div>
    </footer>
  );
}