export type Severity   = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
export type CaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type ChannelType = 'GENERAL' | 'HR' | 'SAFETY' | 'POLICY' | 'IT_SECURITY' | 'LEGAL';
export type Role = 'REPORTER' | 'HR_ADMIN' | 'LEGAL_ADMIN' | 'IT_ADMIN' | 'SUPER_ADMIN';

export interface Channel {
  id:          string;
  slug:        string;
  displayName: string;
  type:        ChannelType;
  description: string;
  _count:      { messages: number; reports: number };
}

export interface Message {
  id:            string;
  channelId:     string;
  reportId?:     string;
  content:       string;
  severity:      Severity;
  isAdminMessage:boolean;
  createdAt:     string;
  reporterSession?: { anonId: string; avatarSeed: string };
  admin?:         { displayName: string; role: string };
  attachments?: Attachment[];
}

export interface Report {
  id:          string;
  caseNumber:  string;
  severity:    Severity;
  status:      CaseStatus;
  createdAt:   string;
  updatedAt:   string;
  channel:     Pick<Channel, 'slug' | 'displayName' | 'type'>;
  assignments?: { admin: { displayName: string; role: string } }[];
  _count:      { messages: number };
}

export interface Attachment {
  id:           string;
  originalName: string;
  mimeType:     string;
  sizeBytes:    number;
  uploadedAt:   string;
}

export interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  isRead:    boolean;
  createdAt: string;
  reportId?: string;
}