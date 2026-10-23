import { sequelize } from '../database/sequelize.js';
import '../database/models.js';
import { processNextJob, recoverInterruptedJobs } from './mail.worker.js';

await sequelize.authenticate();
await recoverInterruptedJobs();
console.log('Mail worker ready');
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopping = true; });
while (!stopping) {
  try { await processNextJob(); }
  catch (error) { console.error('Worker error:', error); }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
await sequelize.close();
