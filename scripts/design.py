# scripts/design.py

from pathlib import Path
import textwrap

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

print("=" * 60)
print("        LokPulse AI v4 - Premium UI Generator")
print("=" * 60)


def write(relative_path: str, content: str):
    file = FRONTEND / relative_path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(textwrap.dedent(content), encoding="utf-8")
    print(f"[✓] {relative_path}")


write(
    "components/ui/GlassCard.tsx",
    """
    "use client";

    import { motion } from "framer-motion";
    import { cn } from "@/lib/utils";

    export default function GlassCard({
      children,
      className=""
    }: {
      children: React.ReactNode;
      className?: string;
    }) {
      return (
        <motion.div
          initial={{opacity:0,y:20}}
          whileInView={{opacity:1,y:0}}
          transition={{duration:.5}}
          className={cn(
            "rounded-3xl",
            "border border-white/20",
            "bg-white/70",
            "backdrop-blur-xl",
            "shadow-2xl",
            "transition-all",
            "hover:-translate-y-1",
            "hover:shadow-blue-100",
            "p-6",
            className
          )}
        >
          {children}
        </motion.div>
      );
    }
"""
)

write(
    "components/ui/GradientHeading.tsx",
    """
    export default function GradientHeading({
      title,
      subtitle
    }:{
      title:string;
      subtitle?:string;
    }){
      return(
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-700 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
            {title}
          </h1>

          {subtitle && (
            <p className="text-lg text-slate-600 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
      )
    }
"""
)

write(
    "components/layout/Navbar.tsx",
    """
"use client";

import Link from "next/link";
import { Globe, Bell, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Navbar(){

return(

<motion.header

initial={{y:-80}}

animate={{y:0}}

className="sticky top-0 z-50 border-b border-slate-200/60 backdrop-blur-xl bg-white/70">

<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

<Link href="/" className="flex items-center gap-3">

<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white font-bold">

LP

</div>

<div>

<h1 className="font-bold text-xl">

LokPulse AI

</h1>

<p className="text-xs text-slate-500">

Citizen Intelligence Platform

</p>

</div>

</Link>

<nav className="hidden lg:flex items-center gap-8">

<Link href="/">Home</Link>

<Link href="/submit">Submit</Link>

<Link href="/dashboard">Dashboard</Link>

<Link href="/heatmap">Heatmap</Link>

<Link href="/assistant">AI Assistant</Link>

</nav>

<div className="flex items-center gap-4">

<LanguageSwitcher/>

<button>

<Globe size={19}/>

</button>

<button>

<Bell size={19}/>

</button>

<button className="lg:hidden">

<Menu/>

</button>

</div>

</div>

</motion.header>

)

}
"""
)

write(
    "styles/design-system.css",
    """
:root{

--primary:#2563eb;
--secondary:#06b6d4;
--accent:#14b8a6;

--background:#f8fbff;

--glass:rgba(255,255,255,.65);

--border:rgba(255,255,255,.35);

--radius:24px;

}

body{

background:

radial-gradient(circle at top right,#dff7ff,transparent),

radial-gradient(circle at bottom left,#eff8ff,transparent),

#f8fbff;

font-family:Inter,sans-serif;

}

.glass{

backdrop-filter:blur(18px);

background:var(--glass);

border:1px solid var(--border);

border-radius:var(--radius);

}
"""
)

print("\nPremium UI Module 1 Generated Successfully.")
print("Next: Hero Section Generator")