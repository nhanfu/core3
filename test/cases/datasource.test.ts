/**
 * Test cases for the backend datasource pipeline
 *
 * NOT YET RUNNABLE — requires @core3/backend + vitest/jest setup.
 * Run: npx vitest run cases/datasource.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataSourceRunner } from '@core3/backend';
import { MockAuthProvider } from '../interfaces/auth';
import type { DataSource } from '../interfaces/datasource';
import type { User } from '../interfaces/auth';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ADMIN: User = {
  id: 'u1', name: 'Admin User', email: 'admin@test.com',
  roles: ['admin'], branches: ['br-1', 'br-2'],
};

const DRIVER: User = {
  id: 'u2', name: 'Driver Joe', email: 'joe@test.com',
  roles: ['driver'], branches: ['br-1'],
};

const fleetDs: DataSource = {
  id: 'fleet-trucks',
  db: 'postgres',
  protocol: 'http',
  roles: ['admin', 'fleet_manager'],
  permission: 'fleet.read',
  query: 'SELECT id, plate, status FROM trucks WHERE branch_id IN (:allowed_branches)',
};

// ─── Role gate ────────────────────────────────────────────────────────────────

describe('role gate', () => {
  it('allows access when user holds at least one declared role', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    await expect(runner.run(fleetDs, ADMIN, {})).resolves.toBeDefined();
  });

  it('rejects with 403 when user holds none of the declared roles', async () => {
    const auth = new MockAuthProvider(DRIVER);
    const runner = new DataSourceRunner(auth);
    await expect(runner.run(fleetDs, DRIVER, {})).rejects.toMatchObject({ status: 403 });
  });

  it('includes a clear message indicating which roles are required', async () => {
    const auth = new MockAuthProvider(DRIVER);
    const runner = new DataSourceRunner(auth);
    try {
      await runner.run(fleetDs, DRIVER, {});
    } catch (e: unknown) {
      expect((e as { message: string }).message).toMatch(/fleet_manager|admin/);
    }
  });
});

// ─── Permission gate ──────────────────────────────────────────────────────────

describe('permission gate', () => {
  it('allows access when user has the required permission', async () => {
    const auth = new MockAuthProvider(ADMIN);
    vi.spyOn(auth, 'hasPermission').mockReturnValue(true);
    const runner = new DataSourceRunner(auth);
    await expect(runner.run(fleetDs, ADMIN, {})).resolves.toBeDefined();
  });

  it('rejects with 403 when hasPermission returns false', async () => {
    const auth = new MockAuthProvider(ADMIN);
    vi.spyOn(auth, 'hasPermission').mockReturnValue(false);
    const runner = new DataSourceRunner(auth);
    await expect(runner.run(fleetDs, ADMIN, {})).rejects.toMatchObject({ status: 403 });
  });

  it('checks permission BEFORE executing the query', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const permSpy = vi.spyOn(auth, 'hasPermission').mockReturnValue(false);
    const dbSpy = vi.fn();
    const runner = new DataSourceRunner(auth, { query: dbSpy });
    await runner.run(fleetDs, ADMIN, {}).catch(() => {});
    expect(permSpy).toHaveBeenCalledBefore(dbSpy);
  });
});

// ─── Row-level filtering ──────────────────────────────────────────────────────

describe(':allowed_branches injection', () => {
  it('injects allowedBranches from SecurityContext into query params', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const dbSpy = vi.fn().mockResolvedValue([]);
    const runner = new DataSourceRunner(auth, { query: dbSpy });
    await runner.run(fleetDs, ADMIN, {});
    expect(dbSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ allowed_branches: ADMIN.branches }),
    );
  });

  it('a user with only one branch gets that branch injected', async () => {
    const singleBranchUser = { ...ADMIN, branches: ['br-1'] };
    const auth = new MockAuthProvider(singleBranchUser);
    const dbSpy = vi.fn().mockResolvedValue([]);
    const runner = new DataSourceRunner(auth, { query: dbSpy });
    await runner.run(fleetDs, singleBranchUser, {});
    expect(dbSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ allowed_branches: ['br-1'] }),
    );
  });
});

// ─── CRUD: auto-generation ────────────────────────────────────────────────────

describe('crud: true — auto-generate mutations', () => {
  const ds: DataSource = { ...fleetDs, id: 'trucks', table: 'trucks', crud: true };

  it('generates a create action', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'trucks.create')).toBeDefined();
  });

  it('generates an update action', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'trucks.update')).toBeDefined();
  });

  it('generates a delete action', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'trucks.delete')).toBeDefined();
  });
});

describe('crud: [update] — selective mutations', () => {
  const ds: DataSource = { ...fleetDs, table: 'trucks', crud: ['update'] };

  it('generates only the update action', () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'fleet-trucks.update')).toBeDefined();
  });

  it('does NOT generate a create action', () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'fleet-trucks.create')).toBeUndefined();
  });

  it('does NOT generate a delete action', () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    expect(runner.getAction(ds, 'fleet-trucks.delete')).toBeUndefined();
  });
});

// ─── Custom CRUD functions ─────────────────────────────────────────────────────

describe('custom create function overrides generated insert', () => {
  const ds: DataSource = {
    ...fleetDs,
    table: 'trucks',
    crud: ['update'],
    create: {
      language: 'javascript',
      permission: 'fleet.trucks.create',
      script: 'return ctx.db.create("trucks", ctx.params);',
    },
  };

  it('uses the custom create function, not the generated INSERT', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    const action = runner.getAction(ds, 'fleet-trucks.create');
    expect(action?.source).toBe('custom');
  });
});

// ─── Caching ──────────────────────────────────────────────────────────────────

describe('cache: { ttl }', () => {
  it('returns cached result within TTL without hitting the DB', async () => {
    const ds: DataSource = { ...fleetDs, cache: { ttl: '60s' } };
    const auth = new MockAuthProvider(ADMIN);
    const dbSpy = vi.fn().mockResolvedValue([{ id: '1' }]);
    const runner = new DataSourceRunner(auth, { query: dbSpy });

    await runner.run(ds, ADMIN, {});
    await runner.run(ds, ADMIN, {});

    expect(dbSpy).toHaveBeenCalledTimes(1); // second call served from cache
  });

  it('re-fetches from DB after TTL expires', async () => {
    vi.useFakeTimers();
    const ds: DataSource = { ...fleetDs, cache: { ttl: '1s' } };
    const auth = new MockAuthProvider(ADMIN);
    const dbSpy = vi.fn().mockResolvedValue([]);
    const runner = new DataSourceRunner(auth, { query: dbSpy });

    await runner.run(ds, ADMIN, {});
    vi.advanceTimersByTime(2000); // TTL expired
    await runner.run(ds, ADMIN, {});

    expect(dbSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

// ─── Protocol ────────────────────────────────────────────────────────────────

describe('protocol: websocket', () => {
  it('establishes a WebSocket connection, not an HTTP fetch', () => {
    const ds: DataSource = { ...fleetDs, protocol: 'websocket' };
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    const wsFactory = vi.fn().mockReturnValue({ send: vi.fn(), close: vi.fn() });
    const fetchSpy = vi.fn();
    runner.run(ds, ADMIN, {}, { ws: wsFactory, fetch: fetchSpy }).catch(() => {});
    expect(wsFactory).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ─── Scripting sandbox ────────────────────────────────────────────────────────

describe('scripting datasource', () => {
  const scriptDs: DataSource = {
    id: 'enriched-trucks',
    protocol: 'http',
    roles: ['admin'],
    permission: 'fleet.read',
    language: 'javascript',
    script: 'return [{ id: "1", plate: "ABC", enriched: true }];',
  };

  it('executes the script and returns its result', async () => {
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    const result = await runner.run(scriptDs, ADMIN, {});
    expect(result.data).toEqual([{ id: '1', plate: 'ABC', enriched: true }]);
  });

  it('ctx.user is available inside the script', async () => {
    const captureDs: DataSource = {
      ...scriptDs,
      script: 'return [{ userId: ctx.user.id }];',
    };
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    const result = await runner.run(captureDs, ADMIN, {});
    expect(result.data[0].userId).toBe(ADMIN.id);
  });

  it('ctx.params are passed from the request', async () => {
    const paramsDs: DataSource = {
      ...scriptDs,
      script: 'return [{ plate: ctx.params.plate }];',
      params: { plate: { type: 'string' } },
    };
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    const result = await runner.run(paramsDs, ADMIN, { plate: 'XYZ-789' });
    expect(result.data[0].plate).toBe('XYZ-789');
  });

  it('throws if the script tries to access a disallowed global', async () => {
    const dangerousDs: DataSource = {
      ...scriptDs,
      script: 'process.exit(1); return [];',
    };
    const auth = new MockAuthProvider(ADMIN);
    const runner = new DataSourceRunner(auth);
    await expect(runner.run(dangerousDs, ADMIN, {})).rejects.toThrow();
  });
});
