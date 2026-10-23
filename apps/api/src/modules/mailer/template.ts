export type CsvRow = Record<string, string>;

export function render(template: string, row: CsvRow): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => row[key] ?? '');
}

export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map(match => match[1]))];
}
