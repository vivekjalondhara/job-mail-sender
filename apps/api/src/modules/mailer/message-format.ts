export function htmlFromPlainText(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const paragraphs = escaped
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => `<p style="margin:0 0 16px">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#202124">${paragraphs}</div>`;
}
