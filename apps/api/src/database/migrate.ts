import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DataTypes } from 'sequelize';
import { sequelize } from './sequelize.js';

export async function migrate(): Promise<void> {
  const query = sequelize.getQueryInterface();
  const tables = new Set((await query.showAllTables()).map(String));
  if (!tables.has('SequelizeMeta')) await query.createTable('SequelizeMeta', {
    name: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
  });
  const [applied] = await sequelize.query('SELECT name FROM SequelizeMeta');
  const completed = new Set((applied as Array<{ name: string }>).map(row => row.name));
  const directory = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
  const files = (await readdir(directory)).filter(name => /^\d+-.+\.(ts|js)$/.test(name)).sort();
  for (const file of files) {
    const name = file.replace(/\.(ts|js)$/, '');
    if (completed.has(name)) continue;
    const migration = await import(pathToFileURL(join(directory, file)).href) as { up: (query: ReturnType<typeof sequelize.getQueryInterface>, transaction: import('sequelize').Transaction) => Promise<void> };
    await sequelize.transaction(async transaction => {
      await migration.up(query, transaction);
      await sequelize.query('INSERT INTO SequelizeMeta(name) VALUES (?)', { replacements: [name], transaction });
    });
    console.log(`Applied migration ${name}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]).href)) {
  migrate().then(() => sequelize.close()).catch(error => { console.error(error); process.exitCode = 1; });
}
