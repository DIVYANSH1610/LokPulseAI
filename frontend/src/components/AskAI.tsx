"use client";

/**
 * Ask AI — a single floating assistant available on every page.
 *
 * Page context is inferred automatically from the current route
 * (see `contextForPath` below). The user's role is pulled directly
 * from the authenticated `useAuth()` session, overriding the path defaults.
 *
 * Constituency/ward SCOPE comes from lib/assistant-context.tsx, which pages
 * update via useSetAssistantContext(), falling back to the user's registered
 * location if the page hasn't set a scope.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Loader2, Bot } from "lucide-react";
import { api } from "@/lib/api";
import { getCitizenId } from "@/lib/citizen";
import { useAssistantContext } from "@/lib/assistant-context";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_CONSTITUENCY = "Lucknow"; // fallback

type RoleContext = {
  role: string; // The fallback role if user is a guest
  page: string;
  label: string;
  suggestions: string[];
};

function contextForPath(pathname: string): RoleContext {
  if (pathname.startsWith("/dashboard")) {
    return {
      role: "mp_office",
      page: "dashboard",
      label: "Dashboard Guide",
      suggestions: [
        "What's the top priority issue right now?",
        "How do the priority weight sliders work?",
        "What does the confidence score mean?",
      ],
    };
  }
  if (pathname.startsWith("/district")) {
    return {
      role: "district_admin",
      page: "district",
      label: "District Administration Guide",
      suggestions: [
        "How do I update an issue's implementation status?",
        "What does the implementation tracker show?",
      ],
    };
  }
  if (pathname.startsWith("/panchayat")) {
    return {
      role: "panchayat_officer",
      page: "panchayat",
      label: "Panchayat Officer Guide",
      suggestions: [
        "How do I add a ground-truth annotation?",
        "Why can't I approve a budget here?",
      ],
    };
  }
  if (pathname.startsWith("/browse")) {
    return {
      role: "citizen",
      page: "browse",
      label: "LokPulse Assistant",
      suggestions: ["How does upvoting work?", "Why don't I see my own report here?"],
    };
  }
  if (pathname.startsWith("/status")) {
    return {
      role: "citizen",
      page: "status",
      label: "LokPulse Assistant",
      suggestions: ["What does 'under review' mean?", "How long until my report is actioned?"],
    };
  }
  if (pathname.startsWith("/submit")) {
    return {
      role: "citizen",
      page: "submit",
      label: "LokPulse Assistant",
      suggestions: ["How do I report by photo?", "What happens after I submit?"],
    };
  }
  return {
    role: "citizen",
    page: "landing",
    label: "LokPulse Assistant",
    suggestions: ["What is LokPulse AI?", "How do I report an issue?"],
  };
}

type Message = { role: "user" | "assistant"; text: string; actions?: string[] };

export function AskAI() {
  const pathname = usePathname() || "/";
  const pathContext = contextForPath(pathname);
  const scope = useAssistantContext(); 
  const { user, isLoaded } = useAuth(); 

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The actual authenticated user's role takes precedence over the path's assumed role.
  // Fall back to the path's assumed role only if they are a guest/unauthenticated.
  const effectiveRole = (isLoaded && user && user.role !== "guest") 
    ? user.role 
    : pathContext.role;

  useEffect(() => {
    // Reset the conversation when the user moves to a page with a
    // different guidance context, so answers never carry stale page assumptions.
    setMessages([]);
  }, [pathContext.page]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    
    try {
      const res = await api.askAI({
        role: effectiveRole,
        page: pathContext.page,
        question,
        // Send constituency if role requires it. Prefer explicitly set scope, fallback to user's registered location.
        constituency:
          ["mp_office", "mla_office", "district_admin"].includes(effectiveRole)
            ? scope.constituency || user?.location || DEFAULT_CONSTITUENCY
            : undefined,
        // Send ward_id if role requires it.
        ward_id: 
          effectiveRole === "panchayat_officer" 
            ? scope.wardId || user?.location 
            : undefined,
        citizen_context: 
          effectiveRole === "citizen" 
            ? { citizen_id: getCitizenId() } 
            : undefined,
      });
      setMessages((m) => [...m, { role: "assistant", text: res.answer, actions: res.suggested_actions }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the LokPulse backend just now. Make sure it's running and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close Ask AI" : "Open Ask AI"}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg"
        style={{ background: "var(--navy-900)" }}
      >
        {open ? <X size={16} /> : <Sparkles size={16} style={{ color: "var(--teal-600)" }} />}
        {open ? "Close" : "Ask AI"}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ background: "var(--navy-900)", color: "#fff" }}
            >
              <Bot size={16} style={{ color: "var(--teal-600)" }} />
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {user && user.role !== "guest" ? `${user.name}'s Assistant` : pathContext.label}
                </p>
                <p className="text-xs opacity-70 leading-tight">Grounded in the LokPulse knowledge base</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 scrollbar-thin">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    Try asking:
                  </p>
                  {pathContext.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-xs"
                      style={{ background: "var(--teal-100)", color: "var(--navy-900)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className="inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm"
                    style={
                      m.role === "user"
                        ? { background: "var(--navy-900)", color: "#fff" }
                        : { background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)" }
                    }
                  >
                    {m.text}
                  </div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.actions.map((a) => (
                        <span
                          key={a}
                          className="rounded-full px-2 py-0.5 text-[10px]"
                          style={{ background: "var(--amber-100)", color: "var(--amber-500)" }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
                  <Loader2 size={12} className="animate-spin" /> Thinking…
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t px-3 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this page…"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--paper)", border: "1px solid var(--border)", color: "var(--ink)" }}
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Send"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white disabled:opacity-50"
                style={{ background: "var(--teal-600)" }}
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}