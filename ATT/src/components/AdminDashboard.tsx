import React from "react";
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Send, 
  Percent, 
  Award,
  AlertTriangle,
  TrendingUp,
  Sliders,
  CheckCircle2,
  PieChart as PieIcon,
  ShieldAlert,
  Download,
  Database
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from "recharts";
import { Student, NotificationLog, DashboardStats } from "../types";

interface AdminDashboardProps {
  students: Student[];
  notifications: NotificationLog[];
  selectedDate: string;
  showToast: (msg: string, type: 'success' | 'err' | 'info') => void;
}

export default function AdminDashboard({
  students,
  notifications,
  selectedDate,
  showToast
}: AdminDashboardProps) {

  // 1. Calculate live stats for selectedDate
  const totalStudents = students.length;
  
  let presentsCount = 0;
  let absentsCount = 0;

  students.forEach(s => {
    const entry = s.history.find(h => h.date === selectedDate);
    if (entry) {
      if (entry.status === 'present') presentsCount++;
      else if (entry.status === 'absent') absentsCount++;
    } else {
      // Default to Present if untracked
      presentsCount++;
    }
  });

  const notificationCount = notifications.length;
  
  // Calculate delivery success rate (Delivered / Total * 100)
  const deliveredNotifs = notifications.filter(n => n.status === "Delivered");
  const deliveryRate = notificationCount > 0 
    ? Math.round((deliveredNotifs.length / notificationCount) * 100) 
    : 100;

  // 2. Daily Attendance Trend values (last 8 unique attendance Dates across student histories)
  const uniqueDates = Array.from(new Set(
    students.flatMap(s => s.history.map(h => h.date))
  )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).slice(-8);

  const trendData = uniqueDates.map(d_string => {
    let dayPresents = 0;
    let dayTotal = 0;
    students.forEach(s => {
      const h = s.history.find(hist => hist.date === d_string);
      if (h) {
        dayTotal++;
        if (h.status === 'present') dayPresents++;
      }
    });
    // Format date as "15 Jun" 
    const dateObj = new Date(d_string);
    const label = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const percent = dayTotal > 0 ? Math.round((dayPresents / dayTotal) * 100) : 100;
    return { name: label, Rate: percent };
  });

  // 3. Attendance Rates by department
  const depts = Array.from(new Set(students.map(s => s.department)));
  const departmentData = depts.map(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    const avg = deptStudents.reduce((sum, s) => sum + s.attendanceRate, 0) / deptStudents.length;
    // Map full names to shorter acronyms for layout rendering
    let shortName = dept;
    if (dept.includes("Computer Science")) shortName = "CSE";
    else if (dept.includes("Electronics")) shortName = "ECE";
    else if (dept.includes("Mechanical")) shortName = "Mech";
    else if (dept.includes("Information Technology")) shortName = "IT";
    else if (dept.includes("Electrical")) shortName = "EEE";

    return {
      name: shortName,
      Rate: Math.round(avg * 10) / 10
    };
  });

  // 4. Notifications split split by channel (SMS, WhatsApp, Email, Push)
  const channels = ["SMS", "WhatsApp", "Email", "Push"];
  const COLORS = ["#10b981", "#22c55e", "#0284c7", "#f59e0b"];
  
  const channelData = channels.map(chan => {
    const count = notifications.filter(n => n.channel === chan).length;
    return { name: chan, value: count || 0 };
  }).filter(c => c.value > 0);

  // Fallback default mock data if no notifications dispatched yet
  const displayChannelData = channelData.length > 0 
    ? channelData 
    : [
        { name: "SMS", value: 10 },
        { name: "WhatsApp", value: 15 },
        { name: "Email", value: 8 },
        { name: "Push", value: 5 }
      ];

  // 5. High-Risk Student count vs Low-Risk Count
  const highRiskStudents = students.filter(s => s.attendanceRate < 75);
  const warningStudents = students.filter(s => s.attendanceRate >= 75 && s.attendanceRate < 85);
  const safeStudents = students.filter(s => s.attendanceRate >= 85);

  const riskData = [
    { name: "Danger (<75%)", value: highRiskStudents.length, color: "#ef4444" },
    { name: "Warning (75-85%)", value: warningStudents.length, color: "#f59e0b" },
    { name: "Safe (>85%)", value: safeStudents.length, color: "#10b981" }
  ];

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md border border-slate-800">
          <p>{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  // Export report handler CSV
  const handleExportCSV = () => {
    let headers = "Id,Name,Department,Year,Section,Parent Name,Parent Contact,Attendance Rate,Last Attended\n";
    let rows = students.map(s => 
      `"${s.registerNumber}","${s.name}","${s.department}","${s.year}","${s.section}","${s.parentName}","${s.parentPhone}",${s.attendanceRate}%,${s.lastAttendanceDate}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_report_${selectedDate}.csv`;
    link.click();
    showToast(`Successfully downloaded comprehensive Student Attendance registry CSV`, 'success');
  };

  return (
    <div className="space-y-8" id="admin-dashboard-view">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border-4 border-[#111827] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h2 className="font-display font-black text-[#111827] dark:text-white uppercase text-sm flex items-center space-x-1.5">
            <Sliders className="w-5 h-5 text-[#6366F1]" />
            <span>SESSION OVERVIEW: {selectedDate.split('-').reverse().join('-')}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#FACC15] hover:bg-[#EAB308] border-4 border-[#111827] text-[#111827] rounded-xl cursor-pointer shadow-[2px_2px_0px_0px_#111827] hover:scale-105 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Excel/CSV</span>
        </button>
      </div>

      {/* Grid STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        
        {/* Total enrolled */}
        <div className="bg-[#FEFCE8] text-[#111827] rounded-[24px] p-5 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] flex items-center space-x-4">
          <div className="p-3 bg-white border-2 border-[#111827] rounded-xl text-[#6366F1]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-500">Total Enrolled</span>
            <h3 className="font-display font-black text-2xl text-[#111827]">{totalStudents}</h3>
          </div>
        </div>

        {/* Present today */}
        <div className="bg-[#2DD4BF] text-[#111827] rounded-[24px] p-5 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] flex items-center space-x-4">
          <div className="p-3 bg-white border-2 border-[#111827] rounded-xl text-emerald-600">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-wider text-[#115E59]">Present Today</span>
            <h3 className="font-display font-black text-2xl text-[#115E59]">{presentsCount}</h3>
          </div>
        </div>

        {/* Absent today */}
        <div className="bg-[#FB7185] text-white rounded-[24px] p-5 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] flex items-center space-x-4">
          <div className="p-3 bg-white border-2 border-[#111827] rounded-xl text-[#FB7185]">
            <XCircle className="w-6 h-6 text-[#FB7185]" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-wider text-rose-100">Absent Today</span>
            <h3 className="font-display font-black text-2xl text-white">{absentsCount}</h3>
          </div>
        </div>

        {/* Outbox broadcasts */}
        <div className="bg-[#6366F1] text-white rounded-[24px] p-5 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] flex items-center space-x-4">
          <div className="p-3 bg-white border-2 border-[#111827] rounded-xl text-[#6366F1]">
            <Send className="w-6 h-6 text-[#6366F1]" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-wider text-indigo-100">Broadcast Alerts</span>
            <h3 className="font-display font-black text-2xl text-white">{notificationCount}</h3>
          </div>
        </div>

        {/* Live Delivery Rate */}
        <div className="bg-[#FACC15] text-[#111827] rounded-[24px] p-5 border-4 border-[#111827] shadow-[4px_4px_0px_0px_#111827] flex items-center space-x-4">
          <div className="p-3 bg-white border-2 border-[#111827] rounded-xl text-slate-800">
            <Percent className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-wider text-slate-600">Success Rate</span>
            <h3 className="font-display font-black text-2xl text-slate-900">{deliveryRate}%</h3>
          </div>
        </div>

      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trend Area Chart (Span 2) */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border-4 border-[#111827] dark:border-slate-800 shadow-[8px_8px_0px_0px_#111827] dark:shadow-none lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-black text-[#111827] dark:text-white uppercase text-base tracking-tight">Institution Attendance Rate Trend</h3>
              <p className="text-xs font-semibold text-slate-500">Average historical presence tracker</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-[#115E59] bg-[#2DD4BF] border-2 border-[#111827] p-2 rounded-xl font-bold">
              <TrendingUp className="w-4 h-4 text-[#115E59]" />
              <span>Target: 75% Min</span>
            </div>
          </div>
 
          <div className="h-[280px] w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border-2 border-[#111827]/15">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Rate" stroke="#6366F1" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Profile breakdown (Span 1) */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border-4 border-[#111827] dark:border-slate-800 shadow-[8px_8px_0px_0px_#111827] dark:shadow-none space-y-5">
          <div>
            <h3 className="font-display font-black text-[#111827] dark:text-white uppercase text-base tracking-tight">Presence Distribution</h3>
            <p className="text-xs font-semibold text-slate-500">Student categories categorized by guidelines</p>
          </div>

          {/* List display */}
          <div className="space-y-4 pt-2">
            {riskData.map((risk, index) => {
              const totalObj = risk.value;
              const ratio = totalStudents > 0 ? (totalObj / totalStudents) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-[#111827]" style={{ backgroundColor: risk.color }}></span>
                      <span className="uppercase tracking-tight">{risk.name}</span>
                    </span>
                    <span className="font-mono">{totalObj} Students ({Math.round(ratio)}%)</span>
                  </div>
                  {/* Gauge bar */}
                  <div className="w-full bg-[#FEFCE8] border-2 border-[#111827] h-4 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_#111827]/40">
                    <div 
                      className="h-full rounded-r-lg border-r-2 border-[#111827] transition-all duration-500"
                      style={{ 
                        width: `${ratio}%`,
                        backgroundColor: risk.color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Helper alert card */}
          <div className="p-4 bg-[#FB7185] text-white border-2 border-[#111827] rounded-2xl flex items-start space-x-2.5 text-[11px] leading-normal shadow-[3px_3px_0px_0px_#111827]">
            <ShieldAlert className="w-5 h-5 shrink-0 text-white fill-[#111827] mt-0.5" />
            <div>
              <strong>ACTION KEY:</strong> There are <span className="underline font-black">{highRiskStudents.length} high-risk students</span> falling below the crucial 75% boundary. Review recommendations generated by the AI Prognosis panel.
            </div>
          </div>
        </div>

      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department Comparison Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border-4 border-[#111827] dark:border-slate-800 shadow-[8px_8px_0px_0px_#111827] dark:shadow-none space-y-4">
          <div>
            <h3 className="font-display font-black text-[#111827] dark:text-white uppercase text-base tracking-tight">Department Performances</h3>
            <p className="text-xs font-semibold text-slate-500">Student attendance stats grouped across key colleges</p>
          </div>

          <div className="h-[250px] w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border-2 border-[#111827]/15">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Rate" stroke="#111827" strokeWidth={2} radius={[4, 4, 0, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.Rate >= 80 ? "#2DD4BF" : entry.Rate >= 73 ? "#FACC15" : "#FB7185"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channels Broadcast Spread Doughnut/Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border-4 border-[#111827] dark:border-slate-800 shadow-[8px_8px_0px_0px_#111827] dark:shadow-none space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-black text-[#111827] dark:text-white uppercase text-base tracking-tight">Notification Channels Spread</h3>
            <p className="text-xs font-semibold text-slate-500">Visual breakdown of parental alert communications sent today</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            <div className="h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayChannelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {displayChannelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#111827" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2 w-full">
              {displayChannelData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-2 pb-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-[#111827] rounded-xl text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="flex items-center space-x-2">
                    <span className="w-3.5 h-3.5 rounded-sm border border-black" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="font-black uppercase text-[#111827] dark:text-slate-200">{entry.name} Channel</span>
                  </span>
                  <span className="font-mono bg-white dark:bg-slate-900 border border-[#111827] px-2 py-0.5 rounded-md font-bold text-[10px] text-[#111827] dark:text-white">
                    {entry.value} Alerts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#2DD4BF] text-[#111827] border-2 border-[#111827] rounded-2xl text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <CheckCircle2 className="w-4 h-4 text-[#111827] shrink-0" />
            <span>Integrated with real SMS hubs, WhatsApp queues, and dynamic SMTP relay networks.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
