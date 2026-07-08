"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Landmark, Lock, Eye, EyeOff, User, AlertCircle } from "lucide-react";
import { useAuth, Role } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Password Flow
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    
    try {
      // FastAPI expects x-www-form-urlencoded for standard OAuth2 login
      const formData = new URLSearchParams();
      formData.append("username", identifier); // using phone number as the username identifier
      formData.append("password", password);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Invalid credentials. Please try again.");
      }

      // Login requires both the user object and the JWT token now
      login(data.user, data.access_token);
      router.push(data.user.role === "citizen" ? "/browse" : "/dashboard");
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: Role, name: string) => {
    // For demo purposes only
    login({
      id: `DEMO-${Math.floor(Math.random() * 1000)}`,
      name: name,
      phone: "+91 9999999999",
      location: "Lucknow, UP",
      role: role,
      aadhaarVerified: true
    }, "demo_jwt_token_12345");
    router.push(role === "citizen" ? "/browse" : "/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 hover:scale-105 transition-transform">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 text-2xl">🏛️</span>
        </Link>

        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="p-8 sm:p-10 pb-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-display font-bold text-slate-900">Welcome Back</h1>
              <p className="text-sm text-slate-500 mt-2">Sign in securely to access your portal.</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-fade-in-up">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-semibold text-rose-800">{errorMsg}</p>
              </div>
            )}

            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
              <button onClick={() => {setLoginMethod("password"); setErrorMsg("");}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === "password" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Password</button>
              <button onClick={() => {setLoginMethod("otp"); setErrorMsg("");}} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${loginMethod === "otp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>OTP Login</button>
            </div>

            {loginMethod === "password" && (
              <form onSubmit={handlePasswordLogin} className="space-y-5 animate-fade-in-up">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Mobile Number</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" maxLength={10} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm font-bold transition-all" placeholder="Enter Mobile Number" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm font-bold transition-all" placeholder="Enter your password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={!identifier || !password || loading} className="w-full mt-2 bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                  {loading ? "Authenticating..." : "Secure Login"} <ArrowRight size={18} />
                </button>
              </form>
            )}

            {loginMethod === "otp" && (
              <div className="animate-fade-in-up">
                <p className="text-sm font-medium text-slate-500 mb-4 text-center">OTP is temporarily unavailable in demo mode. Please use Password login or Demo Access below.</p>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 border-t border-slate-100 p-6 text-center">
            <p className="text-sm font-medium text-slate-500">Don't have an account? <Link href="/register" className="text-blue-600 font-bold hover:underline">Join LokPulse AI</Link></p>
          </div>
        </div>

        <div className="mt-8 border border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-4">Demo Access</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => handleDemoLogin("mp_office", "Hon. MP Office")} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-left">
              <div className="bg-purple-100 text-purple-600 p-2 rounded-lg"><Landmark size={16} /></div>
              <div>
                <p className="text-sm font-bold text-slate-900">MP / MLA Office</p>
                <p className="text-xs text-slate-500">Full Dashboard Access</p>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}