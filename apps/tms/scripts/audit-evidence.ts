import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(import.meta.dir, '../..', '..');
const pagesRoot = join(repoRoot, 'apps/tms/pages');
const evidenceRoot = join(repoRoot, '.scratch/movedx-feature-parity/evidence');

const pageYamlCount = readdirSync(pagesRoot).filter(file => file.endsWith('.yaml')).length;
const evidenceDirs = readdirSync(evidenceRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort();

const hasAny = (dir: string, names: string[]) => names.some(name => existsSync(join(evidenceRoot, dir, name)));
const controlsCount = evidenceDirs.filter(dir => existsSync(join(evidenceRoot, dir, 'controls.md'))).length;
const desktopCount = evidenceDirs.filter(dir => hasAny(dir, ['local-desktop.png', 'list-desktop.png', 'detail-desktop.png', 'local-detail-desktop.png', 'debit-notes-desktop.png', 'payment-requests-desktop.png'])).length;
const tabletCount = evidenceDirs.filter(dir => hasAny(dir, ['local-tablet.png', 'list-tablet.png', 'detail-tablet.png', 'local-detail-tablet.png', 'debit-notes-tablet.png', 'payment-requests-tablet.png'])).length;
const referenceCount = evidenceDirs.filter(dir => hasAny(dir, ['reference-desktop.png', 'reference-tablet.png'])).length;

const missingControls = evidenceDirs.filter(dir => !existsSync(join(evidenceRoot, dir, 'controls.md')));
const missingDesktop = evidenceDirs.filter(dir => !hasAny(dir, ['local-desktop.png', 'list-desktop.png', 'detail-desktop.png', 'local-detail-desktop.png', 'debit-notes-desktop.png', 'payment-requests-desktop.png']));
const missingTablet = evidenceDirs.filter(dir => !hasAny(dir, ['local-tablet.png', 'list-tablet.png', 'detail-tablet.png', 'local-detail-tablet.png', 'debit-notes-tablet.png', 'payment-requests-tablet.png']));

console.log(`page_yaml=${pageYamlCount} evidence_dirs=${evidenceDirs.length} controls=${controlsCount} local_desktop=${desktopCount} local_tablet=${tabletCount} reference_dirs=${referenceCount}`);
for (const [label, values] of [['missing_controls', missingControls], ['missing_desktop', missingDesktop], ['missing_tablet', missingTablet]] as const) {
  if (values.length) console.log(`${label}=${values.join(',')}`);
}

if (missingControls.length || missingDesktop.length || missingTablet.length) process.exit(1);
