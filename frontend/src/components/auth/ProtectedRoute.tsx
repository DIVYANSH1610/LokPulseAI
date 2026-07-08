"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "@/lib/auth-context";
import { Loader2, ShieldAlert } from "lucide-react";

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: Role[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      // Not logged in at all, kick to login/register
      router.push("/register");
    } else if (!allowedRoles.includes(user.role)) {
      // Logged in, but wrong role (e.g., a citizen trying to view the MP dashboard)
      setIsChecking(false);
    } else {
      // Authorized!
      setIsChecking(false);
    }
  }, [user, router, allowedRoles]);

  // Show a smooth loading state while checking credentials
  if (isChecking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Show an unauthorized error if they lack permissions
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[24px] shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your current role ({user.role.replace('_', ' ').toUpperCase()}) does not have permission to view this administrative portal.
          </p>
          <button 
            onClick={() => router.push("/")}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold w-full hover:bg-slate-800 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // If all checks pass, render the protected page
  return <>{children}</>;
}