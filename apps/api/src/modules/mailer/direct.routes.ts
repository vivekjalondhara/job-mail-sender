import { Router } from 'express';
import multer from 'multer';
import { DirectSend } from '../../database/models.js';
import { env } from '../../config/env.js';
import { sendMessage, senderReady } from './index.js';
import { sendsInLastDay } from './quota.js';

export const directRouter = Router();
const maxAttachments = 5;
const maxTotalBytes = 10 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: {
  files: maxAttachments, fileSize: maxTotalBytes, fieldSize: 100 * 1024, fields: 3,
} });

directRouter.get('/api/direct-sends', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || ![10, 25, 50].includes(pageSize) || !Number.isSafeInteger((page - 1) * pageSize)) {
    res.status(400).json({ error: 'Invalid page or page size.' }); return;
  }
  const { count, rows } = await DirectSend.findAndCountAll({
    order: [['id', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  res.json({ items: rows, total: count, page, pageSize, totalPages: Math.ceil(count / pageSize) });
});

directRouter.post('/api/direct-sends', upload.array('attachments', maxAttachments), async (req, res) => {
  const to = typeof req.body?.to === 'string' ? req.body.to.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body : '';
  const files = (req.files || []) as Express.Multer.File[];
  if (!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(to) || to.length > 254 || /[\r\n]/.test(to)) {
    res.status(400).json({ error: 'Enter one valid recipient email address.' }); return;
  }
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) {
    res.status(400).json({ error: 'Enter a subject of up to 200 characters without line breaks.' }); return;
  }
  if (!body.trim() || body.length > 100000) {
    res.status(400).json({ error: 'Enter a message of up to 100,000 characters.' }); return;
  }
  if (files.reduce((total, file) => total + file.size, 0) > maxTotalBytes || files.some(file => !file.originalname || /[\r\n]/.test(file.originalname))) {
    res.status(400).json({ error: 'Attachments must total 10 MB or less and have valid names.' }); return;
  }
  if (!await senderReady()) { res.status(400).json({ error: 'Connect or configure a sender first.' }); return; }
  if (await sendsInLastDay() >= env.dailySendLimit) {
    res.status(429).json({ error: 'The local 24-hour sending limit has been reached.' }); return;
  }
  const record = await DirectSend.create({ recipient: to, subject, body, attachmentNames: JSON.stringify(files.map(file => file.originalname)), status: 'sending' });
  try {
    const messageId = await sendMessage(to, subject, body, files.map(file => ({
      filename: file.originalname, content: file.buffer, contentType: file.mimetype,
    })));
    await record.update({ status: 'sent', messageId });
    res.status(201).json({ id: record.id, messageId, status: 'sent' });
  } catch (error) {
    const typed = error as Error & { code?: string | number; response?: { status?: number } };
    const providerStatus = Number(typed.response?.status ?? typed.code);
    const failed = (providerStatus >= 400 && providerStatus < 500) || ['EENVELOPE', 'EAUTH', 'EMESSAGE'].includes(String(typed.code));
    const message = String(typed.message || error).slice(0, 400);
    await record.update({ status: failed ? 'failed' : 'uncertain', error: message });
    res.status(failed ? 502 : 503).json({
      error: failed ? `Sender rejected the message: ${message}` : `Send outcome uncertain. Check your Sent folder or provider logs before retrying. ${message}`,
    });
  }
});
