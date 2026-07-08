"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Activity, Shield, MapPin } from "lucide-react";

export function PremiumHero() {
  return (
    <div className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-screen filter blur-[128px] animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[128px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-[128px] animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-white/10 border border-white/20 text-teal-300 text-sm font-medium tracking-wider mb-6 backdrop-blur-md">
            THE NEXT GEN GOVERNANCE OS
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
            Don't Just Count Complaints. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
              Solve the Right Ones.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            LokPulse AI converts messy, multilingual citizen signals into ranked, evidence-backed development action lists—linking directly to actual scheme budgets.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="px-8 py-4 rounded-full bg-teal-500 text-slate-900 font-bold hover:bg-teal-400 transition-all hover:scale-105 flex items-center gap-2">
              View Live Dashboard <ArrowRight size={18} />
            </Link>
            <Link href="/submit" className="px-8 py-4 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md transition-all font-medium">
              Submit a Report
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
