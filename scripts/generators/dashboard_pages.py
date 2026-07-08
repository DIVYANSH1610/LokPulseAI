from .utils import write_file

def generate_dashboard_components(base_dir: str):
    priority_card_content = """
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertTriangle, TrendingUp, IndianRupee } from "lucide-react";

export function PremiumPriorityCard({ cluster, rank }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div 
      layout
      className=".card relative overflow-hidden mb-4 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 to-orange-400" />
      
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
            <span className="font-bold text-slate-700">#{rank}</span>
            <motion.div 
              className="absolute inset-0 rounded-full border-2 border-teal-500"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{cluster.category}</h3>
            <p className="text-sm text-slate-500">{cluster.one_line_summary}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-teal-600 flex items-center gap-1">
              <TrendingUp size={14} /> {(cluster.priority_score * 100).toFixed(0)} Score
            </div>
            <div className="text-xs text-slate-400">{cluster.unique_reporter_count} Reports</div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown className="text-slate-400" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-5 border-t border-slate-200/50 mt-2 pt-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="flex items-center gap-2 text-sm text-slate-600">
                 <AlertTriangle size={16} className="text-amber-500"/>
                 <span>High Confidence</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-slate-600">
                 <IndianRupee size={16} className="text-emerald-500"/>
                 <span>Est. 2.5 Cr</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
"""
    write_file(f"{base_dir}/src/components/dashboard/PremiumPriorityCard.tsx", priority_card_content)