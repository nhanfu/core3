import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/chat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Discuss Voice & Video parity', () => {
  test('joins Odoo action menu, page and API by page.id', () => {
    const page = yaml('pages/voice-video.yaml');
    const api = yaml('api/voice-video.yaml');
    const manifest = yaml('manifest.yaml');
    const menu = manifest.menu.groups.find((group: any) => group.id === 'configuration').items.find((item: any) => item.label === 'Voice & Video');
    expect(page.page).toMatchObject({ id: 'chat-voice-video', route: '/chat/voice-video', auth: { require: ['chat.read'] } });
    expect(api.page.id).toBe(page.page.id);
    expect(discoverPages(join(import.meta.dir, '..')).pageDatasources.get('chat-voice-video')).toEqual(['chat_call_settings']);
    expect(menu).toMatchObject({ path: '/chat/voice-video', permission: 'chat.read' });
    expect(page.components[0].tabs[0].sections.map((section: any) => section.title)).toEqual(['Voice', 'Video', 'Technical Settings']);
  });

  test('seeds stable settings and exposes empty and transport states', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_call_settings_migrations', ['schema', 'data']);
    const source = yaml('api/voice-video.yaml').datasources[0];
    expect(await repository.querySource(source, { fixture_state: null }, 0, 1)).toMatchObject({ data: { id: 'chat-call-settings', row_version: 1, voice_mode: 'voice_detection', push_to_talk_delay_ms: 250 } });
    expect((await repository.querySource(source, { fixture_state: 'empty' }, 0, 1)).data).toEqual({});
    await expect(repository.querySource(source, { fixture_state: 'transport_error' }, 0, 1)).rejects.toMatchObject({ status: 503, code: 'CHAT_CALL_SETTINGS_UNAVAILABLE' });
    database.close();
  });

  test('saves valid settings and rejects stale, missing, and invalid updates', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'chat_call_settings_mutations', ['schema', 'data']);
    const mutation = yaml('api/voice-video.yaml').actions[0].mutation;
    const values = { microphone: 'usb-microphone', audio_output: 'usb-headset', voice_mode: 'push_to_talk', voice_detection_sensitivity: 60, push_to_talk_delay_ms: 300, camera: 'usb-camera', show_only_video: true, blur_video: true, background_blur_intensity: 50, edge_blur_intensity: 25, log_rtc_events: true };
    expect(await repository.executeMutation(mutation, { id: 'chat-call-settings', expected_row_version: 1, values })).toMatchObject({ id: 'chat-call-settings', row_version: 2, ...values });
    await expect(repository.executeMutation(mutation, { id: 'chat-call-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 409, code: 'CHAT_CALL_SETTINGS_STALE' });
    await expect(repository.executeMutation(mutation, { id: 'missing-settings', expected_row_version: 1, values })).rejects.toMatchObject({ status: 404, code: 'CHAT_CALL_SETTINGS_NOT_FOUND' });
    await expect(repository.executeMutation(mutation, { id: 'chat-call-settings', expected_row_version: 2, values: { ...values, push_to_talk_delay_ms: 3000 } })).rejects.toMatchObject({ status: 422, code: 'CHAT_CALL_SETTINGS_VALUES_INVALID' });
    database.close();
  });
});
