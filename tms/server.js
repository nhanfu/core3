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

/* Legacy registry retained below temporarily while the query definitions are
 * migrated to YAML. It is not used by the API. */
const LEGACY_SOURCES = {
  trucks: {
    permission: 'fleet.read',
    paginated: true,
    async query(params, skip, top) {
      const parts = ['1=1'];
      const qp = [];
      if (params.status) { parts.push('t.status = ?'); qp.push(params.status); }
      if (params.type)   { parts.push('t.type = ?');   qp.push(params.type); }
      if (params.q) {
        parts.push('(t.plate ILIKE ? OR t.model ILIKE ? OR d.name ILIKE ?)');
        qp.push(`%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
      }
      const where = 'WHERE ' + parts.join(' AND ');
      const [countRow] = await all(
        `SELECT COUNT(*) as n FROM trucks t LEFT JOIN drivers d ON d.id = t.driver_id ${where}`,
        qp
      );
      const total = Number(countRow?.n || 0);
      const rows = await all(
        `SELECT t.*, d.name as driver_name, d.phone as driver_phone,
          (t.next_service IS NOT NULL AND t.next_service < CURRENT_DATE) as overdue_next
         FROM trucks t LEFT JOIN drivers d ON d.id = t.driver_id
         ${where} ORDER BY t.plate LIMIT ? OFFSET ?`,
        [...qp, top, skip]
      );
      const pageSize = top;
      const page = pageSize > 0 ? Math.floor(skip / pageSize) + 1 : 1;
      return { data: rows, meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) } };
    },
  },

  trucks_kpis: {
    permission: 'fleet.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='Active') as active,
          COUNT(*) FILTER (WHERE status='Maintenance') as maintenance,
          COUNT(*) FILTER (WHERE status='Out of Service') as out_of_service,
          COUNT(*) FILTER (WHERE next_service IS NOT NULL AND next_service < CURRENT_DATE) as overdue_service
        FROM trucks
      `);
      return { data: rows[0] };
    },
  },

  drivers: {
    permission: 'drivers.read',
    paginated: true,
    async query(params, skip, top) {
      const parts = ['1=1'];
      const qp = [];
      if (params.status) { parts.push('d.status = ?'); qp.push(params.status); }
      if (params.q) {
        parts.push('(d.name ILIKE ? OR d.license_number ILIKE ? OR d.email ILIKE ?)');
        qp.push(`%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
      }
      const where = 'WHERE ' + parts.join(' AND ');
      const [countRow] = await all(`SELECT COUNT(*) as n FROM drivers d ${where}`, qp);
      const total = Number(countRow?.n || 0);
      const rows = await all(
        `SELECT d.*, t.plate as truck_plate,
          (d.license_expiry IS NOT NULL AND d.license_expiry < CURRENT_DATE) as license_overdue,
          (d.license_expiry IS NOT NULL AND d.license_expiry < (CURRENT_DATE + INTERVAL '30 days')) as license_expiring
         FROM drivers d LEFT JOIN trucks t ON t.id = d.assigned_truck_id
         ${where} ORDER BY d.name LIMIT ? OFFSET ?`,
        [...qp, top, skip]
      );
      const pageSize = top;
      const page = pageSize > 0 ? Math.floor(skip / pageSize) + 1 : 1;
      return { data: rows, meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) } };
    },
  },

  drivers_stats: {
    permission: 'drivers.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE status='Active') as active_count,
          COUNT(*) FILTER (WHERE status='On Leave') as on_leave_count,
          COUNT(*) FILTER (WHERE license_expiry < (CURRENT_DATE + INTERVAL '30 days')) as expiring_count
        FROM drivers
      `);
      return { data: rows[0] };
    },
  },

  trips: {
    permission: 'trips.read',
    paginated: true,
    async query(params, skip, top) {
      const parts = ['1=1'];
      const qp = [];
      if (params.status) { parts.push('tr.status = ?'); qp.push(params.status); }
      if (params.q) {
        parts.push('(tr.trip_number ILIKE ? OR tr.origin ILIKE ? OR tr.destination ILIKE ? OR t.plate ILIKE ? OR d.name ILIKE ?)');
        qp.push(`%${params.q}%`, `%${params.q}%`, `%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
      }
      const where = 'WHERE ' + parts.join(' AND ');
      const [countRow] = await all(
        `SELECT COUNT(*) as n FROM trips tr
         LEFT JOIN trucks t ON t.id = tr.truck_id
         LEFT JOIN drivers d ON d.id = tr.driver_id
         ${where}`,
        qp
      );
      const total = Number(countRow?.n || 0);
      const rows = await all(
        `SELECT tr.*, t.plate as truck_plate, d.name as driver_name
         FROM trips tr
         LEFT JOIN trucks t ON t.id = tr.truck_id
         LEFT JOIN drivers d ON d.id = tr.driver_id
         ${where} ORDER BY tr.departure_time DESC LIMIT ? OFFSET ?`,
        [...qp, top, skip]
      );
      const pageSize = top;
      const page = pageSize > 0 ? Math.floor(skip / pageSize) + 1 : 1;
      return { data: rows, meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) } };
    },
  },

  trips_stats: {
    permission: 'trips.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT
          COUNT(*) FILTER (WHERE status='Scheduled') as scheduled_count,
          COUNT(*) FILTER (WHERE status='In Transit') as in_transit_count,
          COUNT(*) FILTER (WHERE status='Completed' AND DATE(arrival_time)=CURRENT_DATE) as completed_today,
          COUNT(*) FILTER (WHERE status='Cancelled') as cancelled_count
        FROM trips
      `);
      return { data: rows[0] };
    },
  },

  maintenance: {
    permission: 'maintenance.read',
    paginated: true,
    async query(params, skip, top) {
      const parts = ['1=1'];
      const qp = [];
      if (params.status)       { parts.push('m.status = ?');       qp.push(params.status); }
      if (params.service_type) { parts.push('m.service_type = ?'); qp.push(params.service_type); }
      if (params.q) {
        parts.push('(t.plate ILIKE ? OR m.service_type ILIKE ? OR m.notes ILIKE ?)');
        qp.push(`%${params.q}%`, `%${params.q}%`, `%${params.q}%`);
      }
      const where = 'WHERE ' + parts.join(' AND ');
      const [countRow] = await all(
        `SELECT COUNT(*) as n FROM maintenance m LEFT JOIN trucks t ON t.id = m.truck_id ${where}`,
        qp
      );
      const total = Number(countRow?.n || 0);
      const rows = await all(
        `SELECT m.*, t.plate as truck_plate, t.model as truck_model, u.name as technician_name
         FROM maintenance m
         LEFT JOIN trucks t ON t.id = m.truck_id
         LEFT JOIN users u ON u.id = m.technician_id
         ${where} ORDER BY m.scheduled_date DESC LIMIT ? OFFSET ?`,
        [...qp, top, skip]
      );
      const pageSize = top;
      const page = pageSize > 0 ? Math.floor(skip / pageSize) + 1 : 1;
      return { data: rows, meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) } };
    },
  },

  maintenance_kpis: {
    permission: 'maintenance.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT
          COUNT(*) FILTER (WHERE status='Overdue' OR (status='Scheduled' AND scheduled_date < CURRENT_DATE)) as overdue,
          COUNT(*) FILTER (WHERE scheduled_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days') AND status='Scheduled') as due_this_week,
          COUNT(*) FILTER (WHERE status='In Progress') as in_progress,
          COUNT(*) FILTER (WHERE status='Completed' AND completed_date >= date_trunc('month', CURRENT_DATE)) as completed_month
        FROM maintenance
      `);
      return { data: rows[0] };
    },
  },

  branches: {
    permission: 'settings.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT b.*, COUNT(t.id) as truck_count
        FROM branches b LEFT JOIN trucks t ON t.branch_id = b.id
        GROUP BY b.id, b.name, b.city, b.region, b.status, b.created_at, b.updated_at
        ORDER BY b.name
      `);
      return { data: rows };
    },
  },

  users: {
    permission: 'settings.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at,
          string_agg(r.name, ',') as roles_csv
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        GROUP BY u.id, u.email, u.name, u.avatar_url, u.preferred_lang, u.created_at
        ORDER BY u.name
      `);
      return {
        data: rows.map((r) => ({
          ...r,
          roles: r.roles_csv ? r.roles_csv.split(',').filter(Boolean) : [],
        })),
      };
    },
  },

  roles: {
    permission: 'settings.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT r.*, COUNT(p.id) as permission_count
        FROM roles r LEFT JOIN permissions p ON p.role_id = r.id
        GROUP BY r.id, r.name, r.description
        ORDER BY r.name
      `);
      return { data: rows };
    },
  },

  translations: {
    permission: 'settings.read',
    paginated: true,
    async query(params, skip, top) {
      const parts = ['1=1'];
      const qp = [];
      if (params.lang)        { parts.push('lang = ?');  qp.push(params.lang); }
      if (params.page_filter) { parts.push('page = ?');  qp.push(params.page_filter); }
      if (params.q) {
        parts.push('(text ILIKE ? OR translated ILIKE ?)');
        qp.push(`%${params.q}%`, `%${params.q}%`);
      }
      const where = 'WHERE ' + parts.join(' AND ');
      const [countRow] = await all(`SELECT COUNT(*) as n FROM translations ${where}`, qp);
      const total = Number(countRow?.n || 0);
      const rows = await all(
        `SELECT * FROM translations ${where} ORDER BY page, component, text LIMIT ? OFFSET ?`,
        [...qp, top, skip]
      );
      const pageSize = top;
      const page = pageSize > 0 ? Math.floor(skip / pageSize) + 1 : 1;
      return { data: rows, meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) } };
    },
  },

  reports_fleet: {
    permission: 'reports.read',
    paginated: false,
    async query() {
      const summary = await all(`
        SELECT
          COUNT(*) as total_trucks,
          COUNT(*) FILTER (WHERE status = 'Active') as active_trucks,
          COUNT(*) FILTER (WHERE status = 'Maintenance') as maintenance_trucks,
          COUNT(*) FILTER (WHERE status = 'Out of Service') as out_of_service_trucks,
          ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Active') / NULLIF(COUNT(*), 0), 1) as utilization_pct,
          COUNT(driver_id) as assigned_drivers,
          AVG(mileage) as avg_mileage
        FROM trucks
      `);
      const trucks = await all(`
        SELECT t.plate, t.model, t.status, t.mileage, t.type,
          d.name as driver_name, b.name as branch_name
        FROM trucks t
        LEFT JOIN drivers d ON d.id = t.driver_id
        LEFT JOIN branches b ON b.id = t.branch_id
        ORDER BY t.mileage DESC
      `);
      return { summary: summary[0], trucks };
    },
  },

  reports_costs: {
    permission: 'reports.financials',
    paginated: false,
    async query() {
      const breakdown = await all(`
        SELECT
          service_type,
          date_trunc('month', scheduled_date) as month,
          COUNT(*) as service_count,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost
        FROM maintenance
        WHERE status = 'Completed'
        GROUP BY service_type, date_trunc('month', scheduled_date)
        ORDER BY month DESC, total_cost DESC
      `);
      const overall = await all(`
        SELECT
          SUM(cost) as grand_total,
          AVG(cost) as avg_cost,
          COUNT(*) as total_services
        FROM maintenance
        WHERE status = 'Completed'
      `);
      return { breakdown, summary: overall[0] };
    },
  },

  reports_drivers: {
    permission: 'reports.read',
    paginated: false,
    async query() {
      const rows = await all(`
        SELECT
          d.id as driver_id,
          d.name as driver_name,
          d.status as driver_status,
          COUNT(tr.id) as total_trips,
          COUNT(tr.id) FILTER (WHERE tr.status = 'Completed') as completed_trips,
          COUNT(tr.id) FILTER (WHERE tr.status = 'Cancelled') as cancelled_trips,
          COALESCE(SUM(tr.distance_km), 0) as total_km,
          ROUND(
            100.0 * COUNT(tr.id) FILTER (WHERE tr.status = 'Completed')
            / NULLIF(COUNT(tr.id), 0), 1
          ) as completion_rate
        FROM drivers d
        LEFT JOIN trips tr ON tr.driver_id = d.id
        GROUP BY d.id, d.name, d.status
        ORDER BY completed_trips DESC, total_km DESC
      `);
      return { data: rows };
    },
  },
};

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
