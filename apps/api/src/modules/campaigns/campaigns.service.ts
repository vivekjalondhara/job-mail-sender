import { Campaign, MailJob, Template } from '../../database/models.js';
import { sequelize } from '../../database/sequelize.js';
import { readCsv } from './csv.service.js';
import { render } from '../mailer/template.js';

export async function campaignDetail(id: number) {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) return null;
  const jobs = await MailJob.findAll({ where: { campaignId: id }, order: [['id', 'ASC']] });
  return { ...campaign.toJSON(), jobs: jobs.map(job => job.toJSON()) };
}

export async function campaignList() {
  const campaigns = await Campaign.findAll({ order: [['id', 'DESC']] });
  return Promise.all(campaigns.map(async campaign => {
    const jobs = await MailJob.findAll({ where: { campaignId: campaign.id }, attributes: ['status'] });
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      createdAt: campaign.createdAt,
      total: jobs.length,
      sent: jobs.filter(job => job.status === 'sent').length,
      failed: jobs.filter(job => job.status === 'failed').length,
      uncertain: jobs.filter(job => job.status === 'uncertain').length,
    };
  }));
}

export async function preview(templateId: number, buffer: Buffer | undefined) {
  const template = await Template.findByPk(templateId);
  if (!template) throw new Error('Select a saved template.');
  const { rows, errors } = readCsv(buffer, template.subject, template.body);
  return {
    count: rows.length,
    errors,
    recipients: rows.slice(0, 50).map(row => ({ to: row.email, subject: render(template.subject, row) })),
    samples: rows.slice(0, 3).map(row => ({ to: row.email, subject: render(template.subject, row), body: render(template.body, row) })),
  };
}

export async function createCampaign(templateId: number, name: string, buffer: Buffer | undefined) {
  const template = await Template.findByPk(templateId);
  if (!template) throw new Error('Select a saved template.');
  const { rows, errors } = readCsv(buffer, template.subject, template.body);
  const campaign = await sequelize.transaction(async transaction => {
    const created = await Campaign.create({
      name: (name || `${template.name} · ${new Date().toLocaleDateString()}`).trim().slice(0, 100),
      templateId: template.id,
      subject: template.subject,
      body: template.body,
    }, { transaction });
    await MailJob.bulkCreate(rows.map(row => ({ campaignId: created.id, recipient: row.email, rowJson: JSON.stringify(row) })), { transaction });
    return created;
  });
  return { campaign: await campaignDetail(campaign.id), importErrors: errors };
}
