import express, { type ErrorRequestHandler } from 'express';
import { join } from 'node:path';
import { env } from './config/env.js';
import { sequelize } from './database/sequelize.js';
import { DirectSend } from './database/models.js';
import { accountsRouter } from './modules/accounts/accounts.routes.js';
import { templatesRouter } from './modules/templates/templates.routes.js';
import { campaignsRouter } from './modules/campaigns/campaigns.routes.js';
import { directRouter } from './modules/mailer/direct.routes.js';

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && ![env.webOrigin, `http://127.0.0.1:${env.port}`].includes(origin)) {
      res.status(403).json({ error: 'Invalid origin' }); return;
    }
  }
  next();
});
app.use(accountsRouter, templatesRouter, campaignsRouter, directRouter);
app.use(express.static(join(env.rootDir, 'apps', 'web', 'dist')));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) { next(); return; }
  res.sendFile(join(env.rootDir, 'apps', 'web', 'dist', 'index.html'));
});
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(typeof error.code === 'string' && error.code.startsWith('LIMIT_') ? 400 : 500).json({ error: error.message || 'Server error' });
};
app.use(errors);

await sequelize.authenticate();
await DirectSend.update({ status: 'uncertain', error: 'API stopped during send; check Sent or provider logs before retrying.' }, { where: { status: 'sending' } });
app.listen(env.port, '127.0.0.1', () => console.log(`Mail Sender API: http://127.0.0.1:${env.port}`));
