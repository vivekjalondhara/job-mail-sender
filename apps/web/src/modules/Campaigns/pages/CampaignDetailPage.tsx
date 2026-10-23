import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../../../services/api';
import StatusPill from '../../../components/ui/StatusPill';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { data, isLoading, error: loadError } = useQuery({ queryKey: ['campaign', id], queryFn: () => api.campaign(id!), enabled: Boolean(id), refetchInterval: 3000 });
  const action = useMutation({ mutationFn: (value: 'start' | 'pause' | 'retry-failed') => api.action(id!, value), onSuccess: () => {
    setError('');
    queryClient.invalidateQueries({ queryKey: ['campaign', id] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }, onError: error => setError(error.message) });
  if (isLoading) return <div className="empty">Loading campaign…</div>;
  if (loadError || !data) return <div className="empty">{(loadError as Error)?.message || 'Campaign not found.'}</div>;
  const sent = data.jobs.filter(job => job.status === 'sent').length;
  const failed = data.jobs.filter(job => job.status === 'failed').length;
  const uncertain = data.jobs.filter(job => job.status === 'uncertain').length;
  const pending = data.jobs.filter(job => ['pending', 'sending'].includes(job.status)).length;
  return <><div className="section-title page-title"><div><Link className="text-link" to="/campaigns">← All campaigns</Link><h2>{data.name}<span className="period">.</span></h2><p>Created {new Date(data.createdAt).toLocaleString()} · {data.jobs.length} recipients</p></div><StatusPill status={data.status}/></div>
    <div className="card detail-content"><div className="detail-head"><div><h3>Send progress</h3><small>One worker sends each message in order.</small></div></div><div className="progress"><span style={{ width: `${data.jobs.length ? sent / data.jobs.length * 100 : 0}%` }}/></div><div className="stats"><span>{sent} sent</span><span>{pending} pending</span><span>{failed} failed</span><span>{uncertain} uncertain</span></div><div className="detail-actions"><button className="button dark" onClick={() => action.mutate('start')} disabled={action.isPending || data.status === 'running' || !data.jobs.some(job => job.status === 'pending')}>Start / resume</button><button className="button outline" onClick={() => action.mutate('pause')} disabled={action.isPending || data.status !== 'running'}>Pause</button><button className="button ghost" onClick={() => action.mutate('retry-failed')} disabled={action.isPending || !failed}>Retry failed</button></div>{error && <p className="form-message error-text">{error}</p>}{uncertain > 0 && <p className="issues">Check the sender's Sent folder or provider logs for uncertain jobs before retrying.</p>}</div>
    <section className="section"><div className="section-title"><div><span className="overline">RECIPIENT LOG</span><h2>Messages<span className="period">.</span></h2><p>Accepted by the provider means sent, not necessarily delivered.</p></div></div><div className="card"><div className="table-wrap recipient-table"><table className="data-table"><thead><tr><th>RECIPIENT</th><th>STATUS</th><th>MESSAGE ID / ERROR</th><th>SENT AT</th></tr></thead><tbody>{data.jobs.map(job => <tr key={job.id}><td><strong>{job.recipient}</strong></td><td><StatusPill status={job.status}/></td><td>{job.error || job.messageId || '—'}</td><td>{job.sentAt ? new Date(job.sentAt).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></div></section>
  </>;
}
