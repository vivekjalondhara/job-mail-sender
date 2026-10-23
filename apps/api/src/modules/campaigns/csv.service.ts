import { parse } from 'csv-parse/sync';
import { placeholders, render, type CsvRow } from '../mailer/template.js';

export function readCsv(buffer: Buffer | undefined, subject: string, body: string): { rows: CsvRow[]; errors: string[] } {
  if (!buffer) throw new Error('Choose a CSV file.');
  const records = parse(buffer.toString('utf8').replace(/^\uFEFF/, ''), {
    columns: (headers: string[]) => headers.map(header => header.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRow[];
  if (!records.length) throw new Error('CSV has no recipient rows.');
  if (records.length > 2000) throw new Error('CSV exceeds 2,000 rows. Split it into smaller campaigns.');
  const columns = Object.keys(records[0]);
  if (!columns.includes('email')) throw new Error('CSV must have an email column.');
  const missing = placeholders(`${subject} ${body}`).filter(key => !columns.includes(key));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(', ')}`);
  const seen = new Set<string>();
  const rows: CsvRow[] = [];
  const errors: string[] = [];
  for (const [index, row] of records.entries()) {
    const email = String(row.email || '').toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(email)) {
      errors.push(`Row ${index + 2}: invalid email`); continue;
    }
    if (seen.has(email)) { errors.push(`Row ${index + 2}: duplicate email`); continue; }
    seen.add(email);
    const renderedSubject = render(subject, row);
    if (!renderedSubject.trim() || /[\r\n]/.test(renderedSubject)) {
      errors.push(`Row ${index + 2}: subject is empty or contains a line break`); continue;
    }
    rows.push({ ...row, email });
  }
  if (!rows.length) throw new Error('No valid unique email addresses found.');
  return { rows, errors };
}
