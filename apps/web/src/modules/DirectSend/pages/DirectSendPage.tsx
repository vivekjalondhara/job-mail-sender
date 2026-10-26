import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import type { DirectSend } from '../../../services/types';
import MessagePreview from '../../../components/ui/MessagePreview';

export default function DirectSendPage() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['status'], queryFn: api.status });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const history = useQuery({ queryKey: ['directSends', page, pageSize], queryFn: () => api.directSends(page, pageSize) });
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [fileError, setFileError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<'draft' | DirectSend | null>(null);
  const ready = status.data?.mode === 'smtp' ? status.data.smtp.ready : Boolean(status.data?.account);
  const sender = status.data?.mode === 'smtp' ? status.data.smtp.sender : status.data?.account;
  const send = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('to', to.trim());
      data.append('subject', subject.trim());
      data.append('body', body);
      files.forEach(file => data.append('attachments', file));
      return api.sendDirect(data);
    },
    onSuccess: () => {
      setSuccess(`Email submitted to ${to.trim()}.`);
      setTo(''); setSubject(''); setBody(''); setFiles([]); setFileKey(value => value + 1);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['directSends'] });
    },
    onError: () => { setSuccess(''); setPage(1); queryClient.invalidateQueries({ queryKey: ['directSends'] }); },
  });
  function selectFiles(selected: FileList | null) {
    const next = Array.from(selected || []);
    if (next.length > 5 || next.reduce((total, file) => total + file.size, 0) > 10 * 1024 * 1024) {
      setFileError('Choose up to 5 files totaling 10 MB or less.'); setFiles([]); return;
    }
    setFileError(''); setFiles(next); setSuccess('');
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess('');
    if (!fileError) send.mutate();
  }
  function attachmentNames(item: DirectSend): string[] {
    try {
      const names: unknown = JSON.parse(item.attachmentNames);
      return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : [];
    } catch { return []; }
  }
  const total = history.data?.total ?? 0;
  const totalPages = history.data?.totalPages ?? 0;
  const pageNumbers = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages)
    .sort((a, b) => a - b);
  return <>
    <div className="section-title page-title"><div><span className="overline">ONE MESSAGE</span><h2>Send email<span className="period">.</span></h2><p>Write and send an email directly, with optional attachments.</p></div></div>
    <form className="card form-card direct-form" onSubmit={submit}>
      <h3 className="form-heading">Compose message</h3>
      <p className="muted sender-line">From: <strong>{sender || 'No sender connected'}</strong> {status.data?.mode === 'gmail' && !ready && <Link className="text-link" to="/">Connect Gmail ↗</Link>}</p>
      <label>To<input type="email" required maxLength={254} value={to} onChange={event => { setTo(event.target.value); setSuccess(''); }} placeholder="person@example.com" autoComplete="email"/></label>
      <label>Subject<input required maxLength={200} value={subject} onChange={event => { setSubject(event.target.value); setSuccess(''); }} placeholder="Your email subject"/></label>
      <label>Message<textarea required maxLength={100000} value={body} onChange={event => { setBody(event.target.value); setSuccess(''); }} placeholder="Write your message here…" rows={10}/></label>
      <label>Attachments (optional)<input key={fileKey} type="file" multiple onChange={event => selectFiles(event.target.files)}/></label>
      <p className="fine-print">Up to 5 files, 10 MB total. This sends immediately and counts toward the local daily limit.</p>
      {files.length > 0 && <ul className="attachment-list">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name} · {(file.size / 1024).toFixed(1)} KB</li>)}</ul>}
      {fileError && <p role="alert" className="form-message error-text">{fileError}</p>}
      {send.isError && !success && <p role="alert" className="form-message error-text">{send.error.message}</p>}
      {success && <p role="status" className="form-message">{success} Check Sent for delivery status.</p>}
      <div className="form-footer"><span>Recipient: {to || '—'} · {files.length} attachment{files.length === 1 ? '' : 's'}</span><div className="form-buttons"><button className="button outline" type="button" onClick={() => setPreview('draft')} disabled={send.isPending}>Preview email</button><button className="button dark" type="submit" disabled={!ready || !to || !subject.trim() || !body.trim() || Boolean(fileError) || send.isPending}>{send.isPending ? 'Sending…' : 'Send email ↗'}</button></div></div>
    </form>
    <section className="section" aria-labelledby="direct-emails-title">
      <div className="section-title"><div><span className="overline">SEND HISTORY</span><h2 id="direct-emails-title">Direct emails<span className="period">.</span></h2><p>Review messages sent directly from this page.</p></div></div>
      <div className="card">
        <div className="direct-history-head"><strong>{total.toLocaleString()} email{total === 1 ? '' : 's'}</strong><label htmlFor="direct-page-size">Rows per page <select id="direct-page-size" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label></div>
        {history.isPending ? <div className="empty" role="status">Loading direct emails…</div> : history.isError ? <div className="empty error-text" role="alert">Could not load direct emails: {history.error.message}</div> : history.data.items.length ? <div className="direct-history-table"><table className="data-table"><thead><tr><th>TO</th><th>SUBJECT</th><th>STATUS</th><th>DATE</th><th>ACTION</th></tr></thead><tbody>{history.data.items.map(item => <tr key={item.id}><td>{item.recipient}</td><td>{item.subject}</td><td><span className={`status ${item.status}`}>{item.status}</span></td><td>{new Date(item.createdAt).toLocaleString()}</td><td><button type="button" className="table-action" onClick={() => setPreview(item)}>View email ↗</button></td></tr>)}</tbody></table></div> : <div className="empty">{total ? 'No emails on this page.' : 'No direct emails yet.'}</div>}
        {!history.isPending && !history.isError && total > 0 && <nav className="direct-pagination" aria-label="Direct emails pages"><span>Showing {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}</span><div className="direct-pagination-buttons"><button type="button" onClick={() => setPage(value => value - 1)} disabled={page === 1} aria-label="Previous page">← Previous</button>{pageNumbers.map((number, index) => <span key={number} className="direct-page-slot">{index > 0 && number - pageNumbers[index - 1] > 1 && <span className="direct-page-ellipsis" aria-hidden="true">…</span>}<button type="button" onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} disabled={number === page}>{number}</button></span>)}<button type="button" onClick={() => setPage(value => value + 1)} disabled={page >= totalPages} aria-label="Next page">Next →</button></div></nav>}
      </div>
    </section>
    {preview && <MessagePreview
      title={preview === 'draft' ? 'Email preview' : 'Direct email'}
      from={preview === 'draft' ? sender : undefined}
      to={preview === 'draft' ? to : preview.recipient}
      subject={preview === 'draft' ? subject : preview.subject}
      body={preview === 'draft' ? body : preview.body}
      attachments={preview === 'draft' ? files.map(file => file.name) : attachmentNames(preview)}
      note={preview === 'draft' ? 'Review the details, then close this view to send.' : preview.status === 'sent' ? 'Accepted by the sender. Delivery is not guaranteed.' : `Status: ${preview.status}${preview.error ? ` · ${preview.error}` : ''}`}
      onClose={() => setPreview(null)}
    />}
  </>;
}
