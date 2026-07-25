import duckdb from 'duckdb';
import { SignJWT, jwtVerify } from 'jose';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const PORT = parseInt(process.env.PORT || '3001');
// tms/server.js → PROJECT_ROOT is one level up
const PROJECT_ROOT = join(import.meta.dir, '..');
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tms-dev-secret-32chars!!!!'
);

// ── DuckDB setup ─────────────────────────────────────────────────────────────
const db = new duckdb.Database(join(import.meta.dir, 'tms.duckdb'));
const conn = db.connect();

/** Execute a mutation (INSERT/UPDATE/DELETE/DDL). Resolves when done. */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.run(sql, ...params, (err) => (err ? reject(err) : resolve()));
  });
}

/** Execute a SELECT and return an array of plain JS objects. */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    conn.all(sql, ...params, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map(convertRow));
    });
  });
}

/** Convert DuckDB-native types (BigInt, Date, etc.) to plain JS values. */
function convertRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'bigint') {
      out[k] = Number(v);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function apiError(status, message) {
  return json({ error: message }, status);
}

// ── JWT ───────────────────────────────────────────────────────────────────────
async function signJWT(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

async function verifyJWT(token) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}

async function requireAuth(req) {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) throw { status: 401, message: 'Unauthorized' };
  try {
    return await verifyJWT(auth.slice(7));
  } catch {
    throw { status: 401, message: 'Invalid or expired token' };
  }
}

// ── Static file serving ───────────────────────────────────────────────────────
const SPA_PATHS = new Set([
  '/', '/fleet', '/drivers', '/trips', '/maintenance', '/reports', '/settings', '/login',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.yaml': 'text/yaml',
  '.yml':  'text/yaml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
};

function mimeFor(path) {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME[ext] || 'application/octet-stream';
}

async function serveStatic(pathname) {
  const rel = pathname.startsWith('/') ? pathname.slice(1) : pathname;
  if (!rel.startsWith('tms/') && !rel.startsWith('lib/')) return null;
  // Page YAML contains server-only datasource SQL and must never be served.
  if (rel.startsWith('tms/') && /\.ya?ml$/i.test(rel)) return null;
  try {
    const file = Bun.file(join(PROJECT_ROOT, rel));
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Content-Type': mimeFor(rel), ...CORS_HEADERS },
      });
    }
  } catch {}
  return null;
}

async function serveSPA() {
  const file = Bun.file(join(PROJECT_ROOT, 'tms/index.html'));
  if (await file.exists()) {
    return new Response(file, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS },
    });
  }
  return new Response('TMS server running. No index.html found.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
  });
}

// ── DB initialisation ─────────────────────────────────────────────────────────
async function initDb() {
  const schemaSQL = readFileSync(join(import.meta.dir, 'db/schema.sql'), 'utf8');
  const seedSQL   = readFileSync(join(import.meta.dir, 'db/seed.sql'),   'utf8');

  // Run schema (idempotent — IF NOT EXISTS)
  for (const stmt of splitSQL(schemaSQL)) {
    await run(stmt);
  }

  // Seed only if roles table is empty
  const rows = await all('SELECT COUNT(*) as n FROM roles');
  if (Number(rows[0]?.n) === 0) {
    for (const stmt of splitSQL(seedSQL)) {
      await run(stmt);
    }
    console.log('✓ Database seeded');
  }
}

/** Split a SQL file into individual statements, stripping -- comments first. */
function splitSQL(sql) {
  const noComments = sql.replace(/--[^\n]*/g, '');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ── YAML datasource registry ─────────────────────────────────────────────────
// Queries are loaded from the page YAML files, never accepted from API requests.
const SOURCE_FILES = ['fleet.yaml', 'drivers.yaml', 'trips.yaml', 'maintenance.yaml', 'reports.yaml', 'settings.yaml'];

function loadSources() {
  const sources = new Map();
  for (const file of SOURCE_FILES) {
    const page = Bun.YAML.parse(readFileSync(join(import.meta.dir, file), 'utf8'));
    for (const source of page.datasources || []) {
      if (!source.id || !source.query || !source.permission) {
        throw new Error(`Datasource in ${file} requires id, permission, and query`);
      }
      if (sources.has(source.id)) throw new Error(`Duplicate datasource id: ${source.id}`);
      sources.set(source.id, source);
    }
  }
  return sources;
}

const SOURCES = loadSources();
const PAGES = new Map(
  SOURCE_FILES.map((file) => {
    const page = Bun.YAML.parse(readFileSync(join(import.meta.dir, file), 'utf8'));
    return [page.page?.id, page];
  })
);

function publicPageConfig(page) {
  const { datasources, ...config } = page;
  return config;
}

function bindNamedParams(sql, params = {}) {
  const values = [];
  const statement = sql.trim().replace(/;\s*$/, '').replace(/:([A-Za-z_]\w*)/g, (_, name) => {
    values.push(params[name] ?? null);
    return '?';
  });
  return { statement, values };
}

async function querySource(source, params, skip, top) {
  const { statement, values } = bindNamedParams(source.query, params);
  if (source.single) {
    const rows = await all(statement, values);
    return { data: rows[0] || {} };
  }

  const [count] = await all(`SELECT COUNT(*) AS n FROM (${statement}) AS source_rows`, values);
  const pageSize = Math.max(1, Math.min(Number(top) || 25, 100));
  const offset = Math.max(0, Number(skip) || 0);
  const rows = await all(
    `SELECT * FROM (${statement}) AS source_rows LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  const total = Number(count?.n || 0);
  return {
    data: rows,
    meta: { total, page: Math.floor(offset / pageSize) + 1, pageSize, pages: Math.ceil(total / pageSize) },
  };
}

// ── TABLE_REGISTRY ────────────────────────────────────────────────────────────
const TABLE_REGISTRY = {
  trucks:       { permission: 'fleet.write',       timestamps: true  },
  drivers:      { permission: 'drivers.write',     timestamps: true  },
  trips:        { permission: 'trips.write',        timestamps: true  },
  maintenance:  { permission: 'maintenance.write',  timestamps: true  },
  branches:     { permission: 'settings.write',     timestamps: true  },
  users:        { permission: 'settings.write',     timestamps: true  },
  translations: { permission: 'settings.write',     timestamps: false },
};

// ── API handler ───────────────────────────────────────────────────────────────
async function handleAPI(req, url) {
  const pathname = url.pathname;
  const method   = req.method;

  // ── Auth (no JWT required) ────────────────────────────────────────────────
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = await req.json();
    if (!email || !password) return apiError(400, 'email and password required');

    const users = await all(
      `SELECT u.*, string_agg(r.name, ',') as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.email = ?
       GROUP BY u.id, u.email, u.name, u.password_hash, u.avatar_url,
                u.preferred_lang, u.created_at, u.updated_at`,
      [email]
    );
    const user = users[0];
    if (!user) return apiError(401, 'Invalid credentials');

    let valid = false;
    if (!user.password_hash.startsWith('$')) {
      // Plaintext seed password — verify then upgrade to bcrypt
      valid = password === user.password_hash;
      if (valid) {
        const hash = await Bun.password.hash(password);
        await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
        user.password_hash = hash;
      }
    } else {
      valid = await Bun.password.verify(password, user.password_hash);
    }
    if (!valid) return apiError(401, 'Invalid credentials');

    const roles = user.roles_csv ? user.roles_csv.split(',').filter(Boolean) : [];

    const perms = await all(
      `SELECT DISTINCT p.permission_key
       FROM permissions p
       JOIN roles r ON r.id = p.role_id
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );
    const permissions = perms.map((p) => p.permission_key);

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      preferred_lang: user.preferred_lang,
      roles,
      permissions,
    };
    const token = await signJWT(tokenPayload);
    return json({ token, user: tokenPayload });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await requireAuth(req);
    return json(user);
  }

  // ── All routes below require auth ──────────────────────────────────────────
  const authUser = await requireAuth(req);

  const hasPerm = (perm) => authUser.permissions?.includes(perm);
  const requirePerm = (perm) => {
    if (!hasPerm(perm)) throw { status: 403, message: `Requires permission: ${perm}` };
  };

  // ── GET /api/pages/:id ────────────────────────────────────────────────────
  const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
  if (pageMatch && method === 'GET') {
    const page = PAGES.get(pageMatch[1]);
    if (!page) return apiError(404, `Unknown page: ${pageMatch[1]}`);
    for (const permission of page.page?.auth?.require || []) requirePerm(permission);
    return json(publicPageConfig(page));
  }

  // ── POST /api/query ───────────────────────────────────────────────────────
  if (pathname === '/api/query' && method === 'POST') {
    const vm = await req.json();
    const src = SOURCES.get(vm.sourceId);
    if (!src) return apiError(404, `Unknown source: ${vm.sourceId}`);
    if (src.permission) requirePerm(src.permission);
    const result = await querySource(src, vm.params || {}, vm.skip || 0, vm.top || 25);
    return json(result);
  }

  // ── POST /api/patch ───────────────────────────────────────────────────────
  if (pathname === '/api/patch' && method === 'POST') {
    const body = await req.json();
    const { table, action, id, changes = [] } = body;

    const tbl = TABLE_REGISTRY[table];
    if (!tbl) return apiError(404, `Unknown table: ${table}`);
    requirePerm(tbl.permission);

    // ── insert ──────────────────────────────────────────────────────────────
    if (action === 'insert') {
      const newId = crypto.randomUUID();

      if (table === 'users') {
        const rolesChange    = changes.find((c) => c.field === 'roles');
        const passwordChange = changes.find((c) => c.field === 'password');
        let regularChanges   = changes.filter((c) => c.field !== 'roles' && c.field !== 'password');
        if (passwordChange) {
          const hash = await Bun.password.hash(passwordChange.value);
          regularChanges = [...regularChanges, { field: 'password_hash', value: hash }];
        }
        const cols = ['id', ...regularChanges.map((c) => c.field)].join(', ');
        const vals = [newId, ...regularChanges.map((c) => c.value)];
        await run(
          `INSERT INTO users(${cols}) VALUES(${vals.map(() => '?').join(', ')})`,
          vals
        );
        if (rolesChange) {
          const roleNames = Array.isArray(rolesChange.value)
            ? rolesChange.value
            : String(rolesChange.value).split(',').filter(Boolean);
          for (const roleName of roleNames) {
            const roleRows = await all('SELECT id FROM roles WHERE name = ?', [roleName.trim()]);
            if (roleRows[0]) {
              await run('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)', [newId, roleRows[0].id]);
            }
          }
        }
        const rows = await all(
          'SELECT id, email, name, preferred_lang, created_at FROM users WHERE id = ?',
          [newId]
        );
        return json(rows[0], 201);
      }

      // Generic insert
      if (changes.length === 0) return apiError(400, 'No fields to insert');
      const cols = ['id', ...changes.map((c) => c.field)].join(', ');
      const vals = [newId, ...changes.map((c) => c.value)];
      await run(
        `INSERT INTO ${table}(${cols}) VALUES(${vals.map(() => '?').join(', ')})`,
        vals
      );
      const rows = await all(`SELECT * FROM ${table} WHERE id = ?`, [newId]);
      return json(rows[0], 201);
    }

    // ── update ──────────────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id) return apiError(400, 'id required for update');

      if (table === 'users') {
        const rolesChange    = changes.find((c) => c.field === 'roles');
        const regularChanges = changes.filter((c) => c.field !== 'roles');
        if (regularChanges.length > 0) {
          const sets = regularChanges.map((c) => `${c.field} = ?`).join(', ');
          const tsClause = tbl.timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
          await run(
            `UPDATE users SET ${sets}${tsClause} WHERE id = ?`,
            [...regularChanges.map((c) => c.value), id]
          );
        }
        if (rolesChange !== undefined) {
          const roleNames = Array.isArray(rolesChange.value)
            ? rolesChange.value
            : String(rolesChange.value).split(',').filter(Boolean);
          await run('DELETE FROM user_roles WHERE user_id = ?', [id]);
          for (const roleName of roleNames) {
            const roleRows = await all('SELECT id FROM roles WHERE name = ?', [roleName.trim()]);
            if (roleRows[0]) {
              await run('INSERT INTO user_roles(user_id, role_id) VALUES(?,?)', [id, roleRows[0].id]);
            }
          }
        }
        const rows = await all(
          'SELECT id, email, name, preferred_lang, created_at FROM users WHERE id = ?',
          [id]
        );
        return json(rows[0]);
      }

      // Generic update
      if (changes.length === 0) return apiError(400, 'No fields to update');
      const sets = changes.map((c) => `${c.field} = ?`).join(', ');
      const tsClause = tbl.timestamps ? ', updated_at = CURRENT_TIMESTAMP' : '';
      await run(
        `UPDATE ${table} SET ${sets}${tsClause} WHERE id = ?`,
        [...changes.map((c) => c.value), id]
      );
      const rows = await all(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      return json(rows[0]);
    }

    // ── delete ──────────────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return apiError(400, 'id required for delete');
      if (table === 'users') {
        await run('DELETE FROM user_roles WHERE user_id = ?', [id]);
      }
      await run(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return json({ ok: true });
    }

    return apiError(400, `Unknown action: ${action}`);
  }

  // ── PROFILE (self-update) ─────────────────────────────────────────────────
  if (pathname === '/api/v1/profile' && method === 'GET') {
    const rows = await all(
      `SELECT u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at,
        string_agg(r.name, ',') as roles_csv
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       GROUP BY u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at`,
      [authUser.sub]
    );
    if (!rows[0]) return apiError(404, 'User not found');
    return json({ ...rows[0], roles: rows[0].roles_csv ? rows[0].roles_csv.split(',').filter(Boolean) : [] });
  }

  if (pathname === '/api/v1/profile' && method === 'PATCH') {
    const body = await req.json();
    const allowed = ['name', 'preferred_lang', 'avatar_url'];
    const fields  = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));

    if (body.new_password) {
      if (!body.current_password) return apiError(400, 'current_password required');
      const userRows = await all('SELECT password_hash FROM users WHERE id = ?', [authUser.sub]);
      if (!userRows[0]) return apiError(404, 'User not found');
      const stored = userRows[0].password_hash;
      let currentValid = false;
      if (!stored.startsWith('$')) {
        currentValid = body.current_password === stored;
      } else {
        currentValid = await Bun.password.verify(body.current_password, stored);
      }
      if (!currentValid) return apiError(400, 'Current password incorrect');
      fields.password_hash = await Bun.password.hash(body.new_password);
    }

    if (Object.keys(fields).length) {
      const sets = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
      await run(
        `UPDATE users SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...Object.values(fields), authUser.sub]
      );
    }
    return json({ ok: true });
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (pathname === '/api/v1/notifications' && method === 'GET') {
    const rows = await all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [authUser.sub]
    );
    return json(rows);
  }

  if (pathname === '/api/v1/notifications' && method === 'POST') {
    const body = await req.json();
    const id = crypto.randomUUID();
    await run(
      'INSERT INTO notifications(id, user_id, type, title, body) VALUES(?,?,?,?,?)',
      [id, body.user_id || authUser.sub, body.type, body.title, body.body || null]
    );
    return json((await all('SELECT * FROM notifications WHERE id = ?', [id]))[0], 201);
  }

  if (pathname === '/api/v1/notifications/read-all' && method === 'PATCH') {
    await run('UPDATE notifications SET read = true WHERE user_id = ?', [authUser.sub]);
    return json({ ok: true });
  }

  const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    await run(
      'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
      [notifReadMatch[1], authUser.sub]
    );
    return json({ ok: true });
  }

  // ── i18n ─────────────────────────────────────────────────────────────────
  if (pathname === '/api/v1/i18n/list' && method === 'GET') {
    requirePerm('settings.read');
    const lang = url.searchParams.get('lang') || 'en';
    const page = url.searchParams.get('page') || '';
    const q    = url.searchParams.get('q') || '';
    let where = 'WHERE lang = ?';
    const params = [lang];
    if (page) { where += ' AND page = ?'; params.push(page); }
    if (q) {
      where += ' AND (text ILIKE ? OR translated ILIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const rows = await all(`SELECT * FROM translations ${where} ORDER BY page, component, text`, params);
    return json(rows);
  }

  if (pathname === '/api/v1/i18n' && method === 'GET') {
    const lang = url.searchParams.get('lang') || 'en';
    const page = url.searchParams.get('page') || '*';
    const rows = await all(
      `SELECT text, component, translated FROM translations
       WHERE lang = ? AND (page = ? OR page = '*')
       ORDER BY page`,
      [lang, page]
    );
    const result = {};
    for (const row of rows) {
      const key = row.component ? `${row.component}::${row.text}` : row.text;
      result[key] = row.translated;
    }
    return json(result);
  }

  if (pathname === '/api/v1/i18n' && method === 'POST') {
    requirePerm('settings.write');
    const body = await req.json();
    await run(
      `INSERT INTO translations(lang, page, component, text, translated)
       VALUES(?,?,?,?,?)
       ON CONFLICT ON CONSTRAINT idx_translations DO UPDATE SET translated = EXCLUDED.translated`,
      [body.lang, body.page, body.component || null, body.text, body.translated]
    );
    return json({ ok: true });
  }

  const i18nMatch = pathname.match(/^\/api\/v1\/i18n\/(\d+)$/);
  if (i18nMatch) {
    const id = parseInt(i18nMatch[1]);
    if (method === 'PATCH') {
      requirePerm('settings.write');
      const { translated } = await req.json();
      await run('UPDATE translations SET translated = ? WHERE id = ?', [translated, id]);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      requirePerm('settings.write');
      await run('DELETE FROM translations WHERE id = ?', [id]);
      return json({ ok: true });
    }
  }

  return apiError(404, 'API route not found');
}

// ── Main server ───────────────────────────────────────────────────────────────
await initDb();

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url      = new URL(req.url);
    const pathname = url.pathname;

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // API
    if (pathname.startsWith('/api/')) {
      try {
        return await handleAPI(req, url);
      } catch (err) {
        if (err?.status) return apiError(err.status, err.message);
        console.error('[API error]', err);
        return apiError(500, 'Internal server error');
      }
    }

    // Static assets
    if (req.method === 'GET') {
      const staticResp = await serveStatic(pathname);
      if (staticResp) return staticResp;
      if (SPA_PATHS.has(pathname)) return serveSPA();
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`TMS server running at http://localhost:${PORT}`);
