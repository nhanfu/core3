import { inflateRawSync } from 'node:zlib';

const decoder = new TextDecoder();

function read16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function read32(view: DataView, offset: number) { return view.getUint32(offset, true); }

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function columnIndex(name: string): number {
  let result = 0;
  for (const char of name) result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
}

function extractZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  for (let offset = 0; offset + 46 <= bytes.length; offset++) {
    if (read32(view, offset) !== 0x02014b50) continue;
    const method = read16(view, offset + 10);
    const compressedSize = read32(view, offset + 20);
    const nameLength = read16(view, offset + 28);
    const extraLength = read16(view, offset + 30);
    const commentLength = read16(view, offset + 32);
    const localOffset = read32(view, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localView = new DataView(bytes.buffer, bytes.byteOffset + localOffset, bytes.length - localOffset);
    const localNameLength = read16(localView, 26);
    const localExtraLength = read16(localView, 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    if (method !== 0 && method !== 8) throw new Error(`Unsupported XLSX compression method ${method}`);
    entries.set(name, method === 0 ? compressed : new Uint8Array(inflateRawSync(compressed)));
    offset += 46 + nameLength + extraLength + commentLength - 1;
  }
  if (!entries.has('xl/worksheets/sheet1.xml')) throw new Error('XLSX worksheet not found');
  return entries;
}

function cellValue(body: string, type: string | undefined, shared: string[]): string {
  const value = decodeXml(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || '');
  if (type === 's') return shared[Number(value)] || '';
  if (type === 'inlineStr') return decodeXml(body.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/)?.[1] || '');
  return value;
}

/** Convert a tabular OOXML workbook into the CSV contract used by master imports. */
export function xlsxToCsv(bytes: Uint8Array): string {
  const entries = extractZipEntries(bytes);
  const sharedXml = entries.get('xl/sharedStrings.xml');
  const shared = sharedXml
    ? [...decoder.decode(sharedXml).matchAll(/<si>[\s\S]*?<t(?:\s[^>]*)?>([\s\S]*?)<\/t>[\s\S]*?<\/si>/g)].map(match => decodeXml(match[1]))
    : [];
  const xml = decoder.decode(entries.get('xl/worksheets/sheet1.xml')!);
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!reference) continue;
      cells[columnIndex(reference)] = cellValue(cellMatch[2], cellMatch[1].match(/\bt="([^"]+)"/)?.[1], shared);
    }
    rows.push(cells.map(value => value || '').map(value => /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value));
  }
  return rows.map(row => row.join(',')).join('\r\n');
}
