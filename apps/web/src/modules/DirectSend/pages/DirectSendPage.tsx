import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import type { DirectSend } from '../../../services/types';
import MessagePreview from '../../../components/ui/MessagePreview';

export default function DirectSendPage() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['status'], queryFn: api.status });
  const history = useQuery({ queryKey: ['directSends'], queryFn: api.directSends });
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
      queryClient.invalidateQueries({ queryKey: ['directSends'] });
    },
    onError: () => { setSuccess(''); queryClient.invalidateQueries({ queryKey: ['directSends'] }); },
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
    <section className="section"><div className="section-title"><div><span className="overline">RECENT SENDS</span><h2>Direct emails<span className="period">.</span></h2></div></div><div className="card table-wrap">{history.data?.length ? <table className="data-table"><thead><tr><th>TO</th><th>SUBJECT</th><th>STATUS</th><th>DATE</th><th>ACTION</th></tr></thead><tbody>{history.data.map(item => <tr key={item.id}><td>{item.recipient}</td><td>{item.subject}</td><td><span className={`status ${item.status}`}>{item.status}</span></td><td>{new Date(item.createdAt).toLocaleString()}</td><td><button type="button" className="table-action" onClick={() => setPreview(item)}>View email ↗</button></td></tr>)}</tbody></table> : <div className="empty">No direct emails yet.</div>}</div></section>
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
