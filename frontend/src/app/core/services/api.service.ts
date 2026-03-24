import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Severity, CaseStatus } from '../models/report.model';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ─── Channels ─────────────────────────────────────────────────────────────
  getChannels() {
    return this.http.get<any>(`${BASE}/channels`);
  }

  // ─── Messages ────────────────────────────────────────────────────────────
  getMessages(channelId: string, cursor?: string) {
    let params = new HttpParams();
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<any>(`${BASE}/channels/${channelId}/messages`, { params });
  }

  sendMessage(channelId: string, content: string, severity: Severity, reportId?: string) {
    return this.http.post<any>(`${BASE}/channels/${channelId}/messages`, {
      content, severity, ...(reportId ? { reportId } : {}),
    });
  }

  getReportMessages(reportId: string) {
    return this.http.get<any>(`${BASE}/reports/${reportId}/messages`);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────
  getMyReports() {
    return this.http.get<any>(`${BASE}/reports/mine`);
  }

  getReports(filters?: { status?: CaseStatus; severity?: Severity; channel?: string; page?: number }) {
    let params = new HttpParams();
    if (filters?.status)   params = params.set('status',   filters.status);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.channel)  params = params.set('channel',  filters.channel);
    if (filters?.page)     params = params.set('page',     String(filters.page));
    return this.http.get<any>(`${BASE}/reports`, { params });
  }

  getReport(reportId: string) {
    return this.http.get<any>(`${BASE}/reports/${reportId}`);
  }

  updateReportStatus(reportId: string, status: CaseStatus, note?: string) {
    return this.http.patch<any>(`${BASE}/reports/${reportId}/status`, { status, note });
  }

  assignReport(reportId: string, adminId: string, note?: string) {
    return this.http.post<any>(`${BASE}/reports/${reportId}/assign`, { adminId, note });
  }

  getDashboardStats() {
    return this.http.get<any>(`${BASE}/reports/dashboard`);
  }

  // ─── Notifications ────────────────────────────────────────────────────────
  getNotifications() {
    return this.http.get<any>(`${BASE}/notifications`);
  }

  markNotificationsRead(ids: string[]) {
    return this.http.patch<any>(`${BASE}/notifications/read`, { ids });
  }

  markAllNotificationsRead() {
    return this.http.patch<any>(`${BASE}/notifications/read-all`, {});
  }

  // ─── Attachments ──────────────────────────────────────────────────────────
  uploadAttachment(file: File, reportId?: string, messageId?: string) {
    const fd = new FormData();
    fd.append('file', file);
    if (reportId)  fd.append('reportId',  reportId);
    if (messageId) fd.append('messageId', messageId);
    return this.http.post<any>(`${BASE}/attachments`, fd);
  }

  getAttachmentUrl(attachmentId: string) {
    return `${BASE}/attachments/${attachmentId}`;
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  getAuditLogs(filters?: { adminId?: string; reportId?: string; page?: number }) {
    let params = new HttpParams();
    if (filters?.adminId)  params = params.set('adminId',  filters.adminId);
    if (filters?.reportId) params = params.set('reportId', filters.reportId);
    if (filters?.page)     params = params.set('page',     String(filters.page));
    return this.http.get<any>(`${BASE}/audit-logs`, { params });
  }

  // ─── Admin management ─────────────────────────────────────────────────────
  createAdmin(data: { username: string; password: string; displayName: string; role: string }) {
    return this.http.post<any>(`${BASE}/auth/admin/signup`, data);
  }
}
