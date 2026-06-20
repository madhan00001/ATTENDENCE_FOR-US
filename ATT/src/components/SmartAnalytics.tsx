import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  HelpCircle, 
  CheckCircle2, 
  Cpu, 
  UserPlus, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { Student, AttendancePrediction, SmartRecommendation } from "../types";

interface SmartAnalyticsProps {
  students: Student[];
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
}

export default function SmartAnalytics({ students, showToast }: SmartAnalyticsProps) {
  const [predictions, setPredictions] = useState<AttendancePrediction[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedWithAI, setLoadedWithAI] = useState(false);
  const [aiAnalysisSteps, setAiAnalysisSteps] = useState("");

  // Load predictions and recommendations from Express backend
  const fetchSmartAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setAiAnalysisSteps("Establishing secure endpoint handshake...");

    // Simulate step indicators
    const timers = [
      setTimeout(() => setAiAnalysisSteps("Scanning student historical presence vectors..."), 600),
      setTimeout(() => setAiAnalysisSteps("Correlating consecutive leave frequencies..."), 1200),
      setTimeout(() => setAiAnalysisSteps("Running regression models with Gemini Flash 3.5..."), 1800),
      setTimeout(() => setAiAnalysisSteps("Formulating personalized diagnostic actions..."), 2400),
    ];

    try {
      const res = await fetch("/api/smart/analytics");
      const data = await res.json();
      if (data.success) {
        setPredictions(data.predictions);
        setRecommendations(data.recommendations);
        setLoadedWithAI(!data.offlineFallback);
        if (!silent) {
          if (data.offlineFallback) {
            showToast("Prognosis generated using local heuristics (Gemini offline fallback).", 'info');
          } else {
            showToast("Gemini 3.5 Prognostic Intelligence cycle compiled successfully!", 'success');
          }
        }
      } else {
        showToast("Backend analytics retrieval failed.", 'err');
      }
    } catch (e) {
      showToast("Network failure retrieving smart prognosis", 'err');
    } finally {
      timers.forEach(t => clearTimeout(t));
      setIsLoading(false);
      setAiAnalysisSteps("");
    }
  };

  // Run on initial load
  useEffect(() => {
    fetchSmartAnalytics(true);
  }, [students]);

  // Spot chronic absentees: students with attendanceRate < 75% or 3+ absent logs
  const chronicStudents = students.filter(s => {
    const totalAbsents = s.history.filter(h => h.status === 'absent').length;
    return s.attendanceRate < 75 || totalAbsents >= 3;
  });

  return (
    <div className="space-y-8" id="smart-analytics-view">
      
      {/* Intro Header callout */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-950 dark:to-slate-900 rounded-2xl p-6 text-white border border-emerald-500/10 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse shrink-0" />
            <h2 className="font-display font-bold text-lg">AI Prognostic Absence Analytics</h2>
          </div>
          <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
            Run on-demand regression models on students historical attendance logs. Gemini predicts next-month rates, highlights chronic absenteeism pathways, and offers individual recommendations to restore active statuses.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => fetchSmartAnalytics(false)}
          className="flex items-center space-x-2 px-6 py-3 bg-white hover:bg-slate-50 text-emerald-800 text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-all border border-emerald-100 dark:border-slate-800"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Cpu className="w-5 h-5 text-emerald-600" />
              <span>Run AI Prognosis Cycle</span>
            </>
          )}
        </button>
      </div>

      {/* Loading overlay indicator */}
      {isLoading && (
        <div className="bg-white dark:bg-slate-950/80 p-8 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center space-y-4 shadow-sm animate-pulse">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Gemini AI Engine Spinning Up</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{aiAnalysisSteps}</p>
          </div>
        </div>
      )}

      {/* Primary prognosis cards display */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column 1: Attendance Risk Predictions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span>Prognostic Attendance Forecasts</span>
                </h3>
                <p className="text-xs text-slate-400">Next-month estimated presence levels with trend risk vectors</p>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                loadedWithAI 
                  ? "bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" 
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200"
              }`}>
                {loadedWithAI ? "⚡ Gemini Live Engine" : "📊 Local Heuristic Engine"}
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {predictions.length === 0 ? (
                <p className="text-center py-12 text-xs text-slate-400">Click the button above to calculate predictions metrics.</p>
              ) : (
                predictions.map((p, i) => {
                  const student = students.find(s => s.registerNumber === p.studentId);
                  return (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3 text-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.studentName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.studentId} • {student?.department || "Specialist Dept"}</p>
                        </div>
                        {/* Risk level chip */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          p.riskLevel === 'High' 
                            ? "bg-red-150 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/50" 
                            : p.riskLevel === 'Medium'
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"
                        }`}>
                          {p.riskLevel} Risk Case
                        </span>
                      </div>

                      {/* Fall forecast block */}
                      <div className="grid grid-cols-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-2.5 rounded-lg text-center gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400">Current Rate</p>
                          <p className="font-bold text-slate-700 dark:text-slate-300 font-mono">{p.currentRate}%</p>
                        </div>
                        <div className="border-l border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center">
                          <p className="text-[10px] text-slate-400">Forecast Rate (1 Month)</p>
                          <div className="flex items-center space-x-1 justify-center">
                            {p.trend === 'declining' ? (
                              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <p className="font-bold text-slate-800 dark:text-slate-100 font-mono">{p.predictedRate}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-[10px] font-sans text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-100/50 dark:bg-slate-900 p-2 rounded-md">
                        <strong>AI Reason Checklist:</strong> {p.reason}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: smart recommendation list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Actionable Smart Recommendations</span>
              </h3>
              <p className="text-xs text-slate-400">Action checkpoints formulated for students requiring custom attendance checkpoints</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recommendations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs text-slate-500">Excellent! All matching student records are currently meeting or exceeding the minimum 75% attendance criteria catalog.</p>
                </div>
              ) : (
                recommendations.map((rec, i) => (
                  <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3 text-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{rec.studentName}</p>
                        <p className="text-[10px] text-slate-400">Current level: <span className="font-mono text-red-500 font-bold">{rec.currentRate}%</span></p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        rec.priority === 'High' 
                          ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200"
                      }`}>
                        {rec.priority} Priority Target
                      </span>
                    </div>

                    <div className="space-y-1.5 p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-lg">
                      <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">Trigger Alert:</p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 italic">"{rec.triggerReason}"</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100/40 dark:border-emerald-800/20 rounded-lg space-y-1">
                      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>AI Remedy Strategy</span>
                      </p>
                      <p className="text-[10px] text-slate-700 dark:text-slate-350 leading-relaxed font-sans font-medium">
                        {rec.aiSuggestedAction}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Bottom Row: Chronic Absentee Warning Spotter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Chronic Absentee Flag Spotter</span>
            </h3>
            <p className="text-xs text-slate-400">System critical flags highlighting students with multiple absence counts or under-threshold presence</p>
          </div>
          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-full text-[10px] font-bold font-mono">
            {chronicStudents.length} Students flagged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {chronicStudents.length === 0 ? (
            <div className="col-span-full text-center py-6 text-xs text-slate-450">No students are currently flagged as chronic absentees! Excellent.</div>
          ) : (
            chronicStudents.map((student, idx) => {
              const absents = student.history.filter(h => h.status === 'absent').length;
              return (
                <div key={idx} className="p-4 bg-amber-50/10 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{student.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{student.registerNumber} • {student.department}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] text-slate-500 font-sans">Absence Logs: <strong>{absents} days</strong></span>
                    <span className="text-[11px] font-bold text-red-500 font-mono">{student.attendanceRate}% Rate</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
