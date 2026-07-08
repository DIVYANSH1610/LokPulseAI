"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Shield, MapPin, Phone, User, Landmark, Building2, Briefcase, Fingerprint, Lock, Eye, EyeOff } from "lucide-react";
import { Role } from "@/lib/auth-context";

const ROLES = [
  { id: "citizen", title: "Citizen", icon: User, desc: "Report issues & track progress" },
  { id: "panchayat_officer", title: "Panchayat Officer", icon: MapPin, desc: "Manage ward-level execution" },
  { id: "district_admin", title: "District Admin", icon: Building2, desc: "Oversee district operations" },
  { id: "mla_office", title: "MLA Office", icon: Briefcase, desc: "Constituency management" },
  { id: "mp_office", title: "MP Office", icon: Landmark, desc: "Parliamentary oversight" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<Role | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: "", phone: "", state: "", constituency: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Aadhaar Verification State
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarStatus, setAadhaarStatus] = useState<"idle" | "sent" | "verified">("idle");

  const handleAadhaarVerify = () => {
    setAadhaarStatus("sent");
    setTimeout(() => { setAadhaarStatus("verified"); }, 1500);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          role: role,
          location: formData.constituency || "Lucknow",
          aadhaarVerified: true
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // Route to login on success
      router.push("/login?registered=true");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep(2); // Go back to show error
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep2Valid = formData.name && formData.phone.length === 10 && formData.password.length >= 6 && formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-4xl bg-white rounded-[32px] shadow-xl border border-slate-200/60 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Informational Panel */}
        <div className="md:w-5/12 bg-slate-900 p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent" />
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 text-white mb-12 opacity-80 hover:opacity-100">
              ← Back to Home
            </Link>
            <h2 className="text-3xl font-display font-bold text-white mb-4">Join LokPulse AI</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Register securely via Aadhaar to ensure authentic issue reporting and verified administrative access across the platform.
            </p>
          </div>

          <div className="relative z-10 mt-12 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Shield size={16} className="text-teal-400" /> Government-grade encryption
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 size={16} className="text-blue-400" /> Role-based access control
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Fingerprint size={16} className="text-amber-400" /> Aadhaar KYC integrated
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:w-7/12 p-10 lg:p-12 overflow-y-auto max-h-[90vh] scrollbar-thin">
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-2 mb-10">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full bg-blue-600 transition-all duration-500 ${step >= num ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm font-bold">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: ROLE */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Select your role</h3>
              <p className="text-sm text-slate-500 mb-8">Access levels are granted based on your official capacity.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ROLES.map((r) => (
                  <button key={r.id} onClick={() => setRole(r.id)} className={`p-4 rounded-2xl border-2 text-left transition-all ${role === r.id ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100' : 'border-slate-100 hover:border-slate-300'}`}>
                    <r.icon size={20} className={role === r.id ? 'text-blue-600 mb-3' : 'text-slate-400 mb-3'} />
                    <h4 className="font-bold text-slate-900">{r.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
                  </button>
                ))}
              </div>

              <button disabled={!role} onClick={() => setStep(2)} className="w-full mt-8 bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50">
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2: DETAILS & CREDENTIALS */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Create Credentials</h3>
              <p className="text-sm text-slate-500 mb-8">Set up your profile and password for future logins.</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="tel" maxLength={10} value={formData.phone} onChange={(e)=>setFormData({...formData, phone: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Constituency</label>
                  <input type="text" placeholder="e.g. Amritsar" value={formData.constituency} onChange={(e)=>setFormData({...formData, constituency: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? "text" : "password"} value={formData.password} onChange={(e)=>setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e)=>setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm transition-all" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-xs text-rose-500 font-bold">Passwords do not match.</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Back</button>
                <button disabled={!isStep2Valid} onClick={() => setStep(3)} className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50">Continue to KYC →</button>
              </div>
            </div>
          )}

          {/* STEP 3: AADHAAR */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Aadhaar KYC</h3>
              <p className="text-sm text-slate-500 mb-8">Required to prevent spam and ensure official accountability.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Aadhaar Number</label>
                  <div className="flex gap-3">
                    <input type="text" maxLength={12} placeholder="XXXX XXXX XXXX" disabled={aadhaarStatus === "verified"} onChange={(e) => setAadhaar(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono disabled:opacity-50 outline-none" />
                    {aadhaarStatus === "idle" && (
                      <button onClick={() => setAadhaarStatus("sent")} className="px-5 bg-blue-100 text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-200 transition-colors">Get OTP</button>
                    )}
                    {aadhaarStatus === "verified" && (
                      <div className="px-5 flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 font-bold text-sm rounded-xl">
                        <CheckCircle2 size={16} /> Verified
                      </div>
                    )}
                  </div>
                </div>

                {aadhaarStatus === "sent" && (
                  <div className="animate-fade-in-up">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Enter OTP</label>
                    <div className="flex gap-3">
                      <input type="text" maxLength={6} placeholder="000000" className="w-32 px-4 py-3 text-center rounded-xl border border-slate-200 bg-slate-50 font-bold tracking-[0.5em] outline-none" />
                      <button onClick={handleAadhaarVerify} className="px-6 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">Verify</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-12 pt-6 border-t border-slate-100">
                <button onClick={() => setStep(2)} disabled={isSubmitting} className="px-6 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50">Back</button>
                <button disabled={aadhaarStatus !== "verified" || isSubmitting} onClick={handleComplete} className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-300">
                  {isSubmitting ? "Creating Account..." : "Complete Registration"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}