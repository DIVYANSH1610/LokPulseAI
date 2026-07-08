from .utils import write_file

def generate_ai_components(base_dir: str):
    copilot_content = """
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, Send, Mic, X } from "lucide-react";

export function AICopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai", content: "How can I assist with policy decisions today?" }]);
  const [input, setInput] = useState("");

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-6 font-medium text-white shadow-xl"
      >
        <Sparkles size={18} />
        Ask AI Copilot
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl glass-panel"
          >
            <div className="flex items-center justify-between bg-slate-900/90 px-4 py-3 text-white backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-teal-400" />
                <span className="font-medium">LokPulse Copilot</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: m.role === 'ai' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.role === "user" 
                      ? "bg-teal-600 text-white rounded-br-none" 
                      : "bg-white/80 text-slate-800 rounded-bl-none border border-slate-200/50"
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="border-t border-slate-200/50 bg-white/50 p-3 backdrop-blur-md">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-inner border border-slate-200">
                <button className="text-slate-400 hover:text-teal-600 transition-colors">
                  <Mic size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about budgets, hotspots..."
                  className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button 
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white transition-transform hover:scale-105"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
"""
    write_file(f"{base_dir}/src/components/ai/AICopilot.tsx", copilot_content)