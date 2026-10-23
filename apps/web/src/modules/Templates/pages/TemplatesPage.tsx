import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import type { Template } from '../../../services/types';

type TemplateInput = Pick<Template, 'name' | 'subject' | 'body'>;

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const { data: templates = [], error } = useQuery({ queryKey: ['templates'], queryFn: api.templates });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName('');
    setSubject('');
    setBody('');
  }

  function edit(template: Template) {
    setEditingId(template.id);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    setMessage('');
    setMessageError(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saved(label: string) {
    resetForm();
    setMessage(label);
    setMessageError(false);
    queryClient.invalidateQueries({ queryKey: ['templates'] });
  }

  const create = useMutation({
    mutationFn: api.saveTemplate,
    onSuccess: () => saved('Template saved.'),
    onError: error => { setMessage(error.message); setMessageError(true); },
  });
  const update = useMutation({
    mutationFn: ({ id, values }: { id: number; values: TemplateInput }) => api.updateTemplate(id, values),
    onSuccess: () => saved('Template updated. New campaigns will use these changes.'),
    onError: error => { setMessage(error.message); setMessageError(true); },
  });
  const saving = create.isPending || update.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageError(false);
    const values = { name, subject, body };
    if (editingId === null) create.mutate(values);
    else update.mutate({ id: editingId, values });
  }

  return <>
    <div className="section-title page-title">
      <div>
        <span className="overline">MESSAGE LIBRARY</span>
        <h2>Templates<span className="period">.</span></h2>
        <p>Write the subject and message once. Use CSV columns like <code>{'{{name}}'}</code> to personalize them.</p>
      </div>
    </div>
    <div className="card form-card" ref={formRef}>
      <h3 className="form-heading">{editingId === null ? 'Create template' : 'Edit template'}</h3>
      <form onSubmit={submit}>
        <div className="two-fields">
          <label>Template name<input value={name} onChange={event => setName(event.target.value)} placeholder="HR introduction" maxLength={100} required/></label>
          <label>Subject<input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Application for {{role}} at {{company}}" maxLength={200} required/></label>
        </div>
        <label className="body-label">Message<textarea value={body} onChange={event => setBody(event.target.value)} rows={8} placeholder={'Hello {{name}},\n\nI’m writing about the {{role}} role at {{company}}...'} required/></label>
        <div className="form-footer">
          <span>{editingId === null ? 'Templates are saved for later campaigns.' : 'Existing campaigns keep their original subject and message.'}</span>
          <div className="form-buttons">
            {editingId !== null && <button type="button" className="button ghost" onClick={() => { resetForm(); setMessage(''); setMessageError(false); }} disabled={saving}>Cancel</button>}
            <button className="button dark" disabled={saving}>{editingId === null ? 'Save template' : 'Update template'} <span>↗</span></button>
          </div>
        </div>
        {message && <p className={`form-message ${messageError ? 'error-text' : ''}`} role="status">{message}</p>}
      </form>
    </div>
    <section className="section">
      <div className="section-title"><div><span className="overline">SAVED MESSAGES</span><h2>Template library<span className="period">.</span></h2></div></div>
      <div className="card">
        {error ? <div className="empty">{(error as Error).message}</div> : templates.length === 0 ? <div className="empty">No templates yet.</div> :
          <div className="table-wrap"><table className="data-table"><thead><tr><th>NAME</th><th>SUBJECT</th><th>CREATED</th><th>ACTION</th></tr></thead><tbody>
            {templates.map(template => <tr key={template.id}>
              <td><strong>{template.name}</strong></td>
              <td>{template.subject}</td>
              <td>{new Date(template.createdAt).toLocaleDateString()}</td>
              <td><button type="button" className="table-action" onClick={() => edit(template)} disabled={saving}>Edit ↗</button></td>
            </tr>)}
          </tbody></table></div>}
      </div>
    </section>
  </>;
}
