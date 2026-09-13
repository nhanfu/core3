import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../services/employees');
const yaml = (file: string) => Bun.YAML.parse(readFileSync(join(root, file), 'utf8')) as any;

describe('Employees company-scope prerequisite', () => {
  test('keeps the company-scope migration and read predicates present', () => {
    expect(readFileSync(join(root, 'migrations/20260913100000-023-company-scope.yaml'), 'utf8'))
      .toContain("'employee-demo-005'");
    const scopeSources = [
      ['api/employees.yaml', 'employees'],
      ['api/employee-detail.yaml', 'employee_detail'],
      ['api/directory.yaml', 'employee_directory'],
      ['api/directory-detail.yaml', 'employee_directory_detail'],
    ];
    for (const [file, id] of scopeSources) {
      expect(yaml(file).datasources.find((source: any) => source.id === id)?.query, file)
        .toContain('current_company_name');
    }
  });
});
