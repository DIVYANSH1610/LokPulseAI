from .utils import write_file

def generate_ui_components(base_dir: str):
    glass_card_content = """
"use client";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function GlassCard({ children, className = "", delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ y: -5 }}
      className={`.card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
"""
    write_file(f"{base_dir}/src/components/ui/GlassCard.tsx", glass_card_content)