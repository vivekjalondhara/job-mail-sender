import { useEffect, useRef } from 'react';

interface MessagePreviewProps {
  title: string;
  subject: string;
  body: string | null;
  onClose: () => void;
  to?: string;
  from?: string | null;
  attachments?: string[];
  note?: string;
}

export default function MessagePreview({ title, subject, body, onClose, to, from, attachments = [], note }: MessagePreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return <dialog ref={dialogRef} className="message-dialog" onClose={onClose} aria-labelledby="message-preview-title">
    <div className="message-dialog-head">
      <div><span className="overline">MESSAGE VIEW</span><h2 id="message-preview-title">{title}</h2></div>
      <button type="button" className="message-dialog-close" onClick={() => dialogRef.current?.close()} aria-label="Close message view">×</button>
    </div>
    <div className="message-sheet">
      <div className="message-sheet-meta">
        {from && <div><span>FROM</span><strong>{from}</strong></div>}
        {to && <div><span>TO</span><strong>{to}</strong></div>}
        <div><span>SUBJECT</span><strong>{subject || 'No subject yet'}</strong></div>
      </div>
      {body === null ? <p className="message-unavailable">The message body was not saved for this older email.</p> :
        <div className="message-sheet-body">{body || 'Your message will appear here.'}</div>}
      {attachments.length > 0 && <div className="message-sheet-attachments"><span>ATTACHMENTS</span><ul>{attachments.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul></div>}
    </div>
    {note && <p className="message-dialog-note">{note}</p>}
  </dialog>;
}
