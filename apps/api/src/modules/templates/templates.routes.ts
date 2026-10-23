import { Router } from 'express';
import { Template } from '../../database/models.js';

export const templatesRouter = Router();

function templateValues(body: Record<string, unknown> | undefined) {
  const { name, subject, body: message } = body || {};
  if (![name, subject, message].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Name, subject, and message are required.');
  }
  const values = { name: (name as string).trim(), subject: (subject as string).trim(), body: (message as string).trim() };
  if (values.name.length > 100 || values.subject.length > 200 || values.body.length > 20000 || /[\r\n]/.test(values.subject)) {
    throw new Error('Template exceeds a length limit or subject contains a line break.');
  }
  return values;
}

templatesRouter.get('/api/templates', async (_req, res) => {
  res.json(await Template.findAll({ order: [['id', 'DESC']] }));
});

templatesRouter.post('/api/templates', async (req, res) => {
  try { res.status(201).json(await Template.create(templateValues(req.body))); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

templatesRouter.put('/api/templates/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid template ID.' }); return;
  }
  const template = await Template.findByPk(id);
  if (!template) { res.status(404).json({ error: 'Template not found.' }); return; }
  try { res.json(await template.update(templateValues(req.body))); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
