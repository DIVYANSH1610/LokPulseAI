"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Camera, MapPin, Send } from "lucide-react";

export function ComplaintWizard() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="max-w-2xl mx-auto w-full .card overflow-hidden">
      {/* Progress Bar */}
      <div className="h-2 w-full bg-slate-100">
        <motion.div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
          initial={{ width: "25%" }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="p-8 min-h-[400px] relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">
                What's the issue?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group">
                  <div className="p-4 bg-slate-100 rounded-full group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-600">
                    <Mic size={24} />
                  </div>
                  <span className="font-medium text-slate-700">
                    Record Voice Note
                  </span>
                </button>
                <button className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group">
                  <div className="p-4 bg-slate-100 rounded-full group-hover:bg-teal-100 text-slate-600 group-hover:text-teal-600">
                    <Camera size={24} />
                  </div>
                  <span className="font-medium text-slate-700">
                    Upload Photo
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-slate-800">
                Where is this happening?
              </h2>
              <div className="bg-slate-100 rounded-xl h-48 flex items-center justify-center border-2 border-dashed border-slate-300">
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-lg shadow-sm hover:shadow font-medium">
                  <MapPin size={18} className="text-teal-600" /> Detect My
                  Location
                </button>
              </div>
            </motion.div>
          )}

          {/* Add Steps 3 & 4 similarly... */}
        </AnimatePresence>

        <div className="absolute bottom-8 left-8 right-8 flex justify-between">
          <button
            onClick={prevStep}
            className={`px-6 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors ${step === 1 ? "invisible" : ""}`}
          >
            Back
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-2 rounded-lg font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            {step === totalSteps ? "Submit Report" : "Continue"}
            {step === totalSteps && <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
