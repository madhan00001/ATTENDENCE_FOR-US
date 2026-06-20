import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  Upload, 
  Send, 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from "lucide-react";
import { Student, NotificationLog } from "../types";

interface TeacherDashboardProps {
  students: Student[];
  notifications: NotificationLog[];
  onRefreshData: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
}

export default function TeacherDashboard({
  students,
  notifications,
  onRefreshData,
  selectedDate,
  setSelectedDate,
  showToast
}: TeacherDashboardProps) {
  // Manual Checklist State
  const [markedPresents, setMarkedPresents] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedYear, setSelectedYear] = useState("All");

  // AI Extraction State
  const [aiTextInput, setAiTextInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter students
  const departments = ["All", ...Array.from(new Set(students.map(s => s.department)))];
  const years = ["All", ...Array.from(new Set(students.map(s => s.year)))];

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "All" || s.department === selectedDept;
    const matchesYear = selectedYear === "All" || s.year === selectedYear;
    return matchesSearch && matchesDept && matchesYear;
  });

  // Initialize marked states on date or students change
  useEffect(() => {
    const initialMarks: Record<string, boolean> = {};
    students.forEach(s => {
      const historyEntry = s.history.find(h => h.date === selectedDate);
      if (historyEntry) {
        initialMarks[s.registerNumber] = historyEntry.status === 'present';
      } else {
        // Default to true (present) on a new untracked date
        initialMarks[s.registerNumber] = true;
      }
    });
    setMarkedPresents(initialMarks);
  }, [students, selectedDate]);

  // Handle single checklist toggle
  const toggleStatus = (regNum: string) => {
    setMarkedPresents(prev => ({
      ...prev,
      [regNum]: !prev[regNum]
    }));
  };

  // Submit manual attendance
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    const attendances: Record<string, 'present' | 'absent'> = {};
    students.forEach(s => {
      // If student was filtered out, we keep their previous history or assume present if unset
      const wasChecked = markedPresents[s.registerNumber];
      attendances[s.registerNumber] = wasChecked ? 'present' : 'absent';
    });

    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, attendances })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Attendance marked! Sent ${data.absentCount * 4} parent alerts across all channels.`, 'success');
        onRefreshData();
      } else {
        showToast(data.error || "Failed to submit attendance.", 'err');
      }
    } catch (e) {
      showToast("Network failure submitting attendance", 'err');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set all to Present or Absent
  const setAllStatus = (present: boolean) => {
    const updated: Record<string, boolean> = {};
    filteredStudents.forEach(s => {
      updated[s.registerNumber] = present;
    });
    setMarkedPresents(prev => ({ ...prev, ...updated }));
  };

  // Preset prompts for AI recognition
  const aiPresets = [
    "Today's absent students are Madhan Raj, Arun Kumar and Priya.",
    "Good morning. Sneha Reddy and Priya Swaminathan are absent because of medical leaves. The rest of the class is present.",
    "Following students are absent from III Year Mech engineering: Arun Kumar, Karthik Subramanian, and Rajesh Nair.",
    "Absentees report for 20-06-2026: Vikram, Priya and Madhan won't be attending class today."
  ];

  // AI Extract trigger
  const handleAIExtract = async (inputText: string) => {
    if (!inputText.trim()) {
      showToast("Please enter an absentee text message first.", 'info');
      return;
    }
    setIsExtracting(true);
    setAiSuggestions([]);

    try {
      const res = await fetch("/api/attendance/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, date: selectedDate })
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestions(data.extractedMatches);
        if (data.fallbackMode) {
          showToast(`Extracted ${data.absentCount} absent students (Fuzzy Offline Match).`, 'info');
        } else {
          showToast(`Extract complete! Spark AI identified ${data.absentCount} absentees and queued notifications.`, 'success');
        }
        onRefreshData();
      } else {
        showToast(data.error || "AI could not process the text.", 'err');
      }
    } catch (e) {
      showToast("Failed to communicate with AI endpoint.", 'err');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle Drag & Drop File Upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const fileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        showToast(`Uploaded ${file.name}. Reading content...`, 'info');
        setAiTextInput(text);
        // Automatically extract
        await handleAIExtract(text);
      }
    };
    reader.readAsText(file);
  };

  // Get current day's active notifications
  const todayNotifications = notifications.filter(n => n.timestamp.startsWith(selectedDate));

  return (
    <div className="space-y-8" id="teacher-dashboard-view">
      {/* Upper Grid: AI Processing & File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: AI Student Name Recognition (Natural Language) */}
        <div className="bg-[#2DD4BF] text-[#111827] border-4 border-[#111827] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#115E59] dark:shadow-[8px_8px_0px_0px_#111827] space-y-4" id="ai-recognition-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white border-2 border-[#111827] rounded-2xl rotate-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                <Sparkles className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-[#111827] leading-tight">AI VOICE & TEXT TRANSLATOR</h2>
                <p className="text-xs font-bold text-[#111827]/70">Parse absent student lists with instant intelligence matches</p>
              </div>
            </div>
            <span className="text-[10px] bg-white border-2 border-[#111827] text-[#111827] font-black uppercase px-2 py-0.5 rounded-full inline-block">SPARK AI</span>
          </div>

          <div className="space-y-3 pb-2">
            <textarea
              className="w-full h-32 px-4 py-3 text-xs bg-white text-[#111827] border-4 border-[#111827] rounded-2xl focus:outline-hidden font-sans font-bold shadow-[4px_4px_0px_0px_#111827] placeholder-slate-500"
              placeholder='e.g., "Good morning, today Madhan Raj and Priya are absent due to heavy rains. Everyone else is present."'
              value={aiTextInput}
              onChange={(e) => setAiTextInput(e.target.value)}
            />

            {/* Presets */}
            <div className="space-y-1 bg-white/40 p-2.5 border-2 border-dashed border-[#111827] rounded-xl">
              <span className="text-[10px] font-black tracking-wider text-[#111827] uppercase block">Sample Reports (Click to try)</span>
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                {aiPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAiTextInput(preset)}
                    className="text-[10px] text-left px-2.5 py-1.5 bg-white/70 hover:bg-white text-[#111827] font-bold rounded-lg border-2 border-[#111827]/30 hover:border-[#111827] truncate cursor-pointer transition-colors"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-[#111827] font-bold flex items-center space-x-1.5 bg-white/50 border-2 border-[#111827]/30 rounded-lg px-2.5 py-1">
                <Clock className="w-3.5 h-3.5 text-[#111827] shrink-0" />
                <span>Selected: {selectedDate.split('-').reverse().join('/')}</span>
              </div>
              <button
                type="button"
                onClick={() => handleAIExtract(aiTextInput)}
                disabled={isExtracting || !aiTextInput.trim()}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3.5 bg-[#FACC15] hover:bg-[#EAB308] disabled:bg-slate-300 disabled:border-slate-400 disabled:shadow-none text-[#111827] text-xs font-black uppercase rounded-2xl border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] cursor-pointer transition-all hover:scale-102"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Process text with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Output Matches */}
          {aiSuggestions.length > 0 && (
            <div className="mt-4 p-4 bg-[#FEFCE8] border-4 border-[#111827] rounded-2xl space-y-2.5 shadow-[4px_4px_0px_0px_#111827]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#111827] flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>AI EXTRACTION MATCHES ({aiSuggestions.length})</span>
                </span>
                <span className="text-[9px] font-black text-[#111827]/60 font-mono tracking-widest uppercase">MATCHED ROSTER</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {aiSuggestions.map((match, i) => {
                  const studentDetails = students.find(s => s.registerNumber === match.registerNumber);
                  return (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-white border-2 border-[#111827] rounded-xl text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className="truncate pr-1">
                        <p className="font-black text-[#111827] truncate">{studentDetails?.name || match.inputNameMatched}</p>
                        <p className="font-mono text-[9px] text-[#111827]/50 font-bold">{match.registerNumber}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-black bg-[#2DD4BF] text-[#111827] border border-[#111827] shrink-0">
                        {Math.round(match.confidenceScore * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Interactive Attendance Sheet Uploader */}
        <div className="bg-[#FACC15] text-[#111827] border-4 border-[#111827] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#854D0E] dark:shadow-[8px_8px_0px_0px_#111827] flex flex-col justify-between" id="file-uploader-card">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white border-2 border-[#111827] rounded-2xl -rotate-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                <Upload className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl text-[#111827] leading-tight">SPREADSHEET UPLOADER</h2>
                <p className="text-xs font-bold text-[#111827]/70">Drop roster files directly to map absent lists instantly</p>
              </div>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-4 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 text-center cursor-pointer min-h-[174px] transition-colors bg-white/80 ${
                dragActive ? "border-[#FB7185] bg-[#FB7185]/10 animate-pulse" : "border-[#111827]"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={fileSelected}
                accept=".csv,.txt"
                className="hidden"
              />
              <div className="p-3 bg-white border-2 border-[#111827] rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#111827]">
                <FileText className="w-8 h-8 text-[#6366F1]" />
              </div>
              <div className="space-y-1 px-2">
                <p className="text-xs font-black text-[#111827] uppercase leading-snug">
                  Drag & drop spreadsheet here, or <span className="text-[#6366F1] underline decoration-2 cursor-pointer">browse file</span>
                </p>
                <p className="text-[10px] font-bold text-[#111827]/60">Supports standard CSV & Plain Text registry formats</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 p-3 bg-[#FB7185] text-white border-2 border-[#111827] rounded-2xl text-[10px] mt-4 leading-relaxed shadow-[3px_3px_0px_0px_#111827]">
            <AlertCircle className="w-4 h-4 shrink-0 text-white fill-[#111827]" />
            <span>
              <strong>BROADCAST WARNING:</strong> Live submission auto-dispatches alert payloads instantly to corresponding guardians’ phone channels.
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Attendance Toggle & Active parent broadcast tracker */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Attendance Listing Toggle Columns (Span 2) */}
        <div className="bg-white dark:bg-slate-900 border-4 border-[#111827] dark:border-slate-800 rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#111827] dark:shadow-none xl:col-span-2 space-y-5" id="attendance-roster-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-[#111827]/10 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display font-black text-xl text-[#111827] dark:text-white uppercase leading-none">Interactive Roster Checklist</h2>
                <span className="px-2.5 py-0.5 bg-[#FACC15] text-[#111827] border-2 border-[#111827] rounded-full text-[10px] font-black uppercase font-mono">
                  {filteredStudents.length} Students
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Tap a student's card to switch between active and absent presence statuses</p>
            </div>

            {/* Date Picker */}
            <div className="flex items-center space-x-2 bg-[#FEFCE8] text-[#111827] p-2 rounded-xl border-2 border-[#111827] self-start sm:self-center">
              <Calendar className="w-4 h-4 text-[#6366F1]" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-black uppercase bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FEFCE8]/40 dark:bg-slate-850 p-2.5 border-2 border-[#111827] rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,0.05)]">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search name/roll..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-[#111827] dark:text-white dark:bg-slate-900 border-2 border-[#111827] rounded-xl focus:outline-hidden font-bold"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Department Filter */}
            <select
              className="text-xs px-3 py-1.5 bg-white text-[#111827] dark:text-gray-200 dark:bg-slate-900 border-2 border-[#111827] rounded-xl focus:outline-hidden font-bold cursor-pointer"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== "All").map((d, i) => (
                <option key={i} value={d as string}>{d as string}</option>
              ))}
            </select>

            {/* Year Filter */}
            <select
              className="text-xs px-3 py-1.5 bg-white text-[#111827] dark:text-gray-200 dark:bg-slate-900 border-2 border-[#111827] rounded-xl focus:outline-hidden font-bold cursor-pointer"
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="All">All Years</option>
              {years.filter(y => y !== "All").map((y, i) => (
                <option key={i} value={y as string}>{y as string}</option>
              ))}
            </select>
          </div>

          {/* Header actions */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-dashed border-[#111827]/10 dark:border-slate-800 pb-2">
            <div className="flex space-x-3.5">
              <button 
                type="button" 
                onClick={() => setAllStatus(true)}
                className="text-[#2DD4BF] hover:text-[#14b8a6] bg-[#111827] px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                Mark All Present
              </button>
              <button 
                type="button" 
                onClick={() => setAllStatus(false)}
                className="text-[#FB7185] hover:text-[#f43f5e] bg-[#111827] px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border border-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                Mark All Absent
              </button>
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-sans">Green = Present | Rose = Absent</span>
          </div>

          {/* Student attendance roster listing */}
          <div className="max-h-[350px] overflow-y-auto space-y-2 border-2 border-[#111827] p-2.5 rounded-2xl bg-white dark:bg-slate-950">
            {filteredStudents.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-slate-400">No students matched the active filter selection.</p>
            ) : (
              filteredStudents.map((student) => {
                const isPresent = markedPresents[student.registerNumber] !== false; // defaults value is true
                return (
                  <div
                    key={student.registerNumber}
                    onClick={() => toggleStatus(student.registerNumber)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border-2 border-[#111827] cursor-pointer transition-all hover:scale-[1.01] ${
                      isPresent
                        ? "bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 shadow-[2px_2px_0px_0px_#111827]"
                        : "bg-[#FB7185]/10 hover:bg-[#FB7185]/20 shadow-[2px_2px_0px_0px_#111827]"
                    }`}
                  >
                    <div className="flex items-center space-x-3 pr-2">
                      {isPresent ? (
                        <div className="p-1 bg-[#2DD4BF] border border-[#111827] rounded-md text-[#111827]">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                        </div>
                      ) : (
                        <div className="p-1 bg-[#FB7185] border border-[#111827] rounded-md text-white">
                          <XCircle className="w-4 h-4 shrink-0" />
                        </div>
                      )}
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{student.name}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {student.registerNumber} • {student.department} ({student.year})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 justify-end pt-2 sm:pt-0 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-800 select-none ${
                        student.attendanceRate >= 80 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          : student.attendanceRate >= 75
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400"
                          : "bg-red-150 dark:bg-red-950 text-red-800 dark:text-red-400"
                      }`}>
                        {student.attendanceRate}% Attendance
                      </span>
                      <span className={`text-[10px] font-black tracking-wider px-3.5 py-1 rounded-md border-2 border-black ${
                        isPresent 
                          ? "text-[#115E59] bg-[#2DD4BF] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" 
                          : "text-[#9F1239] bg-[#FB7185] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      }`}>
                        {isPresent ? "PRESENT" : "ABSENT"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Submit block */}
          <div className="flex justify-end pt-2 border-t-2 border-[#111827]/10 dark:border-slate-850">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleManualSubmit}
              className="flex items-center space-x-2 px-8 py-4 bg-[#FB7185] hover:bg-[#F43F5E] text-white text-xs font-black uppercase rounded-2xl border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] cursor-pointer disabled:bg-slate-300 transition-all hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>DISPATCHING OUTBOX ALERTS...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 shrink-0 text-white" />
                  <span>SUBMIT & DISPATCH LIVE ALERTS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time Parent Notification Tracker Block (Span 1) */}
        <div className="bg-[#6366F1] text-white border-4 border-[#111827] rounded-[32px] p-6 shadow-[8px_8px_0px_0px_#3730A3] dark:shadow-none flex flex-col justify-between" id="broadcast-tracker-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-white/20 pb-3">
              <div>
                <h2 className="font-display font-black text-lg text-white uppercase leading-none">Instant Channels Outbox</h2>
                <p className="text-xs font-bold text-white/80 mt-1">Live simulated push, SMS & WhatsApp queues</p>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2DD4BF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2DD4BF]"></span>
              </span>
            </div>

            {/* Tracker listing */}
            <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
              {todayNotifications.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-[#111827]/10 border-2 border-dashed border-white/30 rounded-2xl">
                  <MessageSquare className="w-8 h-8 text-white/50 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-white/85 p-3 leading-relaxed">
                    No parent delivery payloads generated yet today.<br />
                    Mark individuals absent block to witness immediate auto-dispatch.
                  </p>
                </div>
              ) : (
                todayNotifications.map((notif) => {
                  return (
                    <div key={notif.id} className="p-3.5 bg-white text-[#111827] border-2 border-[#111827] rounded-2xl space-y-2 text-xs shadow-[4px_4px_0px_0px_#111827]">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="font-black text-[#111827] uppercase leading-tight">{notif.studentName}</p>
                          <p className="text-[10px] font-bold text-slate-500">Parent: {notif.parentName} ({notif.channel})</p>
                        </div>
                        {/* Status chip */}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 border ${
                          notif.status === "Delivered" 
                            ? "bg-[#2DD4BF] text-[#111827] border-[#111827]"
                            : notif.status === "Sending"
                            ? "bg-[#FACC15] text-[#111827] border-[#111827] animate-pulse"
                            : notif.status === "Failed"
                            ? "bg-[#FB7185] text-white border-[#111827]"
                            : "bg-[#6366F1] text-white border-[#111827]"
                        }`}>
                          {notif.status === "Queued" && <Clock className="w-2.5 h-2.5 animate-pulse inline mr-1 text-white" />}
                          {notif.status === "Sending" && <RefreshCw className="w-2.5 h-2.5 animate-spin inline mr-1 text-[#111827]" />}
                          {notif.status === "Delivered" && <CheckCircle2 className="w-2.5 h-2.5 inline mr-1 text-[#111827]" />}
                          {notif.status === "Failed" && <AlertCircle className="w-2.5 h-2.5 inline mr-1 text-white" />}
                          <span>{notif.status}</span>
                        </span>
                      </div>
                      <p className="text-[10px] font-bold font-sans italic text-slate-705 bg-[#FEFCE8]/80 border border-slate-350 p-2 rounded-lg leading-relaxed">
                        "{notif.message}"
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono font-bold pt-1">
                        <span className="truncate max-w-[130px]">{notif.parentContact}</span>
                        <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-white/20 mt-4 text-center">
            <span className="text-[10px] font-bold text-white/90 block leading-normal">
              Broadcasting processes automatically transition from <strong>Queued</strong> → <strong>Sending</strong> → <strong>Delivered</strong> metrics within 3 seconds.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
