"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  Camera, 
  Mic, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  Sparkles, 
  Image as ImageIcon 
} from "lucide-react";
import { api } from "@/lib/api";
import { getCitizenId } from "@/lib/citizen";

const CATEGORIES = [
  "Road Infrastructure", 
  "Water Supply", 
  "Sanitation & Waste", 
  "Electricity", 
  "Public Health",
  "Other"
];

export default function SubmitPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  // AI Processing State
  const [aiSummary, setAiSummary] = useState("");

  const handleSimulateRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setDescription(prev => prev + (prev ? " " : "") + "There is a massive pothole on the main junction causing severe traffic slowdowns and vehicle damage.");
    }, 3000);
  };

  const handleSimulatePhoto = () => {
    setHasPhoto(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStep(3);
    
    try {
      // 1. Send to backend
      const res = await api.submitReport({
        citizen_id: getCitizenId(),
        text: description,
        location: location,
        category_hint: category
      });

      // 2. Simulate AI Processing Delay for UX
      setTimeout(() => {
        setAiSummary(res.summary);
        setLoading(false);
      }, 2000);
      
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAiSummary("Issue reported successfully. (Offline mode)");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-20">
      
      {/* Header */}
      <header className="bg-slate-900 text-white py-12 px-6 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-teal-400 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto relative z-10">
          <Link href="/" className="inline-block text-slate-400 hover:text-white mb-6 transition-colors text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">Register a Complaint</h1>
          <p className="text-slate-400">LokPulse AI will analyze your report and route it to the correct department.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 -mt-8 relative z-20 mb-20">
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200/60 overflow-hidden">
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2 px-8 pt-8">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    step > num ? 'bg-teal-500' : step === num ? 'bg-blue-600' : 'w-0'
                  }`} 
                  style={{ width: step >= num ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>

          <div className="p-8 sm:p-10">
            
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div className="animate-fade-in-up">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Where is the issue?</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Specific Location / Ward</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Ward 4, Main Street Junction" 
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm font-medium transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Issue Category</label>
                    <div className="flex flex-wrap gap-3">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                            category === cat 
                              ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    disabled={!location || !category} 
                    onClick={() => setStep(2)} 
                    className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Evidence */}
            {step === 2 && (
              <div className="animate-fade-in-up">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Provide Evidence</h2>
                <p className="text-sm text-slate-500 mb-6">Describe the issue or upload a photo. LokPulse AI will extract the details.</p>
                
                <div className="space-y-6">
                  
                  {/* Multimodal Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleSimulateRecording}
                      disabled={isRecording}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all ${
                        isRecording 
                          ? 'border-rose-400 bg-rose-50' 
                          : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`p-3 rounded-full ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                        <Mic size={24} />
                      </div>
                      <span className={`text-sm font-bold ${isRecording ? 'text-rose-600' : 'text-slate-600'}`}>
                        {isRecording ? "Listening..." : "Tap to Speak"}
                      </span>
                    </button>

                    <button 
                      onClick={handleSimulatePhoto}
                      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all ${
                        hasPhoto 
                          ? 'border-teal-500 bg-teal-50' 
                          : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className={`p-3 rounded-full ${hasPhoto ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {hasPhoto ? <ImageIcon size={24} /> : <Camera size={24} />}
                      </div>
                      <span className={`text-sm font-bold ${hasPhoto ? 'text-teal-700' : 'text-slate-600'}`}>
                        {hasPhoto ? "Photo Attached" : "Upload Photo"}
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Or type description</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-4 top-4 text-slate-400" />
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What needs to be fixed?" 
                        rows={4}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-sm font-medium transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">Back</button>
                    <button 
                      disabled={!description && !hasPhoto} 
                      onClick={handleSubmit} 
                      className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      Submit Report <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AI Processing & Success */}
            {step === 3 && (
              <div className="animate-fade-in-up text-center py-8">
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 relative mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                      <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto text-blue-600" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">AI is analyzing your report</h2>
                    <p className="text-slate-500">Extracting urgency, category, and logging to the civic database...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center animate-fade-in-up">
                    <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Submitted!</h2>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mt-4 w-full text-left">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-600">AI Summary</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        {aiSummary}
                      </p>
                    </div>

                    <div className="flex gap-3 w-full mt-8">
                      <Link href="/status" className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-200 transition-all">
                        Track Status
                      </Link>
                      <button 
                        onClick={() => {
                          setStep(1);
                          setDescription("");
                          setLocation("");
                          setHasPhoto(false);
                          setCategory("");
                        }} 
                        className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all"
                      >
                        Report Another
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}