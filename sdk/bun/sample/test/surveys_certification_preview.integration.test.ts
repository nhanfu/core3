import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bindNamedParams } from '@core3/server/database/sql';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';

const root = join(import.meta.dir, '../services/surveys');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const query = (repository: YamlRepository, statement: string, params: Record<string, unknown>) => {
  const bound = bindNamedParams(statement, params);
  return repository.query(bound.statement, bound.values);
};

describe('Surveys certification preview parity', () => {
  test('joins the Preview action to the certification preview page/API pair', () => {
    const detailPage = yaml('pages/survey-detail.yaml');
    const previewPage = yaml('pages/certification-preview.yaml');
    const previewApi = yaml('api/certification-preview.yaml');
    const detailForm = detailPage.components.find((component: any) => component.type === 'OdooFormView');
    const previewForm = previewPage.components.find((component: any) => component.type === 'OdooFormView');
    const preview = detailPage.actions.find((action: any) => action.id === 'preview_survey_certification');

    expect(preview).toMatchObject({ id: 'preview_survey_certification', type: 'client', permission: 'surveys.read' });
    expect(String(preview.script)).toContain('/surveys/certification-preview?id=');
    expect(detailForm.header_actions).toContainEqual(expect.objectContaining({ id: 'preview_survey_certification', label: 'Preview certification' }));
    expect(previewPage.page.id).toBe('survey-certification-preview');
    expect(previewApi.page.id).toBe(previewPage.page.id);
    expect(previewForm.source).toBe('survey_certification_preview');
    expect(previewPage.components).toContainEqual(expect.objectContaining({ type: 'TemplatePreview', source: 'survey_certification_preview_blocks', template_source: 'survey_certification_preview_template' }));
  });

  test('projects only active certified surveys and all six Odoo layouts', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_certification_preview', ['schema', 'data']);
    const api = yaml('api/certification-preview.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_certification_preview');
    const template = api.datasources.find((source: any) => source.id === 'survey_certification_preview_template');
    const blocks = api.datasources.find((source: any) => source.id === 'survey_certification_preview_blocks');
    expect(detail.query).toContain("COALESCE(s.certification, false) = true");
    expect(template.query).toContain('certification_report_layout');
    expect(blocks.query).toContain("'table' AS block_type");
    expect(blocks.query).toContain("'user.name' AS token_key");
    const row = (await query(repository, detail.query, { id: 'survey-demo-certification' }))[0] as any;
    expect(row).toMatchObject({ id: 'survey-demo-certification', certification_report_layout: 'modern_purple', template_name: 'Modern Purple', preview_result: 'Certification Failed' });
    const blockRows = await query(repository, blocks.query, { id: 'survey-demo-certification' });
    expect(blockRows).toHaveLength(6);
    expect(blockRows.map((block: any) => block.block_type)).toEqual(['text', 'text', 'token', 'token', 'token', 'table']);
    database.close();
  });

  test('guards missing, non-certified, and archived surveys with an empty preview', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'surveys_certification_preview_states', ['schema', 'data']);
    const api = yaml('api/certification-preview.yaml');
    const detail = api.datasources.find((source: any) => source.id === 'survey_certification_preview');
    const blocks = api.datasources.find((source: any) => source.id === 'survey_certification_preview_blocks');
    expect(await query(repository, detail.query, { id: 'missing-survey' })).toEqual([]);
    expect(await query(repository, blocks.query, { id: 'survey-demo-feedback' })).toEqual([]);
    await repository.run("UPDATE surveys SET state = 'Archived' WHERE id = 'survey-demo-certification'");
    expect(await query(repository, detail.query, { id: 'survey-demo-certification' })).toEqual([]);
    expect(await query(repository, blocks.query, { id: 'survey-demo-certification' })).toEqual([]);
    database.close();
  });
});
