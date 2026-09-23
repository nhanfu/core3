import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DuckDbDatabase } from '@core3/server/database/duckdb-database';
import { YamlRepository } from '@core3/server/database/yaml-repository';
import { migrateDatabase } from '@core3/server/migrations';
import { createYamlApi } from '@core3/server/routes/yaml-api';
import { createYamlSourceReader } from '@core3/server/yaml-source-reader';
import { AuthRepository } from '../services/auth/auth-repository';
import { AuthService } from '../services/auth/auth-service';
import { DirectAuthAdapter } from '../services/auth/auth-adapter';

test('background datasource reads reload real actor permissions, company membership and row scope without a token', async () => {
  const db = await DuckDbDatabase.open(':memory:');
  try {
    const repository = new YamlRepository(db);
    const root = join(import.meta.dir, '../services/auth');
    await migrateDatabase(repository, join(root, 'migrations'), undefined, 'background_auth_migrations', ['schema']);
    const run = (sql: string) => repository.query(sql, []);
    await run("INSERT INTO roles(id,name,view_scope) VALUES ('job-role','analyst','branch')");
    await run("INSERT INTO users(id,email,name,password_hash,branch_id) VALUES ('job-user','job@test.local','Job user','unused','north')");
    await run("INSERT INTO user_roles VALUES ('job-user','job-role')");
    await run("INSERT INTO permissions VALUES ('job-perm','job-role','test.read')");
    await run("INSERT INTO auth_companies(id,name,short_name) VALUES ('job-a','Job A','A'), ('job-b','Job B','B')");
    await run("INSERT INTO auth_user_companies VALUES ('job-user','job-a',true), ('job-user','job-b',false)");
    await run("CREATE TABLE job_rows(id VARCHAR, company_name VARCHAR, branch_id VARCHAR)");
    await run("INSERT INTO job_rows VALUES ('allowed','Job A','north'), ('other-branch','Job A','south'), ('other-company','Job B','north')");
    const queries = (Bun.YAML.parse(readFileSync(join(root, 'data.yaml'), 'utf8')) as any).queries;
    const auth = new DirectAuthAdapter(new AuthService(new AuthRepository(db, queries), new Uint8Array(32)));
    const api = createYamlApi({ repository, authProvider: auth,
      sources: new Map([['job_rows', { id: 'job_rows', permission: 'test.read', query: "SELECT id FROM job_rows WHERE company_name = :current_company_name AND (:view_scope = 'all' OR branch_id = :current_branch_id) ORDER BY id" }]]),
      pageSources: new Map(), pages: new Map(), catalogs: new Map(), menus: new Map(), workflows: new Map(), workflowFiles: new Map(), permissions: {}, uploadRoot: '', eventStore: {}, topics: {} as any,
    });
    const reader = createYamlSourceReader(api);
    const actor = { user_id: 'job-user', company_name: 'Job A' };
    const read = () => reader.readSourceAs!(actor, 'job_rows', { current_user_id: 'forged', current_company_name: 'Job B', current_branch_id: 'south', view_scope: 'all' }, 0, 25);
    expect((await read()).data).toEqual([{ id: 'allowed' }]);
    const simultaneous = await Promise.all([read(), reader.readSourceAs!({ ...actor, company_name: 'Job B' }, 'job_rows', {}, 0, 25)]);
    expect(simultaneous.map(result => result.data)).toEqual([[{ id: 'allowed' }], [{ id: 'other-company' }]]);
    const identity = await auth.resolveBackgroundUser(actor.user_id, actor.company_name);
    expect(identity).toMatchObject({ sub: 'job-user', company_id: 'job-a', view_scope: 'branch', permissions: ['test.read'] });
    expect(identity).not.toHaveProperty('password_hash');
    expect(identity).not.toHaveProperty('sid');

    // A later interactive company switch must not retarget the queued job.
    await run("UPDATE users SET current_company_id = 'job-b' WHERE id = 'job-user'");
    expect((await read()).data).toEqual([{ id: 'allowed' }]);
    await run("INSERT INTO auth_role_management_overrides(role_id,view_scope) VALUES ('job-role','all')");
    expect((await read()).data).toEqual([{ id: 'allowed' }, { id: 'other-branch' }]);
    await run("DELETE FROM permissions WHERE id = 'job-perm'");
    await expect(read()).rejects.toMatchObject({ status: 403 });
    await run("INSERT INTO permissions VALUES ('job-perm','job-role','test.read')");
    await run("INSERT INTO auth_user_management_overrides(user_id,enabled) VALUES ('job-user',false)");
    await expect(read()).rejects.toMatchObject({ status: 403, code: 'BACKGROUND_ACTOR_FORBIDDEN' });
    await run("DELETE FROM auth_user_management_overrides WHERE user_id = 'job-user'");
    await run("DELETE FROM auth_user_companies WHERE user_id = 'job-user' AND company_id = 'job-a'");
    await expect(read()).rejects.toMatchObject({ status: 403, code: 'BACKGROUND_ACTOR_FORBIDDEN' });
    await expect(auth.resolveBackgroundUser('missing', 'Job A')).rejects.toMatchObject({ status: 403 });

    // Serializing the actor into an HTTP request cannot acquire the capability.
    const url = new URL('http://test/api/query');
    const forged = new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Background-User': 'job-user' }, body: JSON.stringify({ sourceId: 'job_rows', actor, params: actor }) });
    await expect(api(forged, url)).rejects.toMatchObject({ status: 401 });
    const unsupported = createYamlSourceReader(async () => new Response('{}'));
    await expect(unsupported.readSourceAs!(actor, 'job_rows', {}, 0, 25)).rejects.toMatchObject({ code: 'BACKGROUND_AUTH_UNAVAILABLE' });
  } finally { await db.close(); }
}, 30000);
