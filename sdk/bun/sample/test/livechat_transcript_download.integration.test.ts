import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('Live Chat public transcript download parity', () => {
  test('traces Odoo HTTP/CORS routes and binds the download to the visitor page', () => {
    const source = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/main.py', 'utf8');
    const cors = readFileSync('/home/nhanjs/projects/odoo/addons/im_livechat/controllers/cors/main.py', 'utf8');
    const page = yaml('pages/visitor-session.yaml');
    const api = yaml('api/visitor-session.yaml');
    const download = action(api, 'download_livechat_transcript');

    expect(source).toContain('@http.route("/im_livechat/download_transcript/<int:channel_id>", type="http", auth="public")');
    expect(source).toContain('("Content-Type", "application/pdf")');
    expect(cors).toContain('@route("/im_livechat/cors/download_transcript/<int:channel_id>", type="http", auth="public", cors="*")');
    expect(page.page).toMatchObject({ id: 'livechat-visitor-session', route: '/livechat/visitor-session' });
    expect(api.page).toEqual({ id: page.page.id });
    expect(api.datasources.map((candidate: any) => candidate.id)).toContain('livechat_public_transcript');
    expect(download).toMatchObject({ id: 'download_livechat_transcript', type: 'client', permission: 'livechat.public' });
    expect(download.script).toContain('/im_livechat/cors/download_transcript/<channel_id>');
    expect(download.script).toContain('application/pdf');
    expect(page.components[0].header_actions).toContainEqual(expect.objectContaining({
      id: 'download_livechat_transcript',
      show_if: "record.status === 'Closed' && record.transcript_available === true",
    }));
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get(page.page.id)).toContain('livechat_public_transcript');
  });

  test('returns only closed token-owned transcript artifacts and replays the seed idempotently', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    const migrations = join(root, 'migrations');
    await migrateDatabase(repository, migrations, undefined, 'livechat_transcript_download_test', ['schema', 'data']);
    await migrateDatabase(repository, migrations, undefined, 'livechat_transcript_download_test', ['schema', 'data']);
    const api = yaml('api/visitor-session.yaml');
    const transcript = api.datasources.find((candidate: any) => candidate.id === 'livechat_public_transcript');

    const available = await repository.querySource(transcript, { id: 'livechat-session-demo-001', visitor_token: 'livechat-visitor-token-001', fixture_state: null }, 0, 1);
    expect(available.data).toMatchObject({ session_id: 'livechat-session-demo-001', file_name: 'transcript_livechat-session-demo-001.pdf', mime_type: 'application/pdf' });
    expect(Buffer.from(available.data.content_base64, 'base64').subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(await repository.query('SELECT COUNT(*) AS count FROM livechat_transcript_downloads')).toEqual([{ count: 2 }]);

    const wrongVisitor = await repository.querySource(transcript, { id: 'livechat-session-demo-001', visitor_token: 'wrong-token', fixture_state: null }, 0, 1);
    expect(wrongVisitor.data).toEqual({});
    const open = await repository.querySource(transcript, { id: 'livechat-session-demo-002', visitor_token: 'livechat-visitor-token-002', fixture_state: null }, 0, 1);
    expect(open.data).toEqual({});
    database.close();
  });

  test('retains the public transcript bytes through a file-backed restart', async () => {
    const databasePath = `/tmp/core3-livechat-transcript-download-${crypto.randomUUID()}.duckdb`;
    const migrationName = `livechat_transcript_download_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      first.close();
      first = undefined;
      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      const artifact = (await secondRepository.query('SELECT file_name, mime_type, content_base64 FROM livechat_transcript_downloads WHERE session_id = ?', ['livechat-session-demo-003']))[0];
      expect(artifact).toMatchObject({ file_name: 'transcript_livechat-session-demo-003.pdf', mime_type: 'application/pdf' });
      expect(Buffer.from(artifact.content_base64, 'base64').subarray(0, 8).toString()).toBe('%PDF-1.4');
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
