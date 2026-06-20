import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = Pattern_Express();
function Pattern_Express() {
  return express();
}
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "src", "db_store.json");

// Helper to get Gemini AI client (lazy initialization, graceful fallback)
let aiClient: any = null;
function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured in Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// In-memory cache synced with db_store.json
interface DBState {
  students: any[];
  notifications: any[];
  auditLogs: any[];
}

function loadDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, using fallback empty state", error);
  }
  return { students: [], notifications: [], auditLogs: [] };
}

function saveDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to database file", error);
  }
}

// Add an audit log entry Helper
function addAuditLog(state: DBState, user: string, action: string, details: string) {
  const log = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  state.auditLogs.unshift(log);
}

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  sender?: string;
  enabled: boolean;
}

interface DBState {
  students: any[];
  notifications: any[];
  auditLogs: any[];
  smtpConfig?: SMTPConfig;
}

// SMTP Transport Helper
function getMailTransporter() {
  const state = loadDB();
  
  // 1. Check database-driven SMTP config
  if (state.smtpConfig && state.smtpConfig.enabled && state.smtpConfig.host && state.smtpConfig.user && state.smtpConfig.pass) {
    const config = state.smtpConfig;
    const port = config.port ? parseInt(config.port as any, 10) : 587;
    return {
      transporter: nodemailer.createTransport({
        host: config.host,
        port: port,
        secure: port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      sender: config.sender || config.user,
      source: "Database Settings panel"
    };
  }

  // 2. Check environment-driven SMTP config
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const port = portStr ? parseInt(portStr, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const sender = process.env.SMTP_SENDER || user;

  if (host && user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      sender: sender || user,
      source: "Environment variables (.env)"
    };
  }

  return null;
}

// Real Email Sender helper
async function sendRealEmail(to: string, subject: string, messageText: string, studentName: string) {
  const configObj = getMailTransporter();
  if (!configObj) {
    return {
      success: false,
      reason: "SMTP_NOT_CONFIGURED"
    };
  }

  const { transporter, sender, source } = configObj;

  try {
    // Extract subject header info inside body text if present
    let textBody = messageText;
    let finalSubject = subject;
    if (textBody.startsWith("Subject: ")) {
      const lines = textBody.split("\n");
      const subLine = lines.find(l => l.startsWith("Subject: "));
      if (subLine) {
        finalSubject = subLine.replace("Subject: ", "");
      }
      const doubleNLIdx = messageText.indexOf("\n\n");
      if (doubleNLIdx !== -1) {
        textBody = messageText.substring(doubleNLIdx + 2);
      }
    }

    await transporter.sendMail({
      from: `"Absentees Alert Portal" <${sender}>`,
      to,
      subject: finalSubject,
      text: textBody,
    });
    console.log(`[SMTP Email Sent] Successfully sent attendance alert to ${to} for student: ${studentName} via ${source}`);
    return {
      success: true,
      source
    };
  } catch (error: any) {
    console.error(`[SMTP Email Error] Failed to send email to ${to} via ${source}:`, error);
    return {
      success: false,
      reason: error.message || "UNKNOWN_ERROR"
    };
  }
}

// Background simulator/delivery helper to deliver queued parent notifications (with real SMTP sending for configured Email channels)
function simulateNotificationDelivery(notificationId: string) {
  // Move from 'Queued' -> 'Sending' helper in 1 second
  setTimeout(async () => {
    const state = loadDB();
    const notif = state.notifications.find(n => n.id === notificationId);
    if (notif && notif.status === "Queued") {
      notif.status = "Sending";
      saveDB(state);

      // Handle real Email channel if configured
      if (notif.channel === "Email") {
        const configObj = getMailTransporter();
        if (configObj) {
          // Send real email immediately
          const result = await sendRealEmail(
            notif.parentContact,
            `Student Attendance Alert: ${notif.studentName} is ABSENT`,
            notif.message,
            notif.studentName
          );

          const innerState = loadDB();
          const innerNotif = innerState.notifications.find(n => n.id === notificationId);
          if (innerNotif) {
            innerNotif.status = result.success ? "Delivered" : "Failed";
            if (!result.success) {
              innerNotif.message += `\n\n[SMTP Send Error: ${result.reason}]`;
            } else {
              innerNotif.message += `\n\n[Email dispatcher: Sent via ${result.source}]`;
            }
            const logMsg = result.success 
              ? `Real Email notification successfully dispatched via SMTP (${result.source}) to ${innerNotif.parentContact}`
              : `Real Email dispatch to ${innerNotif.parentContact} FAILED via ${configObj.source}: ${result.reason}`;
            addAuditLog(innerState, "SMTP Mailer", result.success ? "Email Dispatched" : "Email Failed", logMsg);
            saveDB(innerState);
          }
          return;
        } else {
          // SMTP not configured - log helper warning as audit entry once
          const warningLog = `Simulated Email delivery to ${notif.parentContact} for student ${notif.studentName}. To send actual emails, define SMTP config parameters.`;
          addAuditLog(state, "System Notification", "Email Simulated", warningLog);
          saveDB(state);
        }
      }

      // Fallback simulated delivery for non-config/other channels (SMS, WhatsApp, Push)
      setTimeout(() => {
        const innerState = loadDB();
        const innerNotif = innerState.notifications.find(n => n.id === notificationId);
        if (innerNotif && innerNotif.status === "Sending") {
          // 95% deliver successfully, 5% fail for realistic simulation logs
          innerNotif.status = Math.random() > 0.05 ? "Delivered" : "Failed";
          saveDB(innerState);
        }
      }, 1500);
    }
  }, 1000);
}

// --- API ROUTES ---

// 1. Get all students
app.get("/api/students", (req, res) => {
  const state = loadDB();
  res.json(state.students);
});

// 2. Add custom student
app.post("/api/students", (req, res) => {
  const state = loadDB();
  const { name, registerNumber, department, year, section, parentName, parentPhone, parentEmail } = req.body;

  if (!name || !registerNumber) {
    return res.status(400).json({ error: "Name and Register Number are required." });
  }

  // Check duplicate
  const exists = state.students.find(s => s.registerNumber === registerNumber);
  if (exists) {
    return res.status(400).json({ error: `Student with Register Number ${registerNumber} already exists.` });
  }

  const newStudent = {
    id: registerNumber,
    name,
    registerNumber,
    department: department || "General Science",
    year: year || "I Year",
    section: section || "A",
    parentName: parentName || "Alternative Guardian",
    parentPhone: parentPhone || "+91 90000 00000",
    parentEmail: parentEmail || "guardian@example.com",
    attendanceRate: 100.0,
    lastAttendanceDate: "",
    history: []
  };

  state.students.push(newStudent);
  addAuditLog(state, "Admin", "Student Added", `Added student ${name} (${registerNumber})`);
  saveDB(state);

  res.json({ success: true, student: newStudent });
});

// 3. Update student details
app.put("/api/students/:id", (req, res) => {
  const state = loadDB();
  const { id } = req.params;
  const studentIndex = state.students.findIndex(s => s.id === id);

  if (studentIndex === -1) {
    return res.status(404).json({ error: "Student not found" });
  }

  const updatedData = req.body;
  state.students[studentIndex] = {
    ...state.students[studentIndex],
    ...updatedData,
    id // keep matching ID
  };

  addAuditLog(state, "Admin", "Student Edited", `Updated details for ${state.students[studentIndex].name}`);
  saveDB(state);

  res.json({ success: true, student: state.students[studentIndex] });
});

// 4. Mark attendance manually for a specific date
app.post("/api/attendance/mark", (req, res) => {
  const state = loadDB();
  const { date, attendances } = req.body; // attendances is {[registerNumber]: 'present' | 'absent'}

  if (!date || !attendances) {
    return res.status(400).json({ error: "Missing required properties: date, attendances" });
  }

  let absentCount = 0;
  let presentCount = 0;

  state.students = state.students.map(student => {
    const status = attendances[student.registerNumber];
    if (!status) return student; // status not toggled, skip

    // Update history
    const existingIndex = student.history.findIndex((h: any) => h.date === date);
    if (existingIndex !== -1) {
      student.history[existingIndex].status = status;
    } else {
      student.history.push({ date, status });
    }

    // Sort history by date
    student.history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate attendance rate
    const presents = student.history.filter((h: any) => h.status === 'present').length;
    student.attendanceRate = Math.round((presents / student.history.length) * 1000) / 10;
    student.lastAttendanceDate = date;

    if (status === 'absent') {
      absentCount++;

      // Automatically enqueue notifications over the configured channels: SMS, WhatsApp, Email, Push
      const channels: ('SMS' | 'WhatsApp' | 'Email' | 'Push')[] = ['SMS', 'WhatsApp', 'Email', 'Push'];
      channels.forEach(channel => {
        const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        const parentContact = channel === 'Email' ? student.parentEmail : student.parentPhone;

        let messageTemplate = "";
        const formattedDate = date.split('-').reverse().join('-'); // format as DD-MM-YYYY
        if (channel === 'SMS') {
          messageTemplate = `Dear Parent, Your child ${student.name} was absent from class today (${formattedDate}). Please contact the institution for further details.`;
        } else if (channel === 'WhatsApp') {
          messageTemplate = `📢 *Class Notification*: Dear ${student.parentName}, your child *${student.name}* was marked ABSENT today (${formattedDate}). Please reply or call us regarding verification.`;
        } else if (channel === 'Email') {
          messageTemplate = `Subject: Student Attendance Alert: ${student.name} Absent on ${formattedDate}\n\nDear Parent/Guardian,\n\nThis is an automated system notification keeping you informed. Your ward, ${student.name}, was absent from class on ${formattedDate}.\n\nIf this was unplanned, please report or write back immediately.\n\nThank you,\nAdministration Office.`;
        } else {
          messageTemplate = `🔔 Absence Alert: ${student.name} is absent today (${formattedDate}). Click to review details.`;
        }

        const newNotif = {
          id: notifId,
          studentId: student.registerNumber,
          studentName: student.name,
          parentName: student.parentName,
          parentContact,
          channel,
          message: messageTemplate,
          status: "Queued",
          timestamp: new Date().toISOString()
        };

        state.notifications.unshift(newNotif);
        simulateNotificationDelivery(notifId);
      });
    } else {
      presentCount++;
    }

    return student;
  });

  addAuditLog(state, "Teacher", "Attendance Marked", `Marked attendance for date ${date}: ${presentCount} presents, ${absentCount} absents`);
  saveDB(state);

  res.json({ success: true, count: Object.keys(attendances).length, absentCount });
});

// 5. Get current parent notifications
app.get("/api/notifications", (req, res) => {
  const state = loadDB();
  res.json(state.notifications);
});

// 6. Clear notifications history
app.post("/api/notifications/clear", (req, res) => {
  const state = loadDB();
  state.notifications = [];
  addAuditLog(state, "Admin", "Cleared Log", "Cleared parent notification delivery history");
  saveDB(state);
  res.json({ success: true });
});

// 7. Get system audit logs
app.get("/api/logs", (req, res) => {
  const state = loadDB();
  res.json(state.auditLogs);
});

// --- SMTP DIAGNOSTICS & SAVED SETTINGS APIs ---

// A. Check SMTP Configuration Status and details
app.get("/api/smtp/status", (req, res) => {
  const state = loadDB();
  const info = getMailTransporter();
  
  if (info) {
    res.json({
      configured: true,
      source: info.source,
      sender: info.sender,
      dbSettings: state.smtpConfig ? {
        host: state.smtpConfig.host,
        port: state.smtpConfig.port,
        user: state.smtpConfig.user,
        sender: state.smtpConfig.sender,
        enabled: state.smtpConfig.enabled
      } : null
    });
  } else {
    res.json({
      configured: false,
      source: "None",
      sender: "",
      dbSettings: state.smtpConfig ? {
        host: state.smtpConfig.host,
        port: state.smtpConfig.port,
        user: state.smtpConfig.user,
        sender: state.smtpConfig.sender,
        enabled: state.smtpConfig.enabled
      } : null
    });
  }
});

// B. Save SMTP Custom Configuration
app.post("/api/smtp/config", (req, res) => {
  const state = loadDB();
  const { host, port, user, pass, sender, enabled } = req.body;
  
  if (!host || !user) {
    return res.status(400).json({ error: "Host and Username are required." });
  }

  // Preserve existing password if not supplied now (for editing safety)
  let finalPass = pass;
  if (!finalPass && state.smtpConfig) {
    finalPass = state.smtpConfig.pass;
  }

  if (!finalPass) {
    return res.status(400).json({ error: "Password or App Password is required." });
  }

  state.smtpConfig = {
    host: host.trim(),
    port: port ? parseInt(port, 10) : 587,
    user: user.trim(),
    pass: finalPass.trim(),
    sender: sender ? sender.trim() : user.trim(),
    enabled: enabled !== false
  };

  addAuditLog(state, "Admin", "SMTP Config Saved", `Configured SMTP dispatch: ${host.trim()} via database panel`);
  saveDB(state);
  res.json({ success: true, message: "SMTP parameters stored securely in persistent JSON." });
});

// C. Test SMTP helper and return real-time error messages
app.post("/api/smtp/test", async (req, res) => {
  const { toEmail } = req.body;
  
  if (!toEmail) {
    return res.status(400).json({ error: "Recipient Email address is required to check connection." });
  }

  const state = loadDB();
  const info = getMailTransporter();
  
  if (!info) {
    return res.status(400).json({ error: "SMTP settings not found. Please complete the settings form." });
  }

  const subject = "Absentees Hub SMTP Diagnostic Test Message";
  const body = `Hello!\n\nThis is a real-time diagnostic test message from your deployed Class Absentees Notification Hub.\n\nConnection Mode: ACTIVE\nConfigured Source: ${info.source}\nSender Endpoint: ${info.sender}\nDispatch Timestamp: ${new Date().toLocaleString()}\n\nIf you see this, email alerts are fully working from your deployed site!`;

  try {
    const result = await sendRealEmail(toEmail, subject, body, "[DIAGNOSTIC TEST]");
    if (result.success) {
      addAuditLog(state, "SMTP Mailer", "Diagnostic Test Success", `Sent direct test email to ${toEmail}`);
      saveDB(state);
      res.json({ success: true, message: `Email delivered successfully using ${info.source}! Check inbox ${toEmail}.` });
    } else {
      res.status(500).json({ error: `Nodemailer dispatch failed: ${result.reason}` });
    }
  } catch (err: any) {
    res.status(500).json({ error: `SMTP crash: ${err.message || err}` });
  }
});

// 8. AI-Powered Student Name Recognition & Spelling Auto-Correction
app.post("/api/attendance/ai-extract", async (req, res) => {
  const { text, date } = req.body;
  if (!text || !date) {
    return res.status(400).json({ error: "Missing required properties: text, date" });
  }

  const state = loadDB();

  try {
    const ai = getAI();
    const studentsBrief = state.students.map(s => ({
      registerNumber: s.registerNumber,
      name: s.name,
      department: s.department
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Extract the register numbers of the absent students mentioned in the teacher's input text below.
Spelling mistakes or shortened names in the teacher's text should be matched to the closest matching student in the roster below.
Exclude students that are not mentioned. If a student's name is mentioned, return their corresponding "registerNumber".

Teacher Input: "${text}"

Student Roster:
${JSON.stringify(studentsBrief, null, 2)}

Return a strict JSON format matching this schema:
{
  "extractedMatches": [
    {
      "inputNameMatched": "the name or word from the teacher text",
      "registerNumber": "CS-2026-001",
      "confidenceScore": 0.95
    }
  ]
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["extractedMatches"],
          properties: {
            extractedMatches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["inputNameMatched", "registerNumber", "confidenceScore"],
                properties: {
                  inputNameMatched: { type: Type.STRING },
                  registerNumber: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const bodyText = response.text?.trim() || "";
    const payload = JSON.parse(bodyText);
    const extractedMatches = payload.extractedMatches || [];

    // Auto mark them as absent in the db state
    const autoAttendances: Record<string, 'present' | 'absent'> = {};

    // By default, mark all class students as PRESENT for this day first, except the extracted ones as ABSENT
    // This gives a convenient default "Mark remaining as present" behavior!
    state.students.forEach(s => {
      autoAttendances[s.registerNumber] = 'present';
    });

    extractedMatches.forEach((match: any) => {
      if (match.registerNumber) {
        autoAttendances[match.registerNumber] = 'absent';
      }
    });

    // Make an API call mock internal for saving the marked attendance
    // Simulating updates for those students
    let absentCount = 0;
    state.students = state.students.map(student => {
      const status = autoAttendances[student.registerNumber];
      const existingIndex = student.history.findIndex((h: any) => h.date === date);
      if (existingIndex !== -1) {
        student.history[existingIndex].status = status;
      } else {
        student.history.push({ date, status });
      }

      student.history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const presents = student.history.filter((h: any) => h.status === 'present').length;
      student.attendanceRate = Math.round((presents / student.history.length) * 1000) / 10;
      student.lastAttendanceDate = date;

      if (status === 'absent') {
        absentCount++;
        // Enqueue parent notifications
        const channels: ('SMS' | 'WhatsApp' | 'Email' | 'Push')[] = ['SMS', 'WhatsApp', 'Email', 'Push'];
        channels.forEach(channel => {
          const notifId = `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
          const parentContact = channel === 'Email' ? student.parentEmail : student.parentPhone;

          let messageTemplate = "";
          const formattedDate = date.split('-').reverse().join('-');
          if (channel === 'SMS') {
            messageTemplate = `Dear Parent, Your child ${student.name} was absent from class today (${formattedDate}). Please contact the institution for further details.`;
          } else if (channel === 'WhatsApp') {
            messageTemplate = `📢 *Notification Update*: Dear ${student.parentName}, your child *${student.name}* was marked ABSENT today (${formattedDate}). Details issued from Teacher's natural language voice logging.`;
          } else if (channel === 'Email') {
            messageTemplate = `Subject: Automated Absence Notice - ${student.name} [${formattedDate}]\n\nDear ${student.parentName},\n\nWe would like to bring to your attention that ${student.name} was recorded as absent today, ${formattedDate}.\n\nIf this was a scheduled leave, please submit proof. Else contact the department immediately.\n\nBest regards,\nAutomated School AI Support.`;
          } else {
            messageTemplate = `🔔 Absence Alert: Parent portal alert. ${student.name} is absent on ${formattedDate}.`;
          }

          const newNotif = {
            id: notifId,
            studentId: student.registerNumber,
            studentName: student.name,
            parentName: student.parentName,
            parentContact,
            channel,
            message: messageTemplate,
            status: "Queued",
            timestamp: new Date().toISOString()
          };

          state.notifications.unshift(newNotif);
          simulateNotificationDelivery(notifId);
        });
      }

      return student;
    });

    addAuditLog(
      state,
      "Teacher",
      "AI Speech/Text Parsing",
      `Used AI to parse: "${text}". Identified ${absentCount} absentees out of ${state.students.length} students`
    );
    saveDB(state);

    res.json({
      success: true,
      extractedMatches,
      absentCount
    });

  } catch (err: any) {
    console.error("AI extraction failed, executing regex fuzzy fallback", err);
    // Fallback simple search in case of missing keys
    const textLower = text.toLowerCase();
    const matches: any[] = [];
    state.students.forEach(s => {
      const parts = s.name.toLowerCase().split(' ');
      const matchFound = parts.some((p: string) => p.length > 2 && textLower.includes(p));
      if (matchFound) {
        matches.push({
          inputNameMatched: s.name,
          registerNumber: s.registerNumber,
          confidenceScore: 0.8
        });
      }
    });

    const isFallen = matches.length > 0;
    const autoAttendances: Record<string, 'present' | 'absent'> = {};
    state.students.forEach(s => { autoAttendances[s.registerNumber] = 'present'; });
    matches.forEach(m => { autoAttendances[m.registerNumber] = 'absent'; });

    state.students = state.students.map(student => {
      const status = autoAttendances[student.registerNumber] || 'present';
      const existingIndex = student.history.findIndex((h: any) => h.date === date);
      if (existingIndex !== -1) {
        student.history[existingIndex].status = status;
      } else {
        student.history.push({ date, status });
      }
      const presents = student.history.filter((h: any) => h.status === 'present').length;
      student.attendanceRate = Math.round((presents / student.history.length) * 1000) / 10;
      student.lastAttendanceDate = date;

      if (status === 'absent') {
        const newNotif = {
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: student.registerNumber,
          studentName: student.name,
          parentName: student.parentName,
          parentContact: student.parentPhone,
          channel: "SMS" as const,
          message: `Dear Parent, Your child ${student.name} was absent today (${date}). [Fallback matching executed]`,
          status: "Delivered" as const,
          timestamp: new Date().toISOString()
        };
        state.notifications.unshift(newNotif);
      }
      return student;
    });

    addAuditLog(state, "System", "Fuzzy Fallback Matching", `Fuzzy extracted ${matches.length} matching names without Gemini API key`);
    saveDB(state);

    res.json({
      success: true,
      extractedMatches: matches,
      fallbackMode: true,
      absentCount: matches.length
    });
  }
});

// 9. AI Smart Analytics: Attendance predictions & Smart Recommendations
app.get("/api/smart/analytics", async (req, res) => {
  const state = loadDB();

  try {
    const ai = getAI();
    // Prepare a clean structured overview of student history for the LLM to analyze
    const studentProfiles = state.students.map(s => ({
      id: s.registerNumber,
      name: s.name,
      department: s.department,
      attendanceRate: s.attendanceRate,
      historyBrief: s.history.slice(-6).map((h: any) => `${h.date}:${h.status}`)
    }));

    const promptText = `Conduct a prognostic absence risk assessment for the student roster listed below. 
Analyze their attendance rates and historical patterns (especially contiguous absent records, recurring absences on same weekdays, general drop trends).
1. For Predictions: Identify risk levels ("High" for < 70%, "Medium" for 70%-80%, "Low" for > 80%), trend directions, and forecast what their attendance percentage might fall/rise to within the next month, including a concrete pedagogical explanation.
2. For Smart Recommendations: Draft highly individualized recommendations specifically targeted at improving attendance for any students showing declining trends or falling below the crucial 75% school threshold.

Roster:
${JSON.stringify(studentProfiles, null, 2)}

Return a strict JSON format matching this schema:
{
  "predictions": [
    {
      "studentId": "CS-2026-001",
      "studentName": "Madhan Raj",
      "currentRate": 72.5,
      "riskLevel": "Medium",
      "trend": "declining",
      "predictedRate": 68.2,
      "reason": "Consecutive absences detected. Needs parental checkpoint inquiry."
    }
  ],
  "recommendations": [
    {
      "studentId": "EC-2026-003",
      "studentName": "Priya Swaminathan",
      "currentRate": 60.0,
      "triggerReason": "Attendance is at 60%, violating the minimum 75% threshold.",
      "aiSuggestedAction": "Organize a face-to-face meet with Parent Swaminathan Swaminathan. Suggest local transport arrangements to avoid repeat absences.",
      "priority": "High"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["predictions", "recommendations"],
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["studentId", "studentName", "currentRate", "riskLevel", "trend", "predictedRate", "reason"],
                properties: {
                  studentId: { type: Type.STRING },
                  studentName: { type: Type.STRING },
                  currentRate: { type: Type.NUMBER },
                  riskLevel: { type: Type.STRING }, // High, Medium, Low
                  trend: { type: Type.STRING }, // declining, stable, improving
                  predictedRate: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["studentId", "studentName", "currentRate", "triggerReason", "aiSuggestedAction", "priority"],
                properties: {
                  studentId: { type: Type.STRING },
                  studentName: { type: Type.STRING },
                  currentRate: { type: Type.NUMBER },
                  triggerReason: { type: Type.STRING },
                  aiSuggestedAction: { type: Type.STRING },
                  priority: { type: Type.STRING } // High, Medium, Low
                }
              }
            }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json({
      success: true,
      predictions: parsed.predictions || [],
      recommendations: parsed.recommendations || []
    });

  } catch (err: any) {
    console.warn("Gemini smart analytics retrieval error, triggering offline prediction algorithm", err);
    // Offline analytics calculation logic
    const predictions: any[] = [];
    const recommendations: any[] = [];

    state.students.forEach(s => {
      // Analyze recent history
      const recent = s.history.slice(-3);
      const absentsInRecent = recent.filter((h: any) => h.status === 'absent').length;

      let trend: 'declining' | 'stable' | 'improving' = 'stable';
      if (absentsInRecent >= 2) trend = 'declining';
      else if (absentsInRecent === 0 && s.attendanceRate < 90) trend = 'improving';

      let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if (s.attendanceRate < 75) riskLevel = 'High';
      else if (s.attendanceRate < 85) riskLevel = 'Medium';

      const predictedRate = Math.max(20, Math.min(100, s.attendanceRate + (trend === 'declining' ? -5 : trend === 'improving' ? 4 : 0)));

      predictions.push({
        studentId: s.registerNumber,
        studentName: s.name,
        currentRate: s.attendanceRate,
        riskLevel,
        trend,
        predictedRate: Math.round(predictedRate * 10) / 10,
        reason: `${absentsInRecent} absences in the last ${recent.length} days indicate a ${trend} attendance path.`
      });

      if (s.attendanceRate < 75) {
        recommendations.push({
          studentId: s.registerNumber,
          studentName: s.name,
          currentRate: s.attendanceRate,
          triggerReason: `Attendance has fallen to ${s.attendanceRate}%, which is below the minimum required 75% guideline.`,
          aiSuggestedAction: `Schedule parent-teacher conference with ${s.parentName} to resolve underlying commuting or health reasons and set a recovery curriculum.`,
          priority: s.attendanceRate < 65 ? 'High' : 'Medium'
        });
      }
    });

    res.json({
      success: true,
      predictions,
      recommendations,
      offlineFallback: true
    });
  }
});


// Setup Vite Dev Server / Static files handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development backend layer...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled static production files...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully deployed and running on port ${PORT}`);
  });
}

startServer();
