import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { fileURLToPath } from 'node:url';

const appsRoot = fileURLToPath(new URL('../', import.meta.url));
const discovered = discoverPages(appsRoot);
const routes = discoverPageRoutes(discovered);
const legacy = new Map<string, string[]>();
const legacyTypes = new Set(['ListToolbar', 'StatusTabs', 'DataGrid', 'GridView', 'DocumentSummary']);

for (const [id, page] of discovered.pages) {
  const types: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.type === 'string' && legacyTypes.has(record.type)) types.push(record.type);
    Object.values(record).forEach(visit);
  };
  visit(page.config.components || []);
  if (types.length) legacy.set(id, [...new Set(types)]);
}

const routePages = new Set(routes.map(route => route.page));
const unrouted = [...discovered.pages.keys()].filter(id => !routePages.has(id));
const errors: string[] = [];
for (const [id, types] of legacy) errors.push(`${id}: unsupported component(s) ${types.join(', ')}`);
for (const id of unrouted) errors.push(`${id}: no discoverable route`);

console.log(`UI audit: ${discovered.pages.size} pages, ${routes.length} routes, ${discovered.datasources.size} datasources`);
console.log(`Shared pages: ${discovered.pages.size - legacy.size}`);
if (legacy.size) console.log(`Legacy pages: ${legacy.size}`);
if (unrouted.length) console.log(`Unrouted pages: ${unrouted.length}`);

if (errors.length) {
  console.error('\nUI audit failures:');
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('UI audit passed: every discovered page uses supported shared components and has a route.');
}
