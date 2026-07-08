"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type Role = "guest" | "citizen" | "panchayat_officer" | "district_admin" | "mla_office" | "mp_office";

export type User = {
  id: string;
  name: string;
  role: Role;
  phone: string;
  location: string;
  aadhaarVerified: boolean;
};

type Permissions = {
  canSubmitIssues: boolean;
  canAnnotateWards: boolean;
  canUpdateStatus: boolean;
  canAdjustWeights: boolean;
  canApproveBudgets: boolean;
};

const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  guest: { canSubmitIssues: false, canAnnotateWards: false, canUpdateStatus: false, canAdjustWeights: false, canApproveBudgets: false },
  citizen: { canSubmitIssues: true, canAnnotateWards: false, canUpdateStatus: false, canAdjustWeights: false, canApproveBudgets: false },
  panchayat_officer: { canSubmitIssues: true, canAnnotateWards: true, canUpdateStatus: false, canAdjustWeights: false, canApproveBudgets: false },
  district_admin: { canSubmitIssues: false, canAnnotateWards: true, canUpdateStatus: true, canAdjustWeights: false, canApproveBudgets: false },
  mla_office: { canSubmitIssues: false, canAnnotateWards: false, canUpdateStatus: true, canAdjustWeights: true, canApproveBudgets: true },
  mp_office: { canSubmitIssues: false, canAnnotateWards: false, canUpdateStatus: true, canAdjustWeights: true, canApproveBudgets: true },
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  permissions: Permissions;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoaded: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session and token from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem("lokpulse_session");
    const storedToken = localStorage.getItem("lokpulse_token");
    if (storedSession && storedToken) {
      setUser(JSON.parse(storedSession));
      setToken(storedToken);
    }
    setIsLoaded(true);
  }, []);

  const login = (userData: User, jwtToken: string) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem("lokpulse_session", JSON.stringify(userData));
    localStorage.setItem("lokpulse_token", jwtToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("lokpulse_session");
    localStorage.removeItem("lokpulse_token");
    window.location.href = "/login";
  };

  const permissions = user ? ROLE_PERMISSIONS[user.role] : ROLE_PERMISSIONS.guest;

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, isLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}