import { discoverPages } from '@core3/server/discovery';
import { fileURLToPath } from 'node:url';

const discovered = discoverPages(fileURLToPath(new URL('../', import.meta.url)));
const targetModule = Bun.argv[2];
const errors: string[] = [];

function collectSourceIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return ids;
  if (Array.isArray(value)) { value.forEach((entry) => collectSourceIds(entry, ids)); return ids; }
  const record = value as Record<string, unknown>;
  for (const key of ['source', 'message_source', 'attachment_source', 'follower_source', 'follower_candidates_source', 'template_source']) {
    if (typeof record[key] === 'string') ids.add(record[key] as string);
  }
  Object.values(record).forEach((entry) => collectSourceIds(entry, ids));
  return ids;
}

for (const [pageId, page] of discovered.pages) {
  if (targetModule && page.module !== targetModule) continue;
  for (const sourceId of collectSourceIds(page.config.components || [])) {
    const source = discovered.datasources.get(sourceId);
    if (source && source.type !== 'service' && !source.mock_data) errors.push(`${pageId}: datasource ${sourceId} has no mock_data declaration`);
  }
}

console.log(`Mock-data audit: ${[...discovered.pages.values()].filter((page) => !targetModule || page.module === targetModule).length} pages${targetModule ? ` in ${targetModule}` : ''}`);
if (errors.length) { console.error('\nMock-data audit failures:\n' + [...new Set(errors)].map((error) => `- ${error}`).join('\n')); process.exitCode = 1; }
else console.log('Mock-data audit passed: every referenced datasource declares mock_data.');
