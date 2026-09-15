# Spreadsheet engine implementation — 2026-09-15

## Status

Engine integration, a YAML-defined workbook library, durable revision storage,
and initial network collaboration are implemented. The enterprise performance
gate remains failed. The full module plan is **not complete**. Dashboard lifecycle,
global filters and the complete public-sharing feature matrix remain unfinished. Implementation is
continuing toward the entire plan; the performance gate prevents sign-off, not
further development.

The agreed target remains Odoo 19 product behavior using o-spreadsheet, 50
concurrent editors, one million populated cells, and read-only business-data
bindings. No target has been lowered.

## Delivered

- Pinned `@odoo/o-spreadsheet` 19.0.50 (bundle hash e499258), Owl 2.8.2,
  Bootstrap 5.3.3, Font Awesome 4.7.0, and fflate 0.8.2.
- Added the engine's missing Chart.js runtime: Chart.js 4.4.5, Luxon 3.5.0,
  chartjs-adapter-luxon 1.3.1 and chartjs-chart-geo 4.3.2, matching the pinned
  engine's development dependency versions. The adapter supplies its expected
  globals and controllers in browser/worker realms. Dependencies remain lazy.
  A real Insert > Chart browser workflow verifies live bar-chart rendering,
  refresh, formula-only durable definitions and reload without Owl errors. The
  real Orders backend test verifies authorized worksheet values referenced by
  exported OOXML chart ranges and preservation of charts with frozen cell values.
  Geographic/date-axis/remaining chart families, image-export paths and live
  pivots still require separate acceptance evidence.
- Lazy engine adapter with mount/dispose lifecycle and scoped vendor CSS.
  The npm archive's entry-point names are incorrect; explicit underscore-named
  bundle imports are contained in the adapter. The archive also omits its
  advertised TypeScript declarations, so a narrow local declaration describes
  the imported surface.
- `SpreadsheetWorkbook` component plus YAML schema: `source`, `mode`
  (`normal`, `readonly`, `dashboard`), `save_action`, and `allow_export`.
  The data source supplies a row with `name` and `workbook_snapshot`.
- Optional save submits the declared Core3 action with the row and serialized
  snapshot. This is an integration seam, not a new persistence backend or
  collaborative save implementation. Permissions must be enforced by the source
  and action; component flags do not grant server access.
- Genuine browser/server XLSX export: the engine generates OOXML parts and fflate
  creates their ZIP container, preserving embedded raster image bytes. Workbook
  downloads enforce export permission and use committed server revisions. The
  legacy dashboard download route also now returns XLSX bytes and fails closed
  if its authentication adapter is unavailable. Legacy shares now store their
  snapshot separately from the dashboard; existing shares are backfilled once.
- XLSX upload from the workbook library imports into a new private workbook.
  YAML declares upload, expanded ZIP and entry-count limits. The worker rejects
  unsafe archive paths and XML entities; engine conversion warnings are shown
  in Import notes. Formula round trips pass API and browser tests.
- Owner-published workbook links store server-frozen cell values, including
  spilled arrays and numeric-looking text. Tokens have 256 random bits and only
  their SHA-256 hashes are stored. YAML limits lifetime to 30 days; owners can
  revoke links and archiving disables them. Anonymous viewing is read-only.
  The link token is placed in the viewer URL fragment. The sample app's actual
  anonymous bootstrap and the editor component both have browser coverage.
- A reusable internal datasource reader routes reads through the owning YAML
  service's normal authenticated query API. Workbook YAML declares the service,
  source, allowed columns, typed filters and page limit. The first catalog entry
  uses the existing Orders datasource and preserves its branch/date restrictions.
  The editor includes a read-only data browser with filtering, paging and refresh.
  Query results remain per viewer and never enter shared workbook snapshots or
  revisions. `CORE3.VALUE(source, field, row, filtersJSON)` is registered in the
  engine, and clicking a value in the data browser inserts its formula at the
  active cell. Formulas persist normally; each viewer resolves them through their
  own paged cache. Refresh invalidates prior values and recalculates linked cells
  plus dependents; stale responses cannot restore a revoked viewer's cached data.
  Named binding definitions and live pivots/charts remain pending.
- The data browser inserts a whole page as a linked formula range with column
  headings. One native paste produces one durable revision and one undo step;
  fetched business values are absent from its stored commands. Occupied targets
  are rejected. Browser evidence covers evaluation, undo/redo and reload. The
  native engine omits clientId on undo/redo; the server now derives that identity
  from authentication and retains original-author checks, including denied
  cross-author undo and idempotent retries. Lists currently have a fixed number
  of positional rows; named bindings and automatic range growth remain pending.
- YAML datasource fields can map to shared global filter identifiers. Text/date/
  number/boolean values persist per workbook and authenticated viewer, with typed
  validation and source permission checks. Editor/dashboard controls apply or
  clear overrides and refresh linked cells without workbook revisions. Server
  data reads, XLSX and frozen publication apply the same viewer preferences.
  The real Orders test verifies different viewer results and filtered exports/
  shares; browser coverage verifies editor-to-dashboard persistence and clearing.
  Interactive workbook-specific filter definitions, selection/relation filters,
  relative-date operators and automatic refresh across a user's tabs remain open.
- XLSX export and publication now evaluate live formulas in isolated worker
  models under the requesting actor's datasource permissions. Render models and
  page results never enter the shared validation cache or durable workbook.
  Dependent filters are resolved in bounded batches; YAML limits a render to
  10,000 page queries. Permission failures abort output. Extra queries discovered
  by the engine's export-time recalculation are resolved before returning bytes.
  Formula insertion and frozen text use character expressions for quotes and
  backslashes to match the pinned engine's string syntax, including trailing
  backslashes. The owning datasource still decides row visibility.
- Normalization of legacy version-1 placeholder cell values into engine input.
  Placeholder figure labels are not real chart definitions and are not promoted
  into a claim of chart parity. Existing stored records are not rewritten.
- Dashboard navigation now mounts actual persisted snapshots in engine dashboard
  mode. Hard-coded KPI/chart/map/treemap/grid rendering is removed. Desktop/mobile
  switching, formula evaluation, edit rejection and engine disposal have browser
  coverage. Dashboard titles use text nodes. Display-only date/granularity controls
  are removed pending real global filters. Dashboards can now link library
  workbooks through a YAML-owned picker/action/migration. Only active workbooks
  owned by the manager in the same company can be linked; viewers independently
  pass workbook API access checks. Linked snapshot data is omitted from the
  dashboard datasource. Refresh reloads committed state and actor-scoped live
  data; denied/archived workbooks clear the surface. Open workbook leads to the
  library's editing/export/publishing controls. Existing legacy links keep their
  frozen contents; the legacy share action cannot republish a linked dashboard.
  Figure migration and the complete dashboard lifecycle remain.
- Browser verification and opt-in million-cell benchmark with CPU profiling.

Initial engine validation: 23 focused client/schema tests, 13 existing Spreadsheet
integration tests (126 assertions), and four Chromium functional tests passed.
Targeted ESLint and the sample Vite production build passed. Vite reports the
expected large lazy-loaded engine chunk (approximately 1.51 MB minified, 388 kB
gzip); the engine is not eagerly loaded by unrelated pages. The opt-in enterprise
benchmark failed as recorded below.

## Evidence and performance gate

Measured locally in headless Chromium 145 on Windows, Intel i7-1355U (10 cores,
12 logical processors), approximately 64 GiB RAM. This is not the planned
8-core/16 GB reference client and includes no server/network latency.

Fixture: one million populated cells, including 100,000 simple formulas, across
100,000 rows and ten columns. Workbook model construction and calculation are
measured separately from fixture generation. No million-cell UI rendering time
is included, so these results do not establish time to an interactive workbook.

| Measurement | First run, no profiler | Diagnostic run, CPU profiler | Target |
| --- | ---: | ---: | ---: |
| Model construction + calculation | 34,699 ms | 12,970 ms | <10,000 ms |
| Local command + dependent formula, p95 | 151 ms | 568 ms | <100 ms |
| Full snapshot serialization | 4,452 ms | 13,766 ms | diagnostic |
| Snapshot JSON size | 17,667,714 characters | 17,667,714 characters | diagnostic |

Both runs failed the load and input thresholds. The different profiling and
runtime conditions mean these are individual observations, not stable medians.
The profiled construction alone took 12,109 ms. Profile samples concentrate in
engine export, cell computation, range grouping, and garbage collection.

Functional checks cover real browser mounting, formula recalculation, JSON
serialization/reload, OOXML output, structural edits, and local engine-client
convergence. The 50-client test uses small workbooks and the engine's in-memory
transport in one browser. It is **not** a network, durable-server, restart,
one-hour soak, permission, or 50-million-cell-memory test.

## Reproduction

From `sdk/bun/packages/client`:

```powershell
bun run test:spreadsheet

$env:SPREADSHEET_BENCHMARK = 'true'
bun run test:spreadsheet

# Optional diagnostic run; profiling changes timing.
$env:SPREADSHEET_PROFILE = 'true'
bun run test:spreadsheet
```

Playwright outputs screenshots and JSON/profile attachments under `test-results`.
The benchmark deliberately exits nonzero when thresholds fail. Normal functional
runs skip the benchmark. Install the pinned Playwright Chromium with
`bunx playwright install chromium` if it is absent.

For an interactive engine preview:

```powershell
bunx vite --config test/spreadsheet-browser/vite.config.ts
```

Open http://127.0.0.1:4319. The preview is a test fixture: edits are local and
can be downloaded; it does not connect to production records.

## Workbook persistence and network collaboration

The app now declares `/spreadsheet/workbooks`, backed by
`/api/spreadsheet/workbooks`. Its manifest enables the shared `workbooks` runtime
capability. `workbooks.yaml` owns queries, transactional mutations, company/owner/
member access, permissions, request limits, and the pinned engine command allowlist.
The TypeScript runtime contains no Spreadsheet-service table names or SQL.

Implemented behavior:

- Library, creation, search, rename, duplicate, archive/restore, and granting
  reader/editor access. Access removal is implemented at the API level.
- Initial snapshot plus an ordered revision log. A transaction updates the head
  and inserts its revision before the server acknowledges it. Stale heads fail
  with 409; retrying the same accepted revision is idempotent. Changed payloads
  cannot reuse the same revision ID.
- User/company context comes from authentication, including on subsequent polls
  and writes. Client IDs are namespaced by authenticated user so one user cannot
  impersonate another user's engine client and suppress its remote updates.
- Engine-compatible HTTP transport polls every 250 ms, fills sequence gaps before
  delivering ACKs, and lets the engine rebase pending edits after a conflict.
  It retries transient failures and stops editing when access is revoked.
- The server validates commands with the pinned engine in a worker before commit.
  Invalid batches evict their partially changed cache; subsequent requests replay
  committed state. Workbook creation also normalizes data through that engine.
- Saved versions are generated by server replay, never by trusting browser data.
  A SNAPSHOT_CREATED barrier advances the snapshot pointer and resets old undo
  history across live clients. Physical revision history is retained.
- Version history supports owner-only restore as a new revision. The replaced
  head is preserved as a verified version. Synchronized clients reopen; clients
  with pending edits freeze and can preserve those edits in a recovery copy.

Evidence: the API suite verifies company isolation, private access, reader/editor
permissions, owner-only access management, stale metadata, archiving, deduplicated
retries, concurrent stale edits, and an on-disk close/reopen/replay cycle. Two
independent browser contexts verify UI creation, granting access, simultaneous
edits, convergence, reload recovery, and revocation. Another browser test verifies
offline edits remain pending and persist after reconnecting. Transport unit tests
cover out-of-order ACKs and an obsolete-request retry race after rebasing.

This is real database-backed network collaboration, but it is not yet WebSocket
presence, physical log retention/compaction, abrupt-process recovery,
multi-process coordination, or the 50-client enterprise soak. Only close/reopen,
not process killing, was tested for storage recovery in this batch.

The browser suite launches a dedicated Bun server and an isolated temporary
database. Test bearer identities are fixtures; the sample application continues
to use its real auth adapter. No production credentials or databases are used.

Latest browser validation: **32 client/schema/transport/file tests + 3 dashboard unit tests + 15 browser tests
passed**, including dashboard switching on desktop/mobile, saved-version boundaries, continued formula edits, restore,
an offline collaborator's recovery copy surviving reload, and XLSX upload/download.
The backend suite additionally verifies the real Orders YAML query through the
source owner's auth path: different viewers see their own branches, injected
identity filters are rejected, source denial is preserved, and refresh observes
updated values without changing the workbook revision. The browser data-inspector
test uses HTTP fixtures for display/refresh/denial behavior; the separate backend
test provides the authorization and real-query evidence. Backend tests also
cover semantic batch rejection, verified snapshots, and reversible restore.
Targeted ESLint, Vite build, and diff checks passed. Full lint reports two existing
no-unsafe-optional-chaining errors in website_public.integration.test.ts:31,33.
The opt-in million-cell gate remains separately failed;
it was skipped in the normal functional run, not relabeled as passing.

## Full-plan completion tracker

| Requirement | Current evidence / remaining work |
| --- | --- |
| Pinned reusable engine and YAML schema | Implemented; browser rendering, input, formulas, export and lifecycle tests |
| Full editing, formulas, formatting, tables, charts, pivots | Engine integrated; complete Odoo workflow inventory and per-feature acceptance still open |
| Workbook lifecycle | Create/rename/duplicate/archive/restore implemented; templates and Documents links pending |
| Durable command persistence | Transactional head/log and disk reopen verified; abrupt kill/restart and large-log recovery pending |
| Collaboration | Two networked browsers converge and reconnect; WebSocket presence and 50-client soak pending |
| Server-authoritative validation/history | Worker validation, verified checkpoints, snapshot replay boundaries and owner-only restore implemented; physical retention/compaction and complete command-family validation evidence pending |
| Core3 lists/pivots/charts and global filters | Per-viewer reads, YAML catalog, CORE3.VALUE and persisted viewer global filter overrides implemented; isolation/refresh/dependent recalculation and filtered exports verified; named bindings, live pivots/charts and complete filter types/editor pending |
| Dashboard replacement | Actual engine surface, library linking and viewer filter controls implemented; navigation, formulas, read-only behavior, ownership/company link guards and refresh after revocation verified; complete filter semantics, legacy figure migration and full dashboard lifecycle pending |
| Immutable public sharing | Stored legacy snapshots and expiring/revocable owner-published workbook snapshots implemented; anonymous bootstrap, formula/spill/text freezing and revocation verified; complete figure/filter/asset fidelity and legacy token lifecycle still pending |
| Import/export/print | Client/server XLSX, committed-state export permissions, library import and formula round trip verified; complete file-feature matrix, frozen values and print acceptance pending |
| Documents | Pending document references, permission intersection and workflow tests |
| Durable background jobs | Pending imports/exports/snapshots with retry/cancel/progress |
| Enterprise scale | Million-cell load/input gate failed; optimization and reference-machine measurements pending |
| Complete parity/rollout | Feature inventory, complete actor matrix, monitoring, rollout flag and rollback audit pending |

## Required work before advancing the gate

1. Optimize or patch the pinned engine's import/calculation path and repeat
   cold/warm measurements on the reference client. A worker may keep UI responsive
   but does not alone meet the ten-second load requirement.
2. Extend semantic validation evidence to every command family and test large
   checkpoints/recovery. Add physical log retention without losing audit history.
3. Extend the authorized transport with WebSocket presence and test 50 independent
   clients, process failure, and the one-hour network soak. Existing two-browser
   and disk reopen tests do not establish those requirements.
4. Only advance the production feature rollout after the agreed gate passes.
   Follow-on phases still include workbook lifecycle/history, live Core3 data
   adapters, dashboards, immutable shares, real server import/export, Documents,
   durable background jobs, and full Odoo workflow evidence.

## Integration limits

- One visible engine surface per document: the pinned engine locates viewport
  and grid geometry using document-level selectors. Shadow DOM breaks that
  behavior. CSS `@scope` isolates framework styles while preserving light DOM.
- Chromium is verified; other browsers and CSS-scope compatibility are not.
- The new backend and schema migrations cover workbooks and stored share snapshots.
  Dashboard rendering uses the engine. The legacy download emits XLSX. No deployment
  was performed. Legacy snapshots preserve their stored formulas; evaluating
  volatile formulas in those old shares remains a separate migration concern.
- Workbook publication freezes cell values. External images are refused until an
  authorized asset resolver can embed immutable bytes. Complete conditional-format,
  chart, pivot and future business-data binding freeze semantics remain unproven.
- Authorized server export/publication of CORE3.VALUE is implemented. The real
  Orders integration test verifies different branch values in two actors' XLSX
  files, dependent query filters, immutable publisher values, source denial,
  fresh reads after source changes, query-limit rejection and subsequent recovery.
  Reads across multiple pages/services do not yet share a database snapshot;
  cross-source consistency and large-render resource measurements remain open.
  Legacy standalone exports still reject live formulas without an actor resolver.
- Live formula browser evidence uses separate HTTP fixtures for two collaborators:
  one stored formula produces 42 and 99; refresh changes only the first to 73,
  dependent formulas update, and source denial produces #N/A without a revision.
  Real source authorization/row scope is separately covered by the Orders API test.
- File jobs currently run in the engine worker with a timeout, without durable
  queue/retry/progress/cancel. These remain required for the full plan. Embedded
  PNG/JPEG/GIF/WebP image parts are supported; external image URLs fail export
  explicitly until an authorized asset resolver is implemented. Full XLSX feature
  fidelity and large-file resource measurements remain unproven.
- The workbook migration currently supports DuckDB/Postgres SQL; other database
  drivers must not be advertised as supported for this capability.
- The adapter imports the upstream engine LICENSE as a Vite asset so production
  output includes the notice. Keep those notices with redistributed assets.
  Dependency source/license: https://github.com/odoo/o-spreadsheet/tree/19.0.
