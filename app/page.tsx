"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, ROLE_ICONS } from "@/components/icons";

const ROLE_LINKS: Record<string, { href: string; enabled: boolean }> = {
  mp_office: { href: "/dashboard", enabled: true },
  citizen: { href: "/submit", enabled: true },
  district_admin: { href: "/district", enabled: true },
  panchayat_officer: { href: "/panchayat", enabled: true },
  mla_office: { href: "/dashboard", enabled: true },
};

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-paper">
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

function SiteHeader() {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          <a href="#how-it-works" className="hover:text-white">
            {t.nav.howItWorks}
          </a>
          <a href="#roles" className="hover:text-white">
            {t.nav.roles}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/dashboard"
            className="hidden rounded-full bg-teal-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-teal-700 sm:block"
          >
            {t.nav.login}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-[560px] overflow-hidden bg-navy-900">
      {/*
        Background video: a real citizen reporting a civic issue (water
        leak) — grounds the hero in the actual use case rather than
        abstract decoration. Muted + loop + playsInline is required for
        autoplay to work across mobile browsers. poster ensures an
        instant, correctly-framed paint before the video downloads, and
        preload="metadata" keeps initial page weight low.
      */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/hero-citizen-report.mp4"
        poster="/images/hero-citizen-report-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      {/* Navy scrim: keeps hero copy legible over any footage without
          fully hiding the video, and keeps the brand's restrained
          navy/teal identity intact rather than looking like raw stock
          footage was dropped in. */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/90 via-navy-900/80 to-navy-900/95" />

      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-teal-100">
          {t.hero.eyebrow}
        </p>
        <h1 className="font-display max-w-3xl text-4xl leading-tight text-white sm:text-6xl">
          {t.hero.headline}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
          {t.hero.subhead}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-teal-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            {t.hero.ctaPrimary}
          </Link>
          <Link
            href="/submit"
            className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {t.hero.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const { t } = useLanguage();
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
        {t.stats.map((s, i) => (
          <div key={i}>
            <div className="font-data text-3xl text-navy-900">{s.value}</div>
            <div className="mt-1 text-xs leading-snug text-ink-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 max-w-2xl">
        <h2 className="font-display text-3xl text-navy-900">{t.howItWorks.heading}</h2>
        <p className="mt-3 text-ink-muted">{t.howItWorks.subheading}</p>
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {t.howItWorks.steps.map((step, i) => (
          <div key={i}>
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 font-data text-sm text-white">
              {i + 1}
            </div>
            <h3 className="font-medium text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const { t } = useLanguage();
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl text-navy-900">{t.features.heading}</h2>
          <p className="mt-3 text-ink-muted">{t.features.subheading}</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {t.features.items.map((f, i) => (
            <div key={i} className="card p-6">
              <h3 className="font-medium text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  const { t } = useLanguage();
  const order = ["mp_office", "mla_office", "district_admin", "panchayat_officer", "citizen"];

  return (
    <section id="roles" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 max-w-2xl">
        <h2 className="font-display text-3xl text-navy-900">{t.roles.heading}</h2>
        <p className="mt-3 text-ink-muted">{t.roles.subheading}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((key) => {
          const role = t.roles.items[key as keyof typeof t.roles.items];
          const link = ROLE_LINKS[key];
          const RoleIcon = ROLE_ICONS[key];
          return (
            <Link
              key={key}
              href={link.href}
              className="card block p-5 transition hover:border-teal-600 hover:shadow-sm"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-teal-100 text-teal-600">
                <RoleIcon className="size-4.5" aria-hidden="true" />
              </div>
              <div className="font-medium text-ink">{role.label}</div>
              <p className="mt-1 text-sm text-ink-muted">{role.desc}</p>
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
    <footer className="border-t border-border bg-navy-900">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <BrandMark />
          <span className="font-display text-lg text-white">LokPulse AI</span>
        </div>
        <p className="mt-2 text-sm text-white/60">{t.footer.tagline}</p>
        <p className="mt-1 text-xs text-white/40">{t.footer.builtWith}</p>
      </div>
    </footer>
  );
}
