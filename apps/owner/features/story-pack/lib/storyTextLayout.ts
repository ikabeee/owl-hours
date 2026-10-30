import { storyPackExportCopys as exportCopy } from '../copys/storyPackExportCopys.ts';
type TextBlock = { lines: string[]; size: number; lineHeight: number; y: number };
export function fitStoryText(title: string, body: string, measure: (text: string, size: number, bold: boolean) => number): { title: TextBlock; body: TextBlock; bottom: number } {
  for (let scale = 1; scale >= 0.4; scale -= 0.05) {
    const titleSize = Math.floor(60 * scale), bodySize = Math.floor(40 * scale);
    const titleLines = wrap(title, text => measure(text, titleSize, true));
    const bodyLines = wrap(body, text => measure(text, bodySize, false));
    const titleHeight = Math.ceil(titleSize * 1.14), bodyHeight = Math.ceil(bodySize * 1.2);
    const bodyY = 1400 + titleLines.length * titleHeight + 24;
    const bottom = bodyY + bodyLines.length * bodyHeight;
    if (bottom <= 1810) return {
      title: { lines: titleLines, size: titleSize, lineHeight: titleHeight, y: 1400 },
      body: { lines: bodyLines, size: bodySize, lineHeight: bodyHeight, y: bodyY }, bottom,
    };
  }
  throw new Error(exportCopy.fitFailed);
}
function wrap(text: string, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (char === '\n' || (line && measure(line + char) > 952)) {
      lines.push(line); line = '';
      if (char === '\n') continue;
    }
    line += char;
  }
  if (line) lines.push(line);
  return lines;
}
