"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

type AssistantContextValue = {
  constituency?: string;
  wardId?: string;
};

type AssistantContextApi = AssistantContextValue & {
  setContext: (partial: AssistantContextValue) => void;
};

const AssistantCtx = createContext<AssistantContextApi | null>(null);

/**
 * Lets any page push its current constituency/ward selection up to the
 * globally-mounted <AskAI /> widget (mounted once in app/layout.tsx),
 * without prop-drilling or duplicating fetch logic in AskAI itself.
 *
 * This exists because backend/agents/assistant_agent.py's
 * _live_context_for_official() needs different scope per role:
 *   - panchayat_officer -> ward_id
 *   - mp_office / mla_office / district_admin -> constituency
 * and AskAI is mounted outside any single page's component tree, so it
 * has no other way to know what the user is currently looking at.
 */
export function AssistantContextProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AssistantContextValue>({});

  const setContext = useCallback((partial: AssistantContextValue) => {
    setValue((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <AssistantCtx.Provider value={{ ...value, setContext }}>{children}</AssistantCtx.Provider>
  );
}

export function useAssistantContext() {
  const ctx = useContext(AssistantCtx);
  if (!ctx) {
    throw new Error("useAssistantContext must be used within AssistantContextProvider");
  }
  return ctx;
}

/**
 * Call this once near the top of any page that has a constituency or
 * ward selection AskAI should know about. Re-syncs whenever the value
 * changes, so switching the ward dropdown on /panchayat immediately
 * updates what Ask AI is grounded in — no page reload needed.
 *
 * Usage:
 *   useSetAssistantContext({ constituency: CONSTITUENCY });        // dashboard, district
 *   useSetAssistantContext({ wardId });                            // panchayat
 */
export function useSetAssistantContext(value: AssistantContextValue) {
  const { setContext } = useAssistantContext();
  const { constituency, wardId } = value;

  useEffect(() => {
    setContext({ constituency, wardId });
  }, [constituency, wardId, setContext]);
}