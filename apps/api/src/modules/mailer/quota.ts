import { Op } from 'sequelize';
import { DirectSend, MailJob } from '../../database/models.js';

export async function sendsInLastDay(): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [campaigns, direct] = await Promise.all([
    MailJob.count({ where: { [Op.or]: [
      { status: 'sent', sentAt: { [Op.gte]: since } },
      { status: { [Op.in]: ['uncertain', 'sending'] }, updatedAt: { [Op.gte]: since } },
    ] } }),
    DirectSend.count({ where: { status: { [Op.in]: ['sending', 'sent', 'uncertain'] }, createdAt: { [Op.gte]: since } } }),
  ]);
  return campaigns + direct;
}
