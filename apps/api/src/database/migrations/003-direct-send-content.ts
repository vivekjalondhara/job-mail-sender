import { DataTypes, type QueryInterface, type Transaction } from 'sequelize';

export async function up(query: QueryInterface, transaction: Transaction): Promise<void> {
  await query.addColumn('direct_sends', 'body', { type: DataTypes.TEXT, allowNull: true }, { transaction });
  await query.addColumn('direct_sends', 'attachment_names', { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' }, { transaction });
}
