import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

export function smtpStatus(): { ready: boolean; sender: string | null; error?: string } {
  const missing = [!env.smtpHost && 'SMTP_HOST', !env.smtpUser && 'SMTP_USER', !env.smtpPass && 'SMTP_PASS', !env.smtpFrom && 'SMTP_FROM'].filter(Boolean);
  if (missing.length) return { ready: false, sender: null, error: `Set ${missing.join(', ')} in .env` };
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.smtpFrom) || /[\r\n]/.test(env.smtpFrom)) {
    return { ready: false, sender: null, error: 'SMTP_FROM must be a valid email address' };
  }
  return { ready: true, sender: env.smtpFrom };
}

export async function sendSmtp(to: string, subject: string, body: string): Promise<string> {
  const status = smtpStatus();
  if (!status.ready) throw new Error(status.error);
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    requireTLS: !env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  try {
    const result = await transport.sendMail({ from: env.smtpFrom, to, subject, text: body });
    if (!result.accepted.includes(to)) {
      const error = new Error(`SMTP server rejected ${to}`) as Error & { code: string };
      error.code = 'EENVELOPE';
      throw error;
    }
    return result.messageId;
  } finally { transport.close(); }
}
