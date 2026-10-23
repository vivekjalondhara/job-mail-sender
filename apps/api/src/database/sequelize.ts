import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';

mkdirSync(dirname(env.databasePath), { recursive: true });

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: env.databasePath,
  logging: false,
  retry: { max: 3 },
});
