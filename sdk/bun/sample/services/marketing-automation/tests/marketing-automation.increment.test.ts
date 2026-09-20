import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '..');
const sampleRoot = join(serviceRoot, '../..');
const yaml = async (file: string) => Bun.YAML.parse(await Bun.file(join(serviceRoot, file)).text()) as any;

describe('Marketing Automation bounded increment', () => {
  test('keeps page layouts separate from page-bound API fragments', async () => {
    const discovered = discoverPages(sampleRoot);
    expect(discovered.pageDatasources.get('automations')).toEqual(['automation_states', 'marketing_automations']);
    expect(discovered.pageDatasources.get('automation-detail')).toEqual(['automation_detail', 'automation_enrollments']);
    expect(discovered.pageDatasources.get('automation-analysis')).toEqual(['automation_analysis_totals', 'automation_analysis_states']);
    expect([...discovered.workflows.keys()]).toContain('marketing_automations');

    for (const file of ['pages/automations.yaml', 'pages/automation-detail.yaml', 'pages/analysis.yaml']) {
      const page = await yaml(file);
      expect(page.datasources, file).toBeUndefined();
      expect(page.actions, file).toBeUndefined();
    }

    const api = await yaml('api/automations.yaml');
    const detail = await yaml('api/automation-detail.yaml');
    const actions = [...(api.actions ?? []), ...(detail.actions ?? [])];
    expect(actions.find((action: any) => action.id === 'create_automation')).toMatchObject({ permission: 'marketing_automation.write' });
    expect(actions.find((action: any) => action.id === 'enroll_contact')).toMatchObject({ permission: 'marketing_automation.write' });
    expect(actions.find((action: any) => action.id === 'delete_automation')).toMatchObject({ permission: 'marketing_automation.manage' });
  });

  test('persists deterministic fixtures and enforces CRUD, enrollment, and workflow guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'marketing_automation_increment_test', ['schema', 'data']);
    await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'marketing_automation_increment_test', ['schema', 'data']);

    const seeded = await repository.query('SELECT id, state, active FROM marketing_automations ORDER BY id');
    expect(seeded).toEqual([
      { id: 'automation-demo-001', state: 'Draft', active: true },
      { id: 'automation-demo-002', state: 'Published', active: true },
      { id: 'automation-demo-003', state: 'Paused', active: true },
    ]);
    expect(await repository.query('SELECT COUNT(*) AS count FROM automation_enrollments')).toEqual([{ count: 2 }]);

    const api = await yaml('api/automations.yaml');
    const detail = await yaml('api/automation-detail.yaml');
    const action = (id: string) => [...(api.actions ?? []), ...(detail.actions ?? [])].find((candidate: any) => candidate.id === id);
    const workflow = (await yaml('pages/automation-workflow.yaml')).workflow;
    const transition = (id: string) => workflow.transitions.find((candidate: any) => candidate.id === id).mutation;

    const created = await repository.executeMutation(action('create_automation').mutation, {
      values: { name: 'QA onboarding journey', trigger_type: 'Contact created', action_type: 'Send email' },
    });
    expect(created).toMatchObject({ id: 'automation-qa-onboarding-journey', state: 'Draft', active: true, row_version: 1 });

    const edited = await repository.executeMutation(action('edit_automation').mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { name: 'QA onboarding journey v2', trigger_type: 'Contact created', action_type: 'Send email' },
    });
    expect(edited).toMatchObject({ name: 'QA onboarding journey v2', row_version: 2 });
    await expect(repository.executeMutation(action('edit_automation').mutation, {
      id: created.id,
      expected_row_version: 1,
      values: { name: 'Stale edit', trigger_type: 'Contact created', action_type: 'Send email' },
    })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });

    const published = await repository.executeMutation(transition('publish'), { id: created.id, expected_row_version: 2 });
    expect(published).toMatchObject({ state: 'Published', row_version: 3 });
    const enrollment = await repository.executeMutation(action('enroll_contact').mutation, {
      values: { automation_id: created.id, contact_name: 'QA Contact', contact_email: 'qa.contact@example.com' },
    });
    expect(enrollment).toMatchObject({ automation_id: created.id, automation_name: 'QA onboarding journey v2' });
    await expect(repository.executeMutation(action('enroll_contact').mutation, {
      values: { automation_id: created.id, contact_name: 'QA Contact', contact_email: 'qa.contact@example.com' },
    })).rejects.toMatchObject({ status: 409, code: 'MARKETING_AUTOMATION_CONTACT_EXISTS' });

    const running = await repository.executeMutation(transition('run'), { id: created.id, expected_row_version: 4 });
    await expect(repository.executeMutation(action('archive_automation').mutation, {
      id: created.id,
      expected_row_version: 5,
      values: { active: false },
    })).rejects.toMatchObject({ status: 409, code: 'MARKETING_AUTOMATION_ARCHIVE_BLOCKED' });
    const paused = await repository.executeMutation(transition('pause'), { id: created.id, expected_row_version: 5 });
    const rerun = await repository.executeMutation(transition('run'), { id: created.id, expected_row_version: 6 });
    const completed = await repository.executeMutation(transition('complete'), { id: created.id, expected_row_version: 7 });
    expect([running.state, paused.state, rerun.state, completed.state]).toEqual(['Running', 'Paused', 'Running', 'Completed']);

    await repository.executeMutation(action('archive_automation').mutation, {
      id: created.id,
      expected_row_version: 8,
      values: { active: false },
    });
    const [archived] = await repository.query('SELECT active, row_version FROM marketing_automations WHERE id = ?', [created.id]);
    expect(archived).toMatchObject({ active: false, row_version: 9 });
    await repository.executeMutation(action('restore_automation').mutation, {
      id: created.id,
      expected_row_version: 9,
      values: { active: true },
    });
    const [restored] = await repository.query('SELECT active, row_version FROM marketing_automations WHERE id = ?', [created.id]);
    expect(restored).toMatchObject({ active: true, row_version: 10 });
  });
});
