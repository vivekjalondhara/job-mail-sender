import { DataTypes, type QueryInterface, type Transaction } from 'sequelize';

export async function up(query: QueryInterface, transaction: Transaction): Promise<void> {
  const tables = new Set((await query.showAllTables({ transaction })).map(String));
  if (!tables.has('accounts')) await query.createTable('accounts', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    refresh_token: { type: DataTypes.TEXT, allowNull: false },
  }, { transaction });
  if (!tables.has('templates')) await query.createTable('templates', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { transaction });
  if (!tables.has('campaigns')) await query.createTable('campaigns', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    template_id: { type: DataTypes.INTEGER, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'paused' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { transaction });
  if (!tables.has('jobs')) await query.createTable('jobs', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaign_id: { type: DataTypes.INTEGER, allowNull: false },
    recipient: { type: DataTypes.STRING, allowNull: false },
    row_json: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    gmail_message_id: { type: DataTypes.STRING, allowNull: true },
    message_id: { type: DataTypes.STRING, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { transaction });
  const [columnRows] = await query.sequelize.query('PRAGMA table_info(jobs)', { transaction });
  const columns = new Set((columnRows as Array<{ name: string }>).map(column => column.name));
  if (!columns.has('message_id')) await query.addColumn('jobs', 'message_id', { type: DataTypes.STRING, allowNull: true }, { transaction });
  if (columns.has('gmail_message_id')) await query.sequelize.query('UPDATE jobs SET message_id = gmail_message_id WHERE message_id IS NULL AND gmail_message_id IS NOT NULL', { transaction });
  await query.addIndex('jobs', ['campaign_id', 'recipient'], { name: 'jobs_campaign_recipient_unique', unique: true, transaction });
}

export async function down(query: QueryInterface, transaction: Transaction): Promise<void> {
  for (const table of ['jobs', 'campaigns', 'templates', 'accounts']) await query.dropTable(table, { transaction });
}
