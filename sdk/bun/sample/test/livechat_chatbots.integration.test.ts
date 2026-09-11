import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { discoverPageRoutes, discoverPages } from '@core3/server/discovery';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const serviceRoot = join(import.meta.dir, '../services/livechat');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(serviceRoot, file), 'utf8')) as any;
const action = (file: string, id: string) => yaml(file).actions.find((candidate: any) => candidate.id === id);

async function repositoryForTest() {
  const database = await DuckDbDatabase.open(':memory:');
  const repository = new YamlRepository(database);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_chatbots_test_migrations', ['schema', 'data']);
  await migrateDatabase(repository, join(serviceRoot, 'migrations'), undefined, 'livechat_chatbots_test_migrations', ['schema', 'data']);
  return { database, repository };
}

describe('Live Chat Chatbots parity', () => {
  test('maps Odoo action 764 and joins page/API fragments by page.id', () => {
    const listPage = yaml('pages/chatbots.yaml');
    const detailPage = yaml('pages/chatbot-detail.yaml');
    const stepPage = yaml('pages/chatbot-step-detail.yaml');
    const listApi = yaml('api/chatbots.yaml');
    const detailApi = yaml('api/chatbot-detail.yaml');
    const stepApi = yaml('api/chatbot-step-detail.yaml');
    const discovered = discoverPages(join(import.meta.dir, '..'));

    expect(listPage.page).toMatchObject({ id: 'livechat-chatbots', route: '/livechat/chatbots', auth: { require: ['livechat.manage'] } });
    expect(detailPage.page).toMatchObject({ id: 'livechat-chatbot-detail', route: '/livechat/chatbots/detail' });
    expect(stepPage.page).toMatchObject({ id: 'livechat-chatbot-step-detail', route: '/livechat/chatbots/steps/detail' });
    for (const [api, page] of [[listApi, listPage], [detailApi, detailPage], [stepApi, stepPage]]) {
      expect(api.page).toEqual({ id: page.page.id });
    }
    expect(discovered.pageDatasources.get('livechat-chatbots')).toContain('livechat_chatbots');
    expect(discovered.pageDatasources.get('livechat-chatbot-detail')).toEqual(expect.arrayContaining(['livechat_chatbot_detail', 'livechat_bot_steps']));
    expect(discovered.pageDatasources.get('livechat-chatbot-step-detail')).toEqual(expect.arrayContaining(['livechat_bot_step_detail', 'livechat_bot_answers']));
    expect(discoverPageRoutes(discovered)).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/livechat/chatbots', page: 'livechat-chatbots', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/chatbots/detail', page: 'livechat-chatbot-detail', module: 'livechat' }),
      expect.objectContaining({ path: '/livechat/chatbots/steps/detail', page: 'livechat-chatbot-step-detail', module: 'livechat' }),
    ]));
    expect(yaml('manifest.yaml').menu.groups.find((group: any) => group.id === 'configuration').items)
      .toContainEqual({ path: '/livechat/chatbots', label: 'Chatbots', icon: 'bot', permission: 'livechat.manage' });
    expect(listPage.components[0]).toMatchObject({ type: 'ListView', source: 'livechat_chatbots', create_action: 'create_livechat_chatbot', row_open_action: 'view_livechat_chatbot' });
    expect(listPage.components[0].columns.map((column: any) => column.label)).toEqual(['Title']);
    expect(detailPage.components[0]).toMatchObject({ type: 'OdooFormView', source: 'livechat_chatbot_detail', title_field: 'title' });
    expect(detailPage.components[0].notebook.tabs).toEqual([{ id: 'script', label: 'Script', content_slot: true }]);
    expect(detailPage.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'livechat_bot_steps', parent_source: 'livechat_chatbot_detail', variant: 'odoo_x2many' });
    expect(detailPage.components[1].columns.map((column: any) => column.label)).toEqual(['Step', 'Message', 'Step Type', 'Answers', 'Only If', '']);
    expect(stepPage.components[1]).toMatchObject({ type: 'LineItemGrid', source: 'livechat_bot_answers', parent_source: 'livechat_bot_step_detail', variant: 'odoo_x2many' });
  });

  test('seeds Odoo-shaped scripts and exercises search, empty, missing, and transport states', async () => {
    const { database, repository } = await repositoryForTest();
    const list = yaml('api/chatbots.yaml').datasources[0];
    const detail = yaml('api/chatbot-detail.yaml').datasources[0];
    const steps = yaml('api/chatbot-detail.yaml').datasources[1];
    const stepDetail = yaml('api/chatbot-step-detail.yaml').datasources[0];
    const answers = yaml('api/chatbot-step-detail.yaml').datasources[1];

    expect((await repository.querySource(list, { q: null, fixture_state: null }, 0, 50)).data.map((row: any) => row.title))
      .toEqual(['Lead Generation Bot', 'Odoo', 'Support Bot', 'Welcome Bot']);
    expect((await repository.querySource(list, { q: 'support', fixture_state: null }, 0, 50)).data).toMatchObject([{ title: 'Support Bot' }]);
    expect((await repository.querySource(list, { q: 'missing', fixture_state: null }, 0, 50)).data).toEqual([]);
    for (const fixture_state of ['empty', 'no_results']) {
      expect((await repository.querySource(list, { q: null, fixture_state }, 0, 50)).data).toEqual([]);
    }
    await expect(repository.querySource(list, { q: null, fixture_state: 'forbidden' }, 0, 50)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_CHATBOTS_FORBIDDEN' });
    await expect(repository.querySource(list, { q: null, fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_CHATBOTS_UNAVAILABLE' });

    expect((await repository.querySource(detail, { id: 'livechat-chatbot-lead-generation', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ title: 'Lead Generation Bot', operator_name: 'Lead Generation Bot', livechat_channel_count: 0, row_version: 1 });
    expect((await repository.querySource(steps, { id: 'livechat-chatbot-lead-generation', fixture_state: null }, 0, 50)).data.map((row: any) => row.step_type_label))
      .toEqual(['Free Input (Multi-Line)', 'Forward to Operator', 'Text', 'Email', 'Create Lead']);
    expect((await repository.querySource(stepDetail, { id: 'livechat-bot-step-odoo-2', fixture_state: null }, 0, 1)).data)
      .toMatchObject({ step_name: 'Odoo - Step 2', step_type_label: 'Question', message: 'What are you looking for?' });
    expect((await repository.querySource(answers, { id: 'livechat-bot-step-odoo-2', fixture_state: null }, 0, 50)).data.map((row: any) => row.name))
      .toEqual(['I have a pricing question', 'I am looking for your documentation', 'I am just looking around']);
    expect((await repository.querySource(detail, { id: 'missing-livechat-chatbot', fixture_state: 'not_found' }, 0, 1)).data).toEqual({});
    expect((await repository.querySource(answers, { id: 'livechat-bot-step-odoo-2', fixture_state: 'empty' }, 0, 50)).data).toEqual([]);
    await expect(repository.querySource(stepDetail, { id: 'livechat-bot-step-odoo-2', fixture_state: 'forbidden' }, 0, 1)).rejects.toMatchObject({ status: 403, code: 'LIVECHAT_BOT_STEP_DETAIL_FORBIDDEN' });
    await expect(repository.querySource(answers, { id: 'livechat-bot-step-odoo-2', fixture_state: 'transport_error' }, 0, 50)).rejects.toMatchObject({ status: 503, code: 'LIVECHAT_BOT_ANSWERS_UNAVAILABLE' });
    database.close();
  });

  test('enforces manager-only chatbot, step, and answer CRUD with validation and optimistic guards', async () => {
    const { database, repository } = await repositoryForTest();
    const listApi = yaml('api/chatbots.yaml');
    const detailApi = yaml('api/chatbot-detail.yaml');
    const stepApi = yaml('api/chatbot-step-detail.yaml');
    const create = action('api/chatbots.yaml', 'create_livechat_chatbot');
    const edit = action('api/chatbot-detail.yaml', 'edit_livechat_chatbot');
    const remove = action('api/chatbot-detail.yaml', 'delete_livechat_chatbot');
    const addStep = action('api/chatbot-detail.yaml', 'add_livechat_bot_step');
    const editStep = action('api/chatbot-step-detail.yaml', 'edit_livechat_bot_step');
    const removeStep = action('api/chatbot-step-detail.yaml', 'delete_livechat_bot_step');
    const addAnswer = action('api/chatbot-step-detail.yaml', 'add_livechat_bot_answer');
    const editAnswer = action('api/chatbot-step-detail.yaml', 'edit_livechat_bot_answer');
    const removeAnswer = action('api/chatbot-step-detail.yaml', 'delete_livechat_bot_answer');

    for (const candidate of [create, edit, remove, addStep, editStep, removeStep, addAnswer, editAnswer, removeAnswer]) {
      expect(candidate.permission).toBe('livechat.manage');
    }
    expect(create.mutation).toMatchObject({ operation: 'insert', table: 'livechat_chatbots', generated: ['id'] });
    const created = await repository.executeMutation(create.mutation, { values: { title: 'Appointment Bot', operator_name: 'Appointment Bot', active: true } });
    expect(created).toMatchObject({ title: 'Appointment Bot', operator_name: 'Appointment Bot', row_version: 1 });
    await expect(repository.executeMutation(create.mutation, { values: { title: 'appointment bot' } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_CHATBOT_TITLE_EXISTS' });
    await expect(repository.executeMutation(create.mutation, { values: { title: '  ' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_CHATBOT_TITLE_REQUIRED' });

    const changed = await repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { title: 'Appointment Assistant', active: false } });
    expect(changed).toMatchObject({ id: created.id, title: 'Appointment Assistant', active: false, row_version: 2 });
    await expect(repository.executeMutation(edit.mutation, { id: created.id, expected_row_version: 1, values: { title: 'Stale Bot', active: true } })).rejects.toMatchObject({ status: 409 });
    await expect(repository.executeMutation(edit.mutation, { id: 'missing-livechat-chatbot', expected_row_version: 1, values: { title: 'Missing', active: true } })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_CHATBOT_NOT_FOUND' });

    const addedStep = await repository.executeMutation(addStep.mutation, { id: created.id, parent_expected_row_version: 2, values: { message: 'How can we help?', step_type: 'Question' } });
    expect(addedStep).toMatchObject({ chatbot_id: created.id, sequence: 1, message: 'How can we help?', step_type: 'Question', row_version: 1 });
    await expect(repository.executeMutation(addStep.mutation, { id: created.id, parent_expected_row_version: 2, values: { message: 'Stale', step_type: 'Text' } })).rejects.toMatchObject({ status: 409, code: 'STALE_RECORD' });
    await expect(repository.executeMutation(addStep.mutation, { id: created.id, parent_expected_row_version: 3, values: { message: '', step_type: 'Text' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_BOT_STEP_INVALID' });

    const addedAnswer = await repository.executeMutation(addAnswer.mutation, { id: addedStep.id, parent_expected_row_version: 1, values: { name: 'Book a demo', redirect_link: '/demo' } });
    expect(addedAnswer).toMatchObject({ step_id: addedStep.id, name: 'Book a demo', redirect_link: '/demo', row_version: 1 });
    await expect(repository.executeMutation(addAnswer.mutation, { id: addedStep.id, parent_expected_row_version: 2, values: { name: 'book a demo' } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_BOT_ANSWER_EXISTS' });
    await expect(repository.executeMutation(addAnswer.mutation, { id: addedStep.id, parent_expected_row_version: 2, values: { name: '  ' } })).rejects.toMatchObject({ status: 422, code: 'LIVECHAT_BOT_ANSWER_REQUIRED' });

    const changedAnswer = await repository.executeMutation(editAnswer.mutation, { id: addedStep.id, line_id: addedAnswer.id, parent_expected_row_version: 2, expected_row_version: 1, values: { name: 'Book an appointment', redirect_link: '/appointment', sequence: 2 } });
    expect(changedAnswer).toMatchObject({ id: addedAnswer.id, name: 'Book an appointment', row_version: 2 });
    await expect(repository.executeMutation(editAnswer.mutation, { id: addedStep.id, line_id: addedAnswer.id, parent_expected_row_version: 3, expected_row_version: 1, values: { name: 'Stale answer', sequence: 3 } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_BOT_ANSWER_STALE' });

    const changedStep = await repository.executeMutation(editStep.mutation, { id: created.id, line_id: addedStep.id, parent_expected_row_version: 3, expected_row_version: 3, values: { message: 'What time works?', step_type: 'Question', operator_expertise_names: 'Discuss', triggering_answer_names: '' } });
    expect(changedStep).toMatchObject({ id: addedStep.id, message: 'What time works?', row_version: 4 });
    await expect(repository.executeMutation(editStep.mutation, { id: created.id, line_id: addedStep.id, parent_expected_row_version: 4, expected_row_version: 3, values: { message: 'Stale step', step_type: 'Text' } })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_BOT_STEP_STALE' });

    await expect(repository.executeMutation(removeAnswer.mutation, { id: addedStep.id, line_id: addedAnswer.id, parent_expected_row_version: 4, expected_row_version: 1 })).rejects.toMatchObject({ status: 409, code: 'LIVECHAT_BOT_ANSWER_STALE' });
    await repository.executeMutation(removeAnswer.mutation, { id: addedStep.id, line_id: addedAnswer.id, parent_expected_row_version: 4, expected_row_version: 2 });
    await repository.executeMutation(removeStep.mutation, { id: created.id, line_id: addedStep.id, parent_expected_row_version: 4, expected_row_version: 5 });
    await repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 });
    await expect(repository.executeMutation(remove.mutation, { id: created.id, expected_row_version: 5 })).rejects.toMatchObject({ status: 404, code: 'LIVECHAT_CHATBOT_NOT_FOUND' });
    database.close();
  });

  test('keeps Odoo labels, manager-only boundaries, and transport contracts explicit', () => {
    const detailPage = yaml('pages/chatbot-detail.yaml');
    const stepPage = yaml('pages/chatbot-step-detail.yaml');
    const listApi = yaml('api/chatbots.yaml');
    const detailApi = yaml('api/chatbot-detail.yaml');
    const stepApi = yaml('api/chatbot-step-detail.yaml');
    expect(detailPage.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Chatbot Name']);
    expect(detailPage.components[1].actions[0]).toMatchObject({ id: 'add_livechat_bot_step', label: 'Add Script Steps', permission: 'livechat.manage' });
    expect(stepPage.components[0].groups[0].fields.map((field: any) => field.label)).toEqual(['Message', 'Step Type', 'Operator Expertise', 'Only If', 'Sequence']);
    expect(stepPage.components[1].columns.map((column: any) => column.label)).toEqual(['Answer', 'Optional Link', '']);
    for (const [api, ids] of [[listApi, ['livechat_chatbots']], [detailApi, ['livechat_chatbot_detail', 'livechat_bot_steps']], [stepApi, ['livechat_bot_step_detail', 'livechat_bot_answers']]]) {
      for (const id of ids) expect(api.datasources.find((source: any) => source.id === id)).toMatchObject({ permission: 'livechat.manage' });
    }
    expect(listApi.datasources[0].error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_CHATBOTS_UNAVAILABLE' });
    expect(detailApi.datasources[1].error_states.forbidden).toMatchObject({ status: 403, code: 'LIVECHAT_BOT_STEPS_FORBIDDEN' });
    expect(stepApi.datasources[1].error_states.transport_error).toMatchObject({ status: 503, code: 'LIVECHAT_BOT_ANSWERS_UNAVAILABLE' });
    expect(action('api/chatbot-step-detail.yaml', 'edit_livechat_bot_step')).toMatchObject({ handler: 'line_item', domain: 'livechat_chatbot_step' });
    expect(action('api/chatbot-step-detail.yaml', 'add_livechat_bot_answer').mutation.guards.map((guard: any) => guard.status)).toEqual([409, 422, 409]);
  });
});
