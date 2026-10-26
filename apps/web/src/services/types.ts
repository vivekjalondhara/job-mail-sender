export interface SenderStatus {
  account: string | null;
  mode: 'gmail' | 'smtp';
  smtp: { ready: boolean; sender: string | null; error?: string };
  dailyLimit: number;
  intervalMs: number;
}
export interface Template {
  id: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}
export type CampaignStatus = 'paused' | 'running' | 'complete';
export type JobStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'uncertain';
export interface CampaignSummary {
  id: number;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  total: number;
  sent: number;
  failed: number;
  uncertain: number;
}
export interface Job {
  id: number;
  recipient: string;
  status: JobStatus;
  messageId: string | null;
  error: string | null;
  sentAt: string | null;
}
export interface CampaignDetail {
  id: number;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  subject: string;
  body: string;
  jobs: Job[];
}
export interface Preview {
  count: number;
  errors: string[];
  recipients: Array<{ to: string; subject: string }>;
  samples: Array<{ to: string; subject: string; body: string }>;
}
export interface DirectSend {
  id: number;
  recipient: string;
  subject: string;
  body: string | null;
  attachmentNames: string;
  status: 'sending' | 'sent' | 'failed' | 'uncertain';
  messageId: string | null;
  error: string | null;
  createdAt: string;
}

export interface DirectSendsPage {
  items: DirectSend[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
