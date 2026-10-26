import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { env } from '../../config/env.js';
import type { MailAttachment } from './smtp.service.js';
import { htmlFromPlainText } from './message-format.js';

const sendScope = 'https://www.googleapis.com/auth/gmail.send';

function client() {
  return new google.auth.OAuth2(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);
}

export function googleAuthUrl(state: string): string {
  return client().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [sendScope, 'openid', 'email'], state });
}

export async function exchangeGoogleCode(code: string): Promise<{ email: string; refreshToken: string }> {
  const auth = client();
  const { tokens } = await auth.getToken(code);
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token. Reconnect and grant access.');
  auth.setCredentials(tokens);
  const user = await google.oauth2({ version: 'v2', auth }).userinfo.get();
  if (!user.data.email) throw new Error('Could not read the connected Gmail address.');
  return { email: user.data.email, refreshToken: tokens.refresh_token };
}

const key = Buffer.from(env.encryptionKey, 'hex');
export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString('base64url')).join('.');
}
export function decryptToken(value: string): string {
  const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export async function sendGmail(account: { email: string; refreshToken: string }, to: string, subject: string, body: string, attachments: MailAttachment[] = []): Promise<string> {
  const auth = client();
  auth.setCredentials({ refresh_token: decryptToken(account.refreshToken) });
  const gmail = google.gmail({ version: 'v1', auth });
  const from = env.senderName ? { name: env.senderName, address: account.email } : account.email;
  const raw = await new MailComposer({ from, to, subject, text: body, html: htmlFromPlainText(body), attachments }).compile().build();
  const response = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: raw.toString('base64url') } });
  if (!response.data.id) throw new Error('Gmail returned no message ID. Check Sent before retrying.');
  return response.data.id;
}
