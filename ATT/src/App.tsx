import React, { useState, useEffect } from "react";
import { 
  Users, 
  Sparkles, 
  Sliders, 
  FolderLock, 
  Sun, 
  Moon, 
  HelpCircle, 
  CheckCircle,
  Database,
  Radio,
  FileSpreadsheet,
  AlertOctagon,
  Sparkle,
  RefreshCw
} from "lucide-react";
import TeacherDashboard from "./components/TeacherDashboard";
import AdminDashboard from "./components/AdminDashboard";
import SmartAnalytics from "./components/SmartAnalytics";
import DatabaseRegistry from "./components/DatabaseRegistry";
import { Student, NotificationLog, AuditLog } from "./types";

export default function App() {
  // App-wide Tab View (teacher | admin | ai | directory)
  const [activeTab, setActiveTab] = useState<"teacher" | "admin" | "ai" | "directory">("teacher");

  // Dark/Light Mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("absence_system_theme");
    return saved ? saved === "dark" : false;
  });

  // Global State parsed from Express backend
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected date defaults to today "2026-06-20"
  const [selectedDate, setSelectedDate] = useState("2026-06-20");

  // Checking missing API keys
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Custom visual toast alerts state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'err' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Toggle Dark theme Class
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem("absence_system_theme", next ? "dark" : "light");
      return next;
    });
  };

  // Sync dark class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Load all data from API Routes
  const fetchAllData = async () => {
    try {
      const pStudents = fetch("/api/students").then(res => res.json());
      const pNotifications = fetch("/api/notifications").then(res => res.json());
      const pLogs = fetch("/api/logs").then(res => res.json());

      const [stData, noData, loData] = await Promise.all([pStudents, pNotifications, pLogs]);
      setStudents(stData || []);
      setNotifications(noData || []);
      setAuditLogs(loData || []);
    } catch (e) {
      console.warn("Error fetching state data from API", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial on load
  useEffect(() => {
    fetchAllData();

    // Setup live polling every 3 seconds to catch background notification delivery status changes!
    const interval = setInterval(() => {
      fetchAllData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Clear log helpers
  const handleClearNotificationsLog = async () => {
    try {
      const res = await fetch("/api/notifications/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Cleared outbound delivery outbox history successfully", "success");
        fetchAllData();
      }
    } catch (e) {
      showToast("Failed to clear notifications logs", "err");
    }
  };

  const handleClearLocalData = () => {
    localStorage.removeItem("absence_system_theme");
    showToast("Local cache reset successfully", "info");
  };

  return (
    <div className="min-h-screen font-sans bg-[#FEFCE8] dark:bg-[#111827] flex flex-col justify-between transition-colors duration-200">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-5 py-4 rounded-2xl border-4 border-[#111827] dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#FACC15] animate-bounce ${
            toast.type === 'success' 
              ? 'bg-[#2DD4BF] text-[#111827]' 
              : toast.type === 'err'
              ? 'bg-[#FB7185] text-white'
              : 'bg-[#6366F1] text-white'
          }`}
          style={{ minWidth: '320px' }}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-white fill-[#111827]" />
          ) : (
            <AlertOctagon className="w-5 h-5 shrink-0 text-white fill-[#111827]" />
          )}
          <p className="text-xs font-black uppercase tracking-tight">{toast.msg}</p>
        </div>
      )}

      {/* Main Core Content Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Header Branding Row - BLOOM Inspired Layout */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-4 border-[#111827]/10 dark:border-white/10 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#6366F1] rounded-2xl flex items-center justify-center rotate-3 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] dark:border-white dark:shadow-[4px_4px_0px_0px_#FACC15] shrink-0">
              <Sparkle className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-black text-3xl tracking-tight text-[#111827] dark:text-white uppercase leading-none">
                  Absentees Hub
                </h1>
                <span className="px-3 py-1 bg-[#2DD4BF] text-[#111827] font-mono font-black text-[10px] rounded-full border-2 border-[#111827] uppercase tracking-wider -rotate-2">
                  AI v3.5 LIVE
                </span>
              </div>
              <p className="text-xs font-bold text-[#111827]/60 dark:text-slate-400 mt-1.5 max-w-lg">
                Real-time class presence extraction & parents alert broadcasting channel.
              </p>
            </div>
          </div>

          {/* Theme & Meta widgets */}
          <div className="flex items-center space-x-3 self-end sm:self-center">
            
            {/* Live syncing status indicator */}
            <div className="flex items-center space-x-2 px-3.5 py-2 bg-[#ffffff] dark:bg-[#1e293b] border-4 border-[#111827] dark:border-slate-850 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FB7185] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FB7185]"></span>
              </span>
              <span className="text-[10px] font-black text-[#111827] dark:text-slate-300 font-mono uppercase tracking-widest">LIVE SYNC</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 bg-[#FACC15] hover:bg-[#EAB308] border-4 border-[#111827] rounded-xl text-[#111827] shadow-[2px_2px_0px_0px_#111827] dark:shadow-none transition-all cursor-pointer hover:scale-105"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-slate-900 fill-slate-900" /> : <Moon className="w-4 h-4 text-slate-900 fill-slate-900" />}
            </button>
          </div>
        </header>

        {/* Tab switch row */}
        <nav className="flex flex-wrap gap-2 bg-[#111827]/5 dark:bg-[#1e293b]/50 p-2 rounded-3xl border-4 border-[#111827] dark:border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)] dark:shadow-none overflow-x-auto">
          <button
            onClick={() => setActiveTab("teacher")}
            className={`flex items-center space-x-2 px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-2 ${
              activeTab === "teacher"
                ? "bg-[#6366F1] text-white border-[#111827] shadow-[4px_4px_0px_0px_#111827]"
                : "text-[#111827]/70 dark:text-slate-400 border-transparent hover:text-[#111827] hover:bg-white/50 dark:hover:bg-[#111827]"
            }`}
            style={{ minHeight: "44px" }}
          >
            <Radio className="w-4 h-4 shrink-0" />
            <span>Teacher Console</span>
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`flex items-center space-x-2 px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-2 ${
              activeTab === "admin"
                ? "bg-[#FB7185] text-white border-[#111827] shadow-[4px_4px_0px_0px_#111827]"
                : "text-[#111827]/70 dark:text-slate-400 border-transparent hover:text-[#111827] hover:bg-white/50 dark:hover:bg-[#111827]"
            }`}
            style={{ minHeight: "44px" }}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Admin Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center space-x-2 px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-2 ${
              activeTab === "ai"
                ? "bg-[#2DD4BF] text-[#111827] border-[#111827] shadow-[4px_4px_0px_0px_#111827]"
                : "text-[#111827]/70 dark:text-slate-400 border-transparent hover:text-[#111827] hover:bg-white/50 dark:hover:bg-[#111827]"
            }`}
            style={{ minHeight: "44px" }}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Prognosis (AI)</span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center space-x-2 px-6 py-3 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer border-2 ${
              activeTab === "directory"
                ? "bg-[#FACC15] text-[#111827] border-[#111827] shadow-[4px_4px_0px_0px_#111827]"
                : "text-[#111827]/70 dark:text-slate-400 border-transparent hover:text-[#111827] hover:bg-white/50 dark:hover:bg-[#111827]"
            }`}
            style={{ minHeight: "44px" }}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Students Registry</span>
          </button>
        </nav>

        {/* Tab content renderer block */}
        <main className="space-y-6">
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 border border-slate-100 dark:border-slate-800 text-center space-y-4">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">Retrieving Student attendance catalogs...</p>
            </div>
          ) : (
            <>
              {activeTab === "teacher" && (
                <TeacherDashboard
                  students={students}
                  notifications={notifications}
                  onRefreshData={fetchAllData}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  showToast={showToast}
                />
              )}

              {activeTab === "admin" && (
                <AdminDashboard
                  students={students}
                  notifications={notifications}
                  selectedDate={selectedDate}
                  showToast={showToast}
                />
              )}

              {activeTab === "ai" && (
                <SmartAnalytics
                  students={students}
                  showToast={showToast}
                />
              )}

              {activeTab === "directory" && (
                <DatabaseRegistry
                  students={students}
                  auditLogs={auditLogs}
                  onRefreshData={fetchAllData}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>

      </div>

      {/* Styled Footer Block */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 py-6 border-t border-slate-150 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
        <div>
          <p>© 2026 Absentees Notification Hub • All rights reserved.</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            type="button" 
            onClick={handleClearNotificationsLog}
            className="hover:text-emerald-500 font-semibold cursor-pointer underline"
          >
            Clear Outbound Alerts Log
          </button>
          <button 
            type="button" 
            onClick={handleClearLocalData}
            className="hover:text-amber-500 font-semibold cursor-pointer underline"
          >
            Reset Theme Preferences
          </button>
        </div>
      </footer>
    </div>
  );
}
