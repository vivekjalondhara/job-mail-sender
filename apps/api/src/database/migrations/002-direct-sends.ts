import { DataTypes, type QueryInterface, type Transaction } from 'sequelize';

export async function up(query: QueryInterface, transaction: Transaction): Promise<void> {
  await query.createTable('direct_sends', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    recipient: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    message_id: { type: DataTypes.STRING, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, { transaction });
}
