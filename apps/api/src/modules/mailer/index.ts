import { Account } from '../../database/models.js';
import { env } from '../../config/env.js';
import { sendGmail } from './google.service.js';
import { sendSmtp, smtpStatus, type MailAttachment } from './smtp.service.js';

export async function senderReady(): Promise<boolean> {
  return env.smtpEnabled ? smtpStatus().ready : Boolean(await Account.findByPk(1));
}

export async function sendMessage(to: string, subject: string, body: string, attachments: MailAttachment[] = []): Promise<string> {
  if (env.smtpEnabled) return sendSmtp(to, subject, body, attachments);
  const account = await Account.findByPk(1);
  if (!account) throw new Error('Connect Gmail first');
  return sendGmail(account, to, subject, body, attachments);
}
