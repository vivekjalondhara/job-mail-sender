import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(currentDir, '..', '..', '..', '..');
config({ path: join(rootDir, '.env') });

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  const result = Number(value ?? fallback);
  if (!Number.isSafeInteger(result) || result < 1) throw new Error(`${name} must be a positive integer`);
  return result;
}

const smtpFlag = (process.env.SMTP_ENABLED ?? 'false').toLowerCase();
if (!['true', 'false'].includes(smtpFlag)) throw new Error('SMTP_ENABLED must be true or false');

export const env = {
  rootDir,
  databasePath: process.env.MAIL_DB_PATH || join(rootDir, 'data', 'mail-sender.sqlite'),
  port: positiveInteger(process.env.PORT, 3100, 'PORT'),
  webOrigin: process.env.WEB_ORIGIN || 'http://127.0.0.1:5173',
  sendIntervalMs: positiveInteger(process.env.SEND_INTERVAL_MS, 30000, 'SEND_INTERVAL_MS'),
  dailySendLimit: positiveInteger(process.env.DAILY_SEND_LIMIT, 50, 'DAILY_SEND_LIMIT'),
  encryptionKey: process.env.APP_ENCRYPTION_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || '',
  smtpEnabled: smtpFlag === 'true',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: positiveInteger(process.env.SMTP_PORT, 587, 'SMTP_PORT'),
  smtpSecure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  senderName: process.env.SENDER_NAME?.trim() || '',
};

if (!/^[a-f0-9]{64}$/i.test(env.encryptionKey)) {
  throw new Error('Set APP_ENCRYPTION_KEY to 64 hex characters in .env');
}
