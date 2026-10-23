import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import type { Preview } from '../../../services/types';

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: api.templates });
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  function formData() {
    const data = new FormData();
    data.append('name', name); data.append('templateId', templateId);
    if (file) data.append('file', file);
    return data;
  }
  const previewMutation = useMutation({ mutationFn: () => api.preview(formData()), onSuccess: value => { setPreview(value); setError(''); }, onError: error => setError(error.message) });
  const createMutation = useMutation({ mutationFn: () => api.createCampaign(formData()), onSuccess: result => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    navigate(`/campaigns/${result.campaign.id}`);
  }, onError: error => setError(error.message) });
  return <><div className="section-title page-title"><div><span className="overline">PREPARE YOUR SEND</span><h2>New campaign<span className="period">.</span></h2><p>Select a template, upload recipients, and review the messages before creating the queue.</p></div><a className="text-link" href="/sample.csv" download>Download sample CSV ↗</a></div>
    <div className="card form-card"><div className="two-fields"><label>Campaign name<input value={name} onChange={event => { setName(event.target.value); setPreview(null); }} placeholder="October HR outreach" maxLength={100}/></label><label>Template<select value={templateId} onChange={event => { setTemplateId(event.target.value); setPreview(null); }}><option value="">Choose a saved template</option>{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label></div><label className="upload-label" htmlFor="csvFile"><span className="upload-icon">↑</span><strong>{file?.name || 'Choose your CSV file'}</strong><small>CSV only · up to 2 MB · 2,000 rows</small></label><input id="csvFile" type="file" accept=".csv,text/csv" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null); }} hidden/><div className="form-footer"><span>Duplicate and invalid addresses are skipped.</span><button type="button" className="button outline" onClick={() => previewMutation.mutate()} disabled={!file || !templateId || previewMutation.isPending}>Preview emails</button></div>{error && <p className="form-message error-text">{error}</p>}
      {preview && <div className="preview"><div className="preview-heading"><strong>Ready to review</strong><span>{preview.count} unique recipients</span></div>{preview.errors.length > 0 && <div className="issues">{preview.errors.slice(0, 10).map((issue, index) => <div key={index}>{issue}</div>)}{preview.errors.length > 10 && <div>…and {preview.errors.length - 10} more skipped rows</div>}</div>}<div className="table-wrap"><table className="data-table"><thead><tr><th>RECIPIENT</th><th>SUBJECT</th></tr></thead><tbody>{preview.recipients.map(row => <tr key={row.to}><td>{row.to}</td><td>{row.subject}</td></tr>)}</tbody></table></div>{preview.count > preview.recipients.length && <p className="fine-print">Showing the first {preview.recipients.length} recipients of {preview.count}. All valid recipients will be queued.</p>}<div className="sample-grid">{preview.samples.map(sample => <div className="sample" key={sample.to}><small>TO: {sample.to}</small><strong>{sample.subject}</strong><pre>{sample.body}</pre></div>)}</div><div className="preview-footer"><span>The campaign starts paused for final review.</span><button type="button" className="button dark" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>Create campaign <span>↗</span></button></div></div>}
    </div>
  </>;
}
