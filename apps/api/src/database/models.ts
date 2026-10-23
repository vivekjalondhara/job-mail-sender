import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from 'sequelize';
import { sequelize } from './sequelize.js';

export class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare refreshToken: string;
}
Account.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  email: { type: DataTypes.STRING, allowNull: false },
  refreshToken: { type: DataTypes.TEXT, allowNull: false, field: 'refresh_token' },
}, { sequelize, tableName: 'accounts', timestamps: false });

export class Template extends Model<InferAttributes<Template>, InferCreationAttributes<Template>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare subject: string;
  declare body: string;
  declare createdAt: CreationOptional<Date>;
}
Template.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { sequelize, tableName: 'templates', timestamps: false });

export type CampaignStatus = 'paused' | 'running' | 'complete';
export class Campaign extends Model<InferAttributes<Campaign>, InferCreationAttributes<Campaign>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare templateId: number;
  declare subject: string;
  declare body: string;
  declare status: CreationOptional<CampaignStatus>;
  declare createdAt: CreationOptional<Date>;
}
Campaign.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  templateId: { type: DataTypes.INTEGER, allowNull: false, field: 'template_id' },
  subject: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'paused' },
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { sequelize, tableName: 'campaigns', timestamps: false });

export type JobStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'uncertain';
export class MailJob extends Model<InferAttributes<MailJob>, InferCreationAttributes<MailJob>> {
  declare id: CreationOptional<number>;
  declare campaignId: number;
  declare recipient: string;
  declare rowJson: string;
  declare status: CreationOptional<JobStatus>;
  declare messageId: CreationOptional<string | null>;
  declare error: CreationOptional<string | null>;
  declare sentAt: CreationOptional<Date | null>;
  declare updatedAt: CreationOptional<Date>;
}
MailJob.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaignId: { type: DataTypes.INTEGER, allowNull: false, field: 'campaign_id' },
  recipient: { type: DataTypes.STRING, allowNull: false },
  rowJson: { type: DataTypes.TEXT, allowNull: false, field: 'row_json' },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
  messageId: { type: DataTypes.STRING, allowNull: true, field: 'message_id' },
  error: { type: DataTypes.TEXT, allowNull: true },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, { sequelize, tableName: 'jobs', timestamps: false, indexes: [{ unique: true, fields: ['campaign_id', 'recipient'] }] });

Campaign.hasMany(MailJob, { foreignKey: 'campaignId', as: 'jobs' });
MailJob.belongsTo(Campaign, { foreignKey: 'campaignId', as: 'campaign' });
