# Core3 ERP Rendering Framework — Implementation Plan

Progress markers: `[x]` done · `[-]` in progress · `[ ]` not started

---

## Phase 0 — Test scaffolding  ✅ Complete

All items here are done. No further work needed in this phase.

- [x] `test/interfaces/component.ts` — BaseComponent, ComponentDef, cell/form state shapes
- [x] `test/interfaces/datasource.ts` — DataSource, DataResponse, IRepository, CRUD config
- [x] `test/interfaces/auth.ts` — IAuthProvider, User, SecurityContext, MockAuthProvider
- [x] `test/interfaces/runtime.ts` — ScriptContext, RuntimeAdapter, PageConfig, EventBus
- [x] `test/cases/base-component.test.ts` — draw, setState batching, tree, find, submit
- [x] `test/cases/grid-view.test.ts` — rendering, pagination, cell tree, BadgeCell, DateCell
- [x] `test/cases/form.test.ts` — TextInput, FormPanel dirty/validate/save, CheckboxInput
- [x] `test/cases/datasource.test.ts` — roles, permissions, branches, CRUD, caching, WS, scripts
- [x] `lib/runtime.js` — demo BaseComponent (moved from test/lib/)
- [x] `lib/components.js` — all 22 components (moved from test/lib/)
- [x] `test/catalog/index.html` — visual component catalog
- [x] `test/pages/truck-fleet.html` — Fleet overview (StatRow + FilterBar + GridView)
- [x] `test/pages/truck-detail.html` — Truck detail (FormPanel + SplitPanel + TabPanel)
- [x] `test/pages/maintenance.html` — Maintenance dashboard (ProgressBar + TabPanel + GridView)

---

## Phase 1 — DuckDB data layer

Replace hardcoded mock arrays in demo pages with real DuckDB queries.
Use DuckDB-WASM in the browser; use `duckdb` npm package for Node.js test cases.

### 1a — Schema + seed  `[ ]`

Create the TMS schema and seed files that all subsequent phases share.

- [ ] `db/schema.sql` — DDL for the four TMS tables:
  ```sql
  trucks (id, plate, model, driver, phone, status, type, mileage,
          last_service, next_service, overdue_next, branch)
  maintenance_records (id, truck_id, date, type, status, cost,
                       technician, priority, overdue)
  trips  (id, truck_id, date, route, km, duration, load)
  issues (id, truck_id, severity, description, resolved, reported)
  ```
- [ ] `db/seed.sql` — INSERT statements for 42 trucks, ~30 maintenance records, trips, issues
- [ ] `db/README.md` — how to run schema+seed against a local DuckDB file

### 1b — DuckDB adapter for Node.js test cases  `[ ]`

Wire the test cases (`test/cases/datasource.test.ts`) to run against a real in-memory DuckDB
instead of mocking the query layer.

- [ ] Install `duckdb` npm package (`npm install duckdb`)
- [ ] `test/fixtures/duckdb.ts` — helper that opens in-memory DuckDB, runs schema+seed, exposes an `IRepository` adapter
- [ ] Update `datasource.test.ts` to use the real DuckDB fixture (remove mock `query: dbSpy`)
- [ ] Verify role gate, `:allowed_branches` injection, CRUD auto-gen all work against real queries

### 1c — DuckDB-WASM in demo pages  `[ ]`

Replace the hardcoded `ALL_TRUCKS`, `MAINTENANCE_LOG`, etc. arrays in the three demo pages
with SQL queries executed via `@duckdb/duckdb-wasm`.

- [ ] Add a shared `lib/db.js` module:
  - Loads `@duckdb/duckdb-wasm` from CDN (bundles WASM inline or via jsdelivr)
  - Exports `async function initDb()` — opens in-memory DB, runs schema+seed, returns connection
  - Exports `async function query(sql, params)` — parameterised query → `Record[]`
- [ ] Update `test/pages/truck-fleet.html`:
  - Remove `ALL_TRUCKS` array
  - Call `query('SELECT * FROM trucks ORDER BY plate LIMIT ? OFFSET ?', [PAGE_SIZE, offset])`
  - Wire `meta.total` from `SELECT COUNT(*) FROM trucks WHERE ...`
  - FilterBar applies `WHERE status = ? AND type = ?` in the query
- [ ] Update `test/pages/truck-detail.html`:
  - Fetch truck by id: `SELECT * FROM trucks WHERE id = ?`
  - Fetch maintenance log: `SELECT * FROM maintenance_records WHERE truck_id = ? ORDER BY date DESC`
  - Fetch trips and issues similarly
- [ ] Update `test/pages/maintenance.html`:
  - Query overdue: `SELECT * FROM maintenance_records WHERE overdue = true ORDER BY date`
  - Query this-week, scheduled, completed via date-range WHERE clauses
  - FilterBar uses `AND type = ? AND technician = ?`
- [ ] Update `test/catalog/index.html`:
  - GridView demo section: load 4 rows from DuckDB instead of hardcoded array

**DuckDB-WASM loading pattern (for reference):**
```js
// lib/db.js
import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm/+esm';

let _conn = null;
export async function initDb() {
  if (_conn) return _conn;
  const JSDELIVR = duckdb.selectBundle(await duckdb.getJsDelivrBundles());
  const worker = await duckdb.createWorker(JSDELIVR.mainWorker);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(JSDELIVR.mainModule, JSDELIVR.pthreadWorker);
  _conn = await db.connect();
  // run schema + seed (inline string or fetch from /db/schema.sql)
  await _conn.query(SCHEMA_SQL);
  await _conn.query(SEED_SQL);
  return _conn;
}

export async function query(sql, params = []) {
  const conn = await initDb();
  const result = await conn.query(sql, params);
  return result.toArray().map(r => r.toJSON());
}
```

---

## Phase 2 — JavaScript / TypeScript scripting engine

Implement the first scripting runtime so `DataSource.script` fields actually execute.
JS/TS is the priority because it runs in-process and needs no subprocess.

### 2a — ScriptRunner interface  `[ ]`

- [ ] `lib/scripting/runner.js` — defines the `ScriptRunner` interface:
  ```js
  export class ScriptRunner {
    /** @param {string} language */
    constructor(language) { this.language = language; }
    /**
     * Execute code with a given context object.
     * ctx is frozen and exposed as `ctx` inside the script.
     * @param {string} code
     * @param {object} ctx
     * @returns {Promise<unknown>}
     */
    async run(code, ctx) { throw new Error('not implemented'); }
  }
  ```
- [ ] `lib/scripting/index.js` — registry: `getRunner(language)` → `ScriptRunner | null`


export class HTML {
    /** @type {HTMLElement} */
    context;

    /** @type {HTML} */
 
### 2b — JavaScriptRunner  `[ ]`

Runs scripts in a sandboxed scope using `new Function`. No `process`, no `require`,
no `fetch` (unless explicitly passed in `ctx.http`).

- [ ] `lib/scripting/js-runner.js`:
  ```js
  export class JavaScriptRunner extends ScriptRunner {
    constructor() { super('javascript'); }
    async run(code, ctx) {
      const fn = new Function('ctx', `"use strict"; return (async () => { ${code} })()`);
      return fn(Object.freeze({ ...ctx }));
    }
  }
  ```
- [ ] Sandbox contract:
  - `ctx.user` — current user (read-only)
  - `ctx.params` — resolved YAML params
  - `ctx.db` — IRepository (passed in from DataSource runner)
  - `ctx.http.get / .post` — whitelisted fetch wrapper
  - `ctx.log.info / .warn / .error` — structured log
  - `ctx.env` — allowed env vars
  - Everything else: not accessible (no `window`, `document`, `process`, `globalThis`)
- [ ] `test/cases/js-runner.test.ts` — test cases:
  - Script can `return` a value
  - `ctx.user` is accessible
  - `ctx.params` are passed through
  - `process.exit(1)` throws (blocked by sandbox)
  - `window` is undefined
  - Async scripts work (`await` inside script body)
  - Script timeout (long-running script rejects after N ms)

### 2c — TypeScriptRunner  `[ ]`

Strip TypeScript type annotations, then delegate to JavaScriptRunner.

- [ ] Install `typescript` npm package (`npm install typescript --save-dev`)
- [ ] `lib/scripting/ts-runner.js`:
  ```js
  import ts from 'typescript';
  import { JavaScriptRunner } from './js-runner.js';
  export class TypeScriptRunner extends ScriptRunner {
    constructor() { super('typescript'); this._js = new JavaScriptRunner(); }
    async run(code, ctx) {
      const js = ts.transpileModule(code, {
        compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      return this._js.run(js, ctx);
    }
  }
  ```
- [ ] `test/cases/ts-runner.test.ts`:
  - Type annotations are stripped (no runtime error)
  - Interface declarations are ignored
  - `const x: string = 'hello'; return x;` → `'hello'`

### 2d — Wire scripting into datasource demo  `[ ]`

Update `lib/db.js` (Phase 1c) or add a new `lib/datasource-runner.js` that:
- Detects `DataSource.language` field
- Picks the right `ScriptRunner`
- Passes `ctx` with `db`, `user`, `params`, `http`, `log`, `env`
- Returns the script's return value as the query result

- [ ] `lib/datasource-runner.js` — `async function runDataSource(ds, user, params, repo)`
- [ ] Example scripting datasource in `test/pages/truck-fleet.html` (one column enriched by script)
- [ ] Update catalog scripting section to show a live JS script executing against DuckDB

---

## Phase 3 — Worktree-based parallel testing

Use git worktrees so multiple test suites run in isolated copies of the repo simultaneously.
Useful for: running the full suite while editing, testing multiple branches, CI parallelism.

### 3a — Vitest setup  `[ ]`

- [ ] `package.json` — add `vitest`, `@vitest/ui`, `jsdom`, `duckdb`, `typescript`
- [ ] `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['test/cases/**/*.test.ts'],
    },
  });
  ```
- [ ] `tsconfig.json` — point to `test/interfaces/` and `test/cases/`
- [ ] Verify `npx vitest run` executes all 4 test files

### 3b — Worktree test script  `[ ]`

- [ ] `scripts/test-parallel.sh` — creates N worktrees, runs a test shard in each, collects results:
  ```bash
  #!/usr/bin/env bash
  set -e
  SHARDS=${1:-2}
  ROOT=$(git rev-parse --show-toplevel)
  for i in $(seq 1 $SHARDS); do
    WT="$ROOT/.worktrees/shard-$i"
    git worktree add "$WT" HEAD 2>/dev/null || true
    (cd "$WT" && npx vitest run --reporter=json > "$WT/results.json" 2>&1) &
  done
  wait
  # merge results
  for i in $(seq 1 $SHARDS); do
    cat "$ROOT/.worktrees/shard-$i/results.json"
  done
  # cleanup
  for i in $(seq 1 $SHARDS); do
    git worktree remove --force "$ROOT/.worktrees/shard-$i"
  done
  ```
- [ ] Add `.worktrees/` to `.gitignore`
- [ ] Document usage in `db/README.md`: `bash scripts/test-parallel.sh 4`

### 3c — Shard-aware test config  `[ ]`

Let each worktree run a different subset of tests so there's no duplicate work.

- [ ] `vitest.config.ts` reads `SHARD_INDEX` and `SHARD_TOTAL` env vars
- [ ] Filter test files by index: `include: shardedFiles(process.env.SHARD_INDEX, process.env.SHARD_TOTAL)`
- [ ] Update `scripts/test-parallel.sh` to pass `SHARD_INDEX=$i SHARD_TOTAL=$SHARDS`

---

## File tree after all phases

```
core3/
├── html.js                          existing DOM builder
├── PLAN.md                          this file
├── package.json                     vitest, duckdb, typescript
├── vitest.config.ts
├── tsconfig.json
│
├── lib/                             importable library (no build step)
│   ├── runtime.js                   BaseComponent + tree
│   ├── components.js                22 UI components
│   ├── db.js                        DuckDB-WASM wrapper         [Phase 1c]
│   ├── datasource-runner.js         executes DataSource configs  [Phase 2d]
│   └── scripting/
│       ├── runner.js                ScriptRunner base            [Phase 2a]
│       ├── index.js                 registry                     [Phase 2a]
│       ├── js-runner.js             JavaScriptRunner             [Phase 2b]
│       └── ts-runner.js             TypeScriptRunner             [Phase 2c]
│
├── db/                              schema + seed
│   ├── schema.sql                                               [Phase 1a]
│   ├── seed.sql                                                 [Phase 1a]
│   └── README.md
│
├── scripts/
│   └── test-parallel.sh             worktree runner              [Phase 3b]
│
├── spec/                            existing HTML spec pages
│   ├── spec.css
│   ├── main.html
│   ├── frontend.html
│   ├── backend.html
│   ├── scripting.html
│   └── reference.html
│
└── test/
    ├── interfaces/                  TypeScript contracts (done)
    │   ├── component.ts
    │   ├── datasource.ts
    │   ├── auth.ts
    │   └── runtime.ts
    ├── fixtures/
    │   └── duckdb.ts                Node.js DuckDB helper        [Phase 1b]
    ├── cases/                       Vitest specs (done)
    │   ├── base-component.test.ts
    │   ├── grid-view.test.ts
    │   ├── form.test.ts
    │   ├── datasource.test.ts
    │   ├── js-runner.test.ts                                     [Phase 2b]
    │   └── ts-runner.test.ts                                     [Phase 2c]
    ├── catalog/
    │   └── index.html               component catalog (done, will get DuckDB)
    └── pages/
        ├── truck-fleet.html         (done, will get DuckDB)
        ├── truck-detail.html        (done, will get DuckDB)
        └── maintenance.html         (done, will get DuckDB)
```

---

## How to run

```bash
# Serve demo pages (ES modules require HTTP)
npx serve .
# open http://localhost:3000/test/catalog/index.html

# Run all test cases (after package.json + vitest setup)
npx vitest run

# Run tests in 4 parallel worktrees
bash scripts/test-parallel.sh 4
```

---

## Decisions + constraints

| Topic | Decision | Reason |
|---|---|---|
| Database | DuckDB only (for now) | In-process, zero config, WASM for browser |
| Scripting languages | JS first, TS second | Same runtime, TS just strips types |
| Script sandbox | `new Function` + frozen ctx | Simplest approach; no subprocess for JS |
| Future sandboxing | `isolated-vm` or Deno worker | If `new Function` scope leaks are a concern |
| Python / Lua / Shell | Deferred | Needs subprocess or WASM runtime; out of scope for now |
| Browser DB | DuckDB-WASM via jsdelivr CDN | No bundler needed; consistent with no-build-step goal |
| Node DB (tests) | `duckdb` npm package | Same SQL, different adapter |
| Worktrees | git worktree, not Docker | Lightest isolation; shares git objects |
