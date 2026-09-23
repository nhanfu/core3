import { strFromU8, strToU8, unzipSync, zip } from 'fflate';

/** Package the engine's OOXML and embedded binary parts without dropping images. */
export async function exportWorkbookXlsx(model: any): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = Object.create(null);
  for (const file of model.exportXLSX().files) {
    if (typeof file.content === 'string') files[file.path] = strToU8(file.content);
    else {
      const match = /^data:image\/(?:png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(file.imageSrc || '');
      if (!match) throw new Error('Export requires embedded image data. An image in this workbook is unavailable.');
      files[file.path] = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
    }
  }
  return new Promise((resolve, reject) => zip(files, (error, bytes) => error ? reject(error) : resolve(bytes)));
}

/** Prepare the pinned engine's XLSX input, enforcing limits before inflation. */
export function readWorkbookXlsx(bytes: Uint8Array, maxExpandedBytes: number, maxFiles: number) {
  let total = 0;
  let count = 0;
  const names = new Set<string>();
  const files = unzipSync(bytes, { filter: file => {
    total += file.originalSize;
    if (++count > maxFiles || total > maxExpandedBytes) throw new Error('Expanded workbook exceeds the configured import limit');
    if (names.has(file.name) || file.name.startsWith('/') || file.name.includes('..') || file.name.includes('\\')) throw new Error('Invalid workbook archive path');
    names.add(file.name);
    return true;
  } });
  if (!files['[Content_Types].xml'] || !files['xl/workbook.xml']) throw new Error('Expected an XLSX workbook');
  const data: Record<string, any> = Object.create(null);
  const mime: Record<string, string> = { png: 'png', jpg: 'jpeg', jpeg: 'jpeg', gif: 'gif', webp: 'webp' };
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith('.xml') || name.endsWith('.rels')) {
      const xml = strFromU8(content);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML document types and entities are unsupported');
      data[name] = xml;
    } else if (name.includes('media/image')) {
      const extension = name.split('.').pop()!.toLowerCase();
      if (!mime[extension]) throw new Error(`Unsupported embedded image format: ${extension}`);
      let binary = '';
      for (let offset = 0; offset < content.length; offset += 8192) binary += String.fromCharCode(...content.subarray(offset, offset + 8192));
      data[name] = { imageSrc: `data:image/${mime[extension]};base64,${btoa(binary)}` };
    }
  }
  return data;
}
