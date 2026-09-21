import { cpSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { discoverPages } from '@core3/server/discovery';

const forumRoot = join(import.meta.dir, '../services/forum');

/** Run the real YAML discovery contract without unrelated dirty modules. */
export function discoverForumPages() {
  const appRoot = mkdtempSync('/tmp/core3-forum-discovery-');
  const servicesRoot = join(appRoot, 'services');
  mkdirSync(servicesRoot);
  cpSync(forumRoot, join(servicesRoot, 'forum'), { recursive: true });
  return discoverPages(appRoot);
}
