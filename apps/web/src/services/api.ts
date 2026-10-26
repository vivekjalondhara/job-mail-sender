import type { CampaignDetail, CampaignSummary, DirectSendsPage, Preview, SenderStatus, Template } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  status: () => request<SenderStatus>('/api/status'),
  directSends: (page: number, pageSize: number) => request<DirectSendsPage>(`/api/direct-sends?page=${page}&pageSize=${pageSize}`),
  sendDirect: (data: FormData) => request<{ id: number; messageId: string; status: 'sent' }>('/api/direct-sends', { method: 'POST', body: data }),
  disconnect: () => request<{ ok: boolean }>('/api/disconnect', { method: 'POST' }),
  templates: () => request<Template[]>('/api/templates'),
  saveTemplate: (value: Pick<Template, 'name' | 'subject' | 'body'>) => request<Template>('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }),
  updateTemplate: (id: number, value: Pick<Template, 'name' | 'subject' | 'body'>) => request<Template>(`/api/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }),
  campaigns: () => request<CampaignSummary[]>('/api/campaigns'),
  campaign: (id: string | number) => request<CampaignDetail>(`/api/campaigns/${id}`),
  preview: (data: FormData) => request<Preview>('/api/preview', { method: 'POST', body: data }),
  createCampaign: (data: FormData) => request<{ campaign: CampaignDetail; importErrors: string[] }>('/api/campaigns', { method: 'POST', body: data }),
  action: (id: string | number, action: 'start' | 'pause' | 'retry-failed') => request<CampaignDetail>(`/api/campaigns/${id}/${action}`, { method: 'POST' }),
};
