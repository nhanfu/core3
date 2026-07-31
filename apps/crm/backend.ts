import { all, closeDatabase, initDatabase, run, withDb } from './db/database.ts';
import { join } from 'node:path';
import { createDatasourceRuntime } from '../lib/datasource-runtime.ts';
import type { ApplicationBackend } from '../lib/server.ts';

type Role = 'salesperson' | 'manager' | 'system';

const configuredRole: Role = process.env.CRM_ROLE === 'manager' || process.env.CRM_ROLE === 'system'
  ? process.env.CRM_ROLE
  : 'salesperson';
const allowRoleHeader = process.env.CRM_ALLOW_ROLE_HEADER === 'true'
  && ['development', 'test'].includes(process.env.NODE_ENV || '');
const datasourceRuntime = createDatasourceRuntime({
  datasourceDirectory: join(import.meta.dir, 'db'),
  database: { all, run, withDb },
});

function roleOf(request: Request): Role {
  if (allowRoleHeader) {
    const role = request.headers.get('x-crm-role');
    if (role === 'manager' || role === 'system') return role;
  }
  return configuredRole;
}

const backend: ApplicationBackend = {
  id: 'crm',
  name: 'CRM',
  headers(port) {
    return {
      'Access-Control-Allow-Origin': process.env.CRM_CORS_ORIGIN || `http://localhost:${port}`,
      'Access-Control-Allow-Headers': allowRoleHeader ? 'Content-Type, X-CRM-Role' : 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'X-Content-Type-Options': 'nosniff',
    };
  },
  init: initDatabase,
  close: closeDatabase,
  routeApi(request) {
    if (new URL(request.url).pathname.startsWith('/api/odata')) return datasourceRuntime.routeODataRequest(request, roleOf(request));
    return Promise.resolve(undefined);
  },
};

export default backend;
