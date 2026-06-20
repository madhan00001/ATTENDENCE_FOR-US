import React, { useState, useEffect } from "react";
import { 
  Search, 
  UserPlus, 
  Edit, 
  MapPin, 
  Phone, 
  Mail, 
  GraduationCap, 
  Calendar, 
  FolderLock, 
  RefreshCw, 
  Check, 
  X, 
  Clock, 
  CheckCircle,
  FileSpreadsheet,
  Settings,
  Send,
  Server,
  Wifi,
  WifiOff,
  Key
} from "lucide-react";
import { Student, AuditLog } from "../types";

interface DatabaseRegistryProps {
  students: Student[];
  auditLogs: AuditLog[];
  onRefreshData: () => void;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
}

export default function DatabaseRegistry({
  students,
  auditLogs,
  onRefreshData,
  showToast
}: DatabaseRegistryProps) {

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  // Add student Form toggle
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    registerNumber: "",
    department: "Computer Science Engineeing",
    year: "I Year",
    section: "A",
    parentName: "",
    parentPhone: "",
    parentEmail: ""
  });

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState<Partial<Student>>({});

  // Dynamic SMTP settings & connection diagnostics states
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    source: string;
    sender: string;
    dbSettings: {
      host: string;
      port: number;
      user: string;
      sender: string;
      enabled: boolean;
    } | null;
  } | null>(null);

  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "587",
    user: "",
    pass: "",
    sender: "",
    enabled: true
  });

  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpFormVisible, setSmtpFormVisible] = useState(false);

  const fetchSmtpStatus = async () => {
    try {
      const res = await fetch("/api/smtp/status");
      const data = await res.json();
      setSmtpStatus(data);
      if (data.dbSettings) {
        setSmtpForm({
          host: data.dbSettings.host || "",
          port: String(data.dbSettings.port || 587),
          user: data.dbSettings.user || "",
          pass: "", // Keep empty initially for edit safety
          sender: data.dbSettings.sender || "",
          enabled: data.dbSettings.enabled !== false
        });
      }
    } catch (e) {
      console.warn("Failed to fetch SMTP server configuration status", e);
    }
  };

  useEffect(() => {
    fetchSmtpStatus();
  }, []);

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpForm.host.trim() || !smtpForm.user.trim()) {
      showToast("SMTP Server host address and Username are required.", "info");
      return;
    }

    setSavingSmtp(true);
    try {
      const res = await fetch("/api/smtp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Persistent SMTP Server parameters stored successfully!", "success");
        fetchSmtpStatus();
        onRefreshData(); // sync system logs
        setSmtpFormVisible(false);
      } else {
        showToast(data.error || "Failed to configure SMTP parameters.", "err");
      }
    } catch (err) {
      showToast("Network failure saving SMTP setting profile.", "err");
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    if (!testEmailAddr.trim()) {
      showToast("Please declare a recipient email to dispatch the diagnostic test page.", "info");
      return;
    }

    setTestingSmtp(true);
    showToast("Opening socket link and firing test SMTP packet...", "info");

    try {
      const res = await fetch("/api/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail: testEmailAddr.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("SMTP diagnostics verified: Email sent successfully!", "success");
        setTestEmailAddr("");
        fetchSmtpStatus();
        onRefreshData(); // update logs list
      } else {
        showToast(data.error || "Connection/auth test failed. Verify details.", "err");
      }
    } catch (err) {
      showToast("Could not communicate with SMTP backend daemon.", "err");
    } finally {
      setTestingSmtp(false);
    }
  };

  // Form submission
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.registerNumber.trim()) {
      showToast("Please provide both Name and Register Number.", "info");
      return;
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Student ${newStudent.name} enrolled successfully!`, "success");
        // Reset form
        setNewStudent({
          name: "",
          registerNumber: "",
          department: "Computer Science Engineeing",
          year: "I Year",
          section: "A",
          parentName: "",
          parentPhone: "",
          parentEmail: ""
        });
        setShowAddForm(false);
        onRefreshData();
      } else {
        showToast(data.error || "Failed to add student.", "err");
      }
    } catch (e) {
      showToast("Network failure adding student.", "err");
    }
  };

  // Flip student into edit mode
  const startEditing = (student: Student) => {
    setEditingId(student.id);
    setEditingFields({
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail
    });
  };

  // Save student modifications
  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingFields)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Student details updated successfully!", "success");
        setEditingId(null);
        onRefreshData();
      } else {
        showToast(data.error || "Failed to update details.", "err");
      }
    } catch (e) {
      showToast("Network error saving student details.", "err");
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingFields({});
  };

  // Unique directories lists for filters
  const departments = ["All", ...Array.from(new Set(students.map(s => s.department)))];
  const years = ["All", ...Array.from(new Set(students.map(s => s.year)))];

  const filtered = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(query) || s.registerNumber.toLowerCase().includes(query);
    const matchDept = deptFilter === "All" || s.department === deptFilter;
    const matchYear = yearFilter === "All" || s.year === yearFilter;
    return matchSearch && matchDept && matchYear;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8" id="database-registry-view">
      
      {/* Student List & Add Forms (Span 3) */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* Controls row */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search students directory by name or register roll..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-705 dark:text-slate-100"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-slate-350 focus:outline-hidden cursor-pointer"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              {departments.filter(d => d !== "All").map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>

            <select
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl dark:text-slate-355 focus:outline-hidden cursor-pointer"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
            >
              <option value="All">All Years</option>
              {years.filter(y => y !== "All").map((y, i) => (
                <option key={i} value={y}>{y}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll Student</span>
            </button>
          </div>
        </div>

        {/* Add Student Card Form (Expandable) */}
        {showAddForm && (
          <form onSubmit={handleAddStudent} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-500/20 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm">Enroll New Student Card</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madhan Raj"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.name}
                  onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Register Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-2026-025"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.registerNumber}
                  onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Engineeing"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.department}
                  onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Year</label>
                <select
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.year}
                  onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                >
                  <option value="I Year">I Year</option>
                  <option value="II Year">II Year</option>
                  <option value="III Year">III Year</option>
                  <option value="IV Year">IV Year</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Section</label>
                <input
                  type="text"
                  placeholder="A"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.section}
                  onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sundar Raj"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.parentName}
                  onChange={e => setNewStudent({ ...newStudent, parentName: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 94454 11223"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.parentPhone}
                  onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Parent Email Address</label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden text-slate-800 dark:text-slate-200"
                  value={newStudent.parentEmail}
                  onChange={e => setNewStudent({ ...newStudent, parentEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Enroll student
              </button>
            </div>
          </form>
        )}

        {/* Directory cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-100 p-12 rounded-2xl text-center text-slate-400">No students matching roster directory files is present.</div>
          ) : (
            filtered.map((student) => {
              const isEditing = editingId === student.id;
              
              return (
                <div key={student.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 relative">
                  
                  {/* Top: Student General details */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        {isEditing ? (
                          <input
                            type="text"
                            className="text-xs px-2 py-0.5 border border-slate-300 dark:border-slate-700 rounded-md font-bold dark:bg-slate-800 dark:text-slate-100"
                            value={editingFields.name || ""}
                            onChange={e => setEditingFields({ ...editingFields, name: e.target.value })}
                          />
                        ) : (
                          <h4 className="font-display font-medium text-slate-800 dark:text-slate-100">{student.name}</h4>
                        )}
                        <p className="font-mono text-[9px] text-slate-400 bg-slate-50 dark:bg-slate-950 inline-block px-1.5 py-0.5 rounded-md mt-1">{student.id}</p>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block leading-relaxed border ${
                          student.attendanceRate >= 80 
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100" 
                            : student.attendanceRate >= 75
                            ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-100"
                            : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-100"
                        }`}>
                          {student.attendanceRate}% Attendance
                        </span>
                      </div>
                    </div>

                    {/* Department, Year, Section */}
                    {isEditing ? (
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <input
                          type="text"
                          placeholder="Dept"
                          className="px-1 border border-slate-350 rounded-sm dark:bg-slate-800"
                          value={editingFields.department || ""}
                          onChange={e => setEditingFields({ ...editingFields, department: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Year"
                          className="px-1 border border-slate-350 rounded-sm dark:bg-slate-800"
                          value={editingFields.year || ""}
                          onChange={e => setEditingFields({ ...editingFields, year: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Section"
                          className="px-1 border border-slate-350 rounded-sm dark:bg-slate-800"
                          value={editingFields.section || ""}
                          onChange={e => setEditingFields({ ...editingFields, section: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{student.department} • {student.year} Sec {student.section}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle: Parent Contacts */}
                  <div className="border-t border-slate-50 dark:border-slate-800/60 pt-3 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-750 dark:text-slate-300">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-405 font-medium uppercase font-sans">Parent:</span>&nbsp;
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Parent Name"
                            className="text-xs px-1 border border-slate-350 rounded-sm dark:bg-slate-800 h-5"
                            value={editingFields.parentName || ""}
                            onChange={e => setEditingFields({ ...editingFields, parentName: e.target.value })}
                          />
                        ) : (
                          <strong className="text-slate-700 dark:text-slate-200">{student.parentName}</strong>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-405 font-medium uppercase font-sans">Phone:</span>&nbsp;
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Parent Phone"
                            className="text-xs px-1 border border-slate-350 rounded-sm dark:bg-slate-800 h-5"
                            value={editingFields.parentPhone || ""}
                            onChange={e => setEditingFields({ ...editingFields, parentPhone: e.target.value })}
                          />
                        ) : (
                          <span className="font-mono text-slate-700 dark:text-slate-300">{student.parentPhone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-405 font-medium uppercase font-sans">Email:</span>&nbsp;
                        {isEditing ? (
                          <input
                            type="email"
                            placeholder="Parent Email"
                            className="text-xs px-1 border border-slate-350 rounded-sm dark:bg-slate-800 h-5"
                            value={editingFields.parentEmail || ""}
                            onChange={e => setEditingFields({ ...editingFields, parentEmail: e.target.value })}
                          />
                        ) : (
                          <span className="font-sans text-slate-700 dark:text-slate-300">{student.parentEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom details card: actions & last attended */}
                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/60 pt-3 text-[10px] text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>Last Seen: {student.lastAttendanceDate ? student.lastAttendanceDate.split('-').reverse().join('/') : "Never"}</span>
                    </div>

                    {isEditing ? (
                      <div className="flex space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(student.id)}
                          className="flex items-center space-x-0.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[9px] cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>SAVE</span>
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="flex items-center space-x-0.5 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-350 rounded-md font-bold text-[9px] cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          <span>CLOSE</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(student)}
                        className="flex items-center space-x-1 px-2.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 font-semibold"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit Details</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* SMTP Configuration and Diagnostics Console */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-900 dark:border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#FACC15] space-y-6" id="smtp-admin-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-4 gap-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rotate-1">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight uppercase">SMTP Parent Email Configuration</h3>
                <p className="text-[10px] font-semibold text-slate-500">Dispatch live absence alerts to custom recipient guardian emails</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSmtpFormVisible(!smtpFormVisible)}
              className="px-4 py-2 bg-[#FACC15] hover:bg-[#EAB308] border-2 border-[#111827] text-slate-900 font-bold text-[10px] rounded-xl cursor-pointer flex items-center space-x-1.5 uppercase transition-all shadow-[2px_2px_0px_0px_#111827]"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{smtpFormVisible ? "Close Credentials Form" : "Edit SMTP Server Config"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Left Column: Diagnostics status & Quick Testing */}
            <div className="bg-[#FEFCE8]/40 dark:bg-slate-950 p-5 rounded-2xl border-2 border-[#111827] space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest">Gateway status & Diagnostics</h4>
              
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-[#111827]">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#111827] ${smtpStatus?.configured ? "bg-[#2DD4BF]" : "bg-[#FB7185]"}`}>
                    <Server className="w-4 h-4 text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-400">SMTP Active Mode</p>
                    <p className="text-xs font-black text-slate-900 dark:text-slate-205">
                      {smtpStatus?.configured ? "ONLINE (Direct Dispatch)" : "OFFLINE (Simulated Alerts Only)"}
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-black uppercase border-2 border-[#111827] ${
                  smtpStatus?.configured ? "bg-[#2DD4BF] text-slate-900" : "bg-[#FB7185] text-white"
                }`}>
                  {smtpStatus?.configured ? "Live" : "Mock"}
                </span>
              </div>

              {smtpStatus?.configured && (
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-[#111827] text-[10px] text-slate-600 dark:text-slate-400 font-mono space-y-1">
                  <p><strong>Configured Source:</strong> <span className="text-[#6366F1] font-bold">{smtpStatus.source}</span></p>
                  <p className="truncate"><strong>Authorized User:</strong> {smtpStatus.sender}</p>
                </div>
              )}

              {/* Direct SMTP test */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest block">Send Connection Test Frame</p>
                <div className="flex gap-2.5">
                  <input
                    type="email"
                    placeholder="Enter email e.g. you@example.com"
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-xl focus:outline-hidden text-slate-900 dark:text-slate-200 h-9"
                    value={testEmailAddr}
                    onChange={(e) => setTestEmailAddr(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={testingSmtp}
                    onClick={handleTestSmtpConnection}
                    className="px-4 bg-emerald-500 hover:bg-emerald-400 border-2 border-[#111827] text-slate-900 font-black text-xs rounded-xl cursor-pointer shadow-[2px_2px_0px_0px_#111827] whitespace-nowrap h-9 flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {testingSmtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-900" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Receiving the diagnostic message confirms your credentials can establish a socket tunnel through the serverless container and out through security rules.
                </p>
              </div>

            </div>

            {/* Right Column: Information Context or Form */}
            <div className="space-y-4">
              {smtpFormVisible ? (
                <form onSubmit={handleSaveSmtpSettings} className="bg-[#FEFCE8]/40 dark:bg-slate-950 p-5 rounded-2xl border-2 border-[#111827] space-y-3.5">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest">Configure SMTP Parameters</h4>
                  
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider block">SMTP Server Host</label>
                      <input
                        type="text"
                        required
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-lg text-slate-900 dark:text-slate-250 focus:outline-hidden"
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-455 dark:text-slate-400 uppercase tracking-wider block">Port</label>
                      <input
                        type="number"
                        required
                        placeholder="587"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-lg text-slate-900 dark:text-slate-250 focus:outline-hidden"
                        value={smtpForm.port}
                        onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-455 dark:text-slate-400 uppercase tracking-wider block">Username / Account Email</label>
                    <input
                      type="text"
                      required
                      placeholder="institution-alerts@example.com"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-lg text-slate-900 dark:text-slate-250 focus:outline-hidden"
                      value={smtpForm.user}
                      onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                      <label className="font-black text-slate-455 dark:text-slate-400 uppercase tracking-wider">App Password / Passkey</label>
                      <span className="text-[8px] text-indigo-500 font-bold font-mono">Stored on Server Side Only</span>
                    </div>
                    <input
                      type="password"
                      placeholder={smtpStatus?.configured ? "•••••••••••• (Leave blank to keep current password)" : "Enter SMTP Password or App Passkey"}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden"
                      value={smtpForm.pass}
                      onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-455 dark:text-slate-400 uppercase tracking-wider block">Display Sender Name</label>
                      <input
                        type="text"
                        placeholder="Absentees Portal"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border-2 border-[#111827] rounded-lg text-slate-900 dark:text-slate-250 focus:outline-hidden"
                        value={smtpForm.sender}
                        onChange={(e) => setSmtpForm({ ...smtpForm, sender: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center space-x-2.5 text-xs text-slate-900 dark:text-slate-300 font-black uppercase cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-2 border-[#111827] text-emerald-600 focus:ring-emerald-500"
                          checked={smtpForm.enabled}
                          onChange={(e) => setSmtpForm({ ...smtpForm, enabled: e.target.checked })}
                        />
                        <span>Enable Real Email</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-dashed border-[#111827]/30 dark:border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setSmtpFormVisible(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border-2 border-[#111827] rounded-xl text-slate-900 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingSmtp}
                      className="px-5 py-2 bg-[#6366F1] hover:bg-[#4f46e5] border-2 border-[#111827] text-white text-xs font-black uppercase rounded-xl cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_#111827]"
                    >
                      {savingSmtp ? "Saving..." : "Save Config"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-[#FEFCE8]/40 dark:bg-slate-950 p-5 rounded-2xl border-2 border-[#111827] space-y-4 h-full flex flex-col justify-center">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-[#6366F1]">
                      <Key className="w-5 h-5 shrink-0" />
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-slate-200">Gmail App Password setup instructions</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      If you are leveraging a personal or institutional Google account (Gmail/Workspace), standard passwords will be blocked. Follow these steps:
                    </p>
                    <ol className="list-decimal list-inside text-[10px] text-slate-550 dark:text-slate-400 font-sans space-y-1.5 pl-1 leading-relaxed">
                      <li>Enable <strong>2-Step Verification</strong> on your Google Account safety hub.</li>
                      <li>Search for <strong>"App Passwords"</strong> or visit <em>myaccount.google.com/apppasswords</em>.</li>
                      <li>Select "Other (Custom name)" and input <strong>Absentees Portal</strong>.</li>
                      <li>Click generate, then paste the resulting <strong>16-character passkey</strong> directly into the password field.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Live System Audit Logs Panel (Span 1) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-xs h-fit" id="audit-logs-card">
        <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <FolderLock className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-sm">Institution Audit Trail</h3>
            <p className="text-[10px] text-slate-400">Cryptographically ordered, read-only system actions</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-400">Audit logs ledger history empty.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="space-y-1.5 text-xs border-l-2 border-slate-100 dark:border-slate-800 pl-3 relative">
                {/* Visual marker dot */}
                <div className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`px-1.5 py-0.2 rounded-sm uppercase font-mono tracking-wider font-bold ${
                    log.user === 'Teacher' 
                      ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-400" 
                      : log.user === 'Admin'
                      ? "bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-450"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {log.user}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-[10px]">{log.action}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/65 p-2 rounded-md font-sans">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
