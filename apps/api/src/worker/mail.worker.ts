import { Op } from 'sequelize';
import { Campaign, MailJob } from '../database/models.js';
import { env } from '../config/env.js';
import { senderReady, sendMessage } from '../modules/mailer/index.js';
import { render, type CsvRow } from '../modules/mailer/template.js';

let busy = false;
let lastAttempt = 0;

export async function recoverInterruptedJobs(): Promise<void> {
  await MailJob.update({ status: 'uncertain', error: 'Worker stopped during send; check Sent or provider logs before retrying' }, { where: { status: 'sending' } });
}

export async function processNextJob(): Promise<void> {
  if (busy || Date.now() - lastAttempt < env.sendIntervalMs) return;
  if (!await senderReady()) return;
  const campaign = await Campaign.findOne({ where: { status: 'running' }, order: [['id', 'ASC']] });
  if (!campaign) return;
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await MailJob.count({ where: {
    [Op.or]: [
      { status: 'sent', sentAt: { [Op.gte]: windowStart } },
      { status: { [Op.in]: ['uncertain', 'sending'] }, updatedAt: { [Op.gte]: windowStart } },
    ],
  } });
  if (used >= env.dailySendLimit) { await campaign.update({ status: 'paused' }); return; }
  const job = await MailJob.findOne({ where: { campaignId: campaign.id, status: 'pending' }, order: [['id', 'ASC']] });
  if (!job) { await campaign.update({ status: 'complete' }); return; }
  busy = true;
  lastAttempt = Date.now();
  try {
    const [claimed] = await MailJob.update({ status: 'sending', updatedAt: new Date() }, { where: { id: job.id, status: 'pending' } });
    if (!claimed) return;
    const row = JSON.parse(job.rowJson) as CsvRow;
    const subject = render(campaign.subject, row);
    if (!subject.trim() || /[\r\n]/.test(subject)) throw new Error('Rendered subject is empty or contains a line break.');
    const messageId = await sendMessage(job.recipient, subject, render(campaign.body, row));
    await job.update({ status: 'sent', messageId, sentAt: new Date(), updatedAt: new Date(), error: null });
  } catch (error) {
    const typed = error as Error & { code?: string | number; response?: { status?: number } };
    const status = Number(typed.response?.status ?? typed.code);
    const message = String(typed.message || error).slice(0, 400);
    if ([401, 403, 429].includes(status) || typed.code === 'EAUTH') {
      await job.update({ status: 'pending', error: message, updatedAt: new Date() });
      await campaign.update({ status: 'paused' });
    } else if (status >= 500 || (!status && !['EENVELOPE', 'EMESSAGE'].includes(String(typed.code)) && !message.startsWith('Rendered subject'))) {
      await job.update({ status: 'uncertain', error: `Check Sent or provider logs before retrying: ${message}`, updatedAt: new Date() });
      await campaign.update({ status: 'paused' });
    } else {
      await job.update({ status: 'failed', error: message, updatedAt: new Date() });
    }
    console.error('Send job failed:', job.id, message);
  } finally { busy = false; }
}
