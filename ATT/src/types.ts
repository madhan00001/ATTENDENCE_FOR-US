/**
 * Domain types for AI-Powered Student Absence Notification System
 */

export interface AttendanceHistoryEntry {
  date: string;
  status: 'present' | 'absent';
}

export interface Student {
  id: string; // matches registerNumber
  name: string;
  registerNumber: string;
  department: string;
  year: string; // e.g. "I Year", "II Year", "III Year", "IV Year"
  section: string; // e.g. "A", "B"
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  attendanceRate: number; // calculated as (presents / total_days) * 100
  lastAttendanceDate: string; // YYYY-MM-DD
  history: AttendanceHistoryEntry[];
}

export type NotificationChannel = 'SMS' | 'WhatsApp' | 'Email' | 'Push';
export type NotificationStatus = 'Queued' | 'Sending' | 'Delivered' | 'Failed';

export interface NotificationLog {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentContact: string; // Phone or Email based on channel
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  user: string; // "Teacher" | "Admin" | "System"
  action: string;
  details: string;
  timestamp: string;
}

export interface AttendancePrediction {
  studentId: string;
  studentName: string;
  currentRate: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  trend: 'declining' | 'stable' | 'improving';
  predictedRate: number;
  reason: string;
}

export interface SmartRecommendation {
  studentId: string;
  studentName: string;
  currentRate: number;
  triggerReason: string;
  aiSuggestedAction: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface DashboardStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  notificationCount: number;
  deliverySuccessRate: number;
}
