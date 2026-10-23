import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Account, Campaign } from '../../database/models.js';
import { env } from '../../config/env.js';
import { exchangeGoogleCode, googleAuthUrl, encryptToken } from '../mailer/google.service.js';
import { smtpStatus } from '../mailer/smtp.service.js';

export const accountsRouter = Router();
let oauthState: string | null = null;

accountsRouter.get('/api/status', async (_req, res) => {
  const account = await Account.findByPk(1);
  res.json({
    account: account?.email || null,
    mode: env.smtpEnabled ? 'smtp' : 'gmail',
    smtp: smtpStatus(),
    dailyLimit: env.dailySendLimit,
    intervalMs: env.sendIntervalMs,
  });
});

accountsRouter.get('/auth/google', (_req, res) => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
    res.status(500).send('Set Google OAuth credentials in .env first.');
    return;
  }
  oauthState = randomBytes(32).toString('hex');
  res.redirect(googleAuthUrl(oauthState));
});

accountsRouter.get('/auth/google/callback', async (req, res) => {
  if (!oauthState || req.query.state !== oauthState || typeof req.query.code !== 'string') {
    res.status(400).send('Invalid OAuth response.');
    return;
  }
  oauthState = null;
  try {
    const result = await exchangeGoogleCode(req.query.code);
    await Account.upsert({ id: 1, email: result.email, refreshToken: encryptToken(result.refreshToken) });
    res.redirect(`${env.webOrigin}/?connected=1`);
  } catch (error) {
    res.status(500).send(`Gmail connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

accountsRouter.post('/api/disconnect', async (_req, res) => {
  await Account.destroy({ where: { id: 1 } });
  if (!env.smtpEnabled) await Campaign.update({ status: 'paused' }, { where: { status: 'running' } });
  res.json({ ok: true });
});
