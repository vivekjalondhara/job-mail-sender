import { Router } from 'express';
import multer from 'multer';
import { Campaign, MailJob } from '../../database/models.js';
import { env } from '../../config/env.js';
import { senderReady } from '../mailer/index.js';
import { smtpStatus } from '../mailer/smtp.service.js';
import { campaignDetail, campaignList, createCampaign, preview } from './campaigns.service.js';

export const campaignsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

function idFrom(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid campaign or template ID.');
  return id;
}

campaignsRouter.post('/api/preview', upload.single('file'), async (req, res) => {
  try { res.json(await preview(idFrom(req.body.templateId), req.file?.buffer)); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

campaignsRouter.post('/api/campaigns', upload.single('file'), async (req, res) => {
  try { res.status(201).json(await createCampaign(idFrom(req.body.templateId), String(req.body.name || ''), req.file?.buffer)); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

campaignsRouter.get('/api/campaigns', async (_req, res) => res.json(await campaignList()));

campaignsRouter.get('/api/campaigns/:id', async (req, res) => {
  const detail = await campaignDetail(idFrom(req.params.id));
  if (!detail) { res.status(404).json({ error: 'Campaign not found.' }); return; }
  res.json(detail);
});

campaignsRouter.post('/api/campaigns/:id/:action', async (req, res) => {
  const id = idFrom(req.params.id);
  const campaign = await Campaign.findByPk(id);
  if (!campaign) { res.status(404).json({ error: 'Campaign not found.' }); return; }
  if (req.params.action === 'start') {
    if (!await senderReady()) {
      res.status(400).json({ error: env.smtpEnabled ? smtpStatus().error : 'Connect Gmail first.' });
      return;
    }
    await Campaign.update({ status: 'paused' }, { where: { status: 'running' } });
    await campaign.update({ status: 'running' });
  } else if (req.params.action === 'pause') {
    await campaign.update({ status: 'paused' });
  } else if (req.params.action === 'retry-failed') {
    await MailJob.update({ status: 'pending', error: null }, { where: { campaignId: id, status: 'failed' } });
  } else {
    res.status(404).json({ error: 'Unknown action.' }); return;
  }
  res.json(await campaignDetail(id));
});
