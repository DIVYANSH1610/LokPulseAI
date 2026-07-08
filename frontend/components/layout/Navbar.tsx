
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
