import { describe, expect, test } from 'bun:test';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { migrateDatabase } from '@core3/server/migrations';
import { YamlRepository } from '@core3/server/database/yaml-repository';

const root = join(import.meta.dir, '../services/ecommerce');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;
const action = (api: any, id: string) => api.actions.find((candidate: any) => candidate.id === id);

describe('eCommerce product review parity', () => {
  test('traces Odoo product ratings and keeps the Product Detail page/API pair separate', () => {
    const productTemplate = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_template.py', 'utf8');
    const productProduct = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/models/product_product.py', 'utf8');
    const templates = readFileSync('/home/nhanjs/projects/odoo/addons/website_sale/views/templates.xml', 'utf8');
    const api = yaml('api/product-detail.yaml');
    const page = yaml('pages/product-detail.yaml');
    const reviews = api.datasources.find((source: any) => source.id === 'ecommerce_product_reviews');

    expect(productTemplate).toContain("'rating.mixin'");
    expect(productProduct).toContain('rating_avg');
    expect(productProduct).toContain('rating_count');
    expect(templates).toContain('Customer Reviews');
    expect(templates).toContain('portal.message_thread');
    expect(api.page.id).toBe(page.page.id);
    expect(page.datasources).toBeUndefined();
    expect(api.datasources[0].query).toContain('review_count');
    expect(api.datasources[0].query).toContain('rating_average');
    expect(reviews).toMatchObject({ id: 'ecommerce_product_reviews', permission: 'ecommerce.read' });
    expect(page.components.find((component: any) => component.source === 'ecommerce_product_reviews')).toMatchObject({
      type: 'ListView',
      create_action: 'create_ecommerce_product_review',
    });
    for (const id of ['create_ecommerce_product_review', 'edit_ecommerce_product_review', 'publish_ecommerce_product_review', 'reject_ecommerce_product_review', 'delete_ecommerce_product_review']) {
      expect(action(api, id)).toMatchObject({ permission: 'ecommerce.write', handler: 'yaml_mutation' });
    }
  });

  test('persists review submission and moderation with validation, company, and stale guards', async () => {
    const database = await DuckDbDatabase.open(':memory:');
    const repository = new YamlRepository(database);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_reviews_guards', ['schema', 'data']);
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'ecommerce_product_reviews_guards', ['schema', 'data']);
    const api = yaml('api/product-detail.yaml');
    const source = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_reviews');
    const detail = api.datasources.find((candidate: any) => candidate.id === 'ecommerce_product_detail');

    expect((await repository.querySource(source, { id: 'ecommerce-product-mug', company_name: 'My Company' }, 0, 20)).data)
      .toMatchObject([{ id: 'ecommerce-review-mug-001', state: 'published', rating: 5 }]);
    expect((await repository.querySource(detail, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data)
      .toMatchObject({ review_count: 1, rating_average: 5 });

    const create = action(api, 'create_ecommerce_product_review');
    await expect(repository.executeMutation(create.mutation, {
      id: 'ecommerce-product-review-qa', product_id: 'ecommerce-product-mug', current_company_name: 'Other Company',
      values: { reviewer_name: 'Wrong Company', rating: 4, title: 'Nope', review_body: 'Wrong scope' },
    })).rejects.toMatchObject({ status: 403, code: 'ECOMMERCE_PRODUCT_REVIEW_COMPANY_SCOPE_REQUIRED' });
    await expect(repository.executeMutation(create.mutation, {
      id: 'ecommerce-product-review-qa', product_id: 'ecommerce-product-mug', current_company_name: 'My Company',
      values: { reviewer_name: 'QA Buyer', rating: 6, title: 'Invalid', review_body: 'Bad rating' },
    })).rejects.toMatchObject({ status: 422, code: 'ECOMMERCE_PRODUCT_REVIEW_INVALID' });
    const created = await repository.executeMutation(create.mutation, {
      id: 'ecommerce-product-review-qa', product_id: 'ecommerce-product-mug', current_company_name: 'My Company',
      values: { reviewer_name: 'QA Buyer', reviewer_email: 'qa@example.test', rating: 4, title: 'Useful mug', review_body: 'A second fixture review.' },
    }) as any;
    expect(created).toMatchObject({ id: 'ecommerce-product-review-qa', state: 'pending', row_version: 1, company_name: 'My Company' });

    const publish = action(api, 'publish_ecommerce_product_review');
    const published = await repository.executeMutation(publish.mutation, { product_id: created.product_id, review_id: created.id, expected_row_version: 1, current_company_name: 'My Company' }) as any;
    expect(published).toMatchObject({ state: 'published', row_version: 2 });
    expect((await repository.querySource(detail, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data)
      .toMatchObject({ review_count: 2, rating_average: 4.5 });

    const edit = action(api, 'edit_ecommerce_product_review');
    await expect(repository.executeMutation(edit.mutation, {
      product_id: created.product_id, review_id: created.id, expected_row_version: 1, current_company_name: 'My Company',
      values: { reviewer_name: 'Stale', rating: 3, title: 'Stale', review_body: 'Stale write' },
    })).rejects.toMatchObject({ status: 409, code: 'ECOMMERCE_PRODUCT_REVIEW_STALE' });
    const edited = await repository.executeMutation(edit.mutation, {
      product_id: created.product_id, review_id: created.id, expected_row_version: 2, current_company_name: 'My Company',
      values: { reviewer_name: 'QA Buyer Updated', reviewer_email: 'qa@example.test', rating: 3, title: 'Updated mug', review_body: 'Updated review body.' },
    }) as any;
    expect(edited).toMatchObject({ state: 'pending', rating: 3, row_version: 3 });

    const reject = action(api, 'reject_ecommerce_product_review');
    const rejected = await repository.executeMutation(reject.mutation, { product_id: created.product_id, review_id: created.id, expected_row_version: 3, current_company_name: 'My Company' }) as any;
    expect(rejected).toMatchObject({ state: 'rejected', row_version: 4 });
    expect((await repository.querySource(detail, { id: 'ecommerce-product-mug', fixture_state: null, company_name: 'My Company' }, 0, 1)).data)
      .toMatchObject({ review_count: 1, rating_average: 5 });

    const remove = action(api, 'delete_ecommerce_product_review');
    expect(await repository.executeMutation(remove.mutation, { product_id: created.product_id, review_id: created.id, expected_row_version: 4, current_company_name: 'My Company' }))
      .toEqual({ deleted: true, id: created.id });
    database.close();
  });

  test('preserves review content and moderation state across a DuckDB restart', async () => {
    const databasePath = `/tmp/core3-ecommerce-product-reviews-${crypto.randomUUID()}.duckdb`;
    const migrationName = `ecommerce_product_reviews_restart_${crypto.randomUUID().replaceAll('-', '_')}`;
    const api = yaml('api/product-detail.yaml');
    const create = action(api, 'create_ecommerce_product_review');
    let first: DuckDbDatabase | undefined;
    let second: DuckDbDatabase | undefined;
    try {
      first = await DuckDbDatabase.open(databasePath);
      const firstRepository = new YamlRepository(first);
      await migrateDatabase(firstRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      await firstRepository.executeMutation(create.mutation, {
        id: 'ecommerce-product-review-restart', product_id: 'ecommerce-product-mug', current_company_name: 'My Company',
        values: { reviewer_name: 'Restart Buyer', rating: 5, title: 'Survives restart', review_body: 'Durable review content.' },
      });
      first.close();
      first = undefined;

      second = await DuckDbDatabase.open(databasePath);
      const secondRepository = new YamlRepository(second);
      await migrateDatabase(secondRepository, join(root, 'migrations'), undefined, migrationName, ['schema', 'data']);
      expect(await secondRepository.query('SELECT reviewer_name, rating, title, review_body, state, row_version FROM ecommerce_product_reviews WHERE id = ?', ['ecommerce-product-review-restart']))
        .toEqual([{ reviewer_name: 'Restart Buyer', rating: 5, title: 'Survives restart', review_body: 'Durable review content.', state: 'pending', row_version: 1 }]);
    } finally {
      second?.close();
      first?.close();
      rmSync(databasePath, { force: true });
    }
  });
});
