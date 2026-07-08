
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
