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

- Reorder concurrency acceptance now covers both groups and dashboards within
  a group on real PostgreSQL 17 and DuckDB. Both connections reach the update
  barrier with the same list version; exactly one commits and the other returns
  the declared 409 conflict. Each case verifies the winner's entire order, one
  version increment and unchanged rows outside its scope. All five concurrency/
  mapping tests (44 assertions), targeted lint and diff checks pass. PostgreSQL
  used a disposable localhost container removed after testing. These are separate
  database connections in one test process; separate application processes and
  concurrent HTTP response handling remain open.
- Live PostgreSQL 17 verification exposed a reorder race: both transactions could
  commit after reading the same list signature under the default isolation.
  Reorder YAML now requests PostgreSQL serializable isolation through the generic
  mutation runtime; the repository supplies its database driver. The losing
  transaction rolls back and maps Bun's SQLSTATE in errno to the declared 409.
  The opt-in CORE3_TEST_POSTGRES_URL test uses two independently reserved real
  connections and verifies exactly one winner, its complete order and one version
  increment per row. DuckDB and PostgreSQL cases both pass, alongside the module
  suite: 17 tests, 233 assertions. Targeted lint and diff checks pass. Testing used
  a disposable localhost-only container, removed after completion. PostgreSQL
  migration application was exercised; nested reorder races, competing processes
  and the complete PostgreSQL workbook feature matrix remain open.
- Reorder mutations now declare their transaction-conflict response in YAML.
  After rollback, the generic runtime maps the observed DuckDB update conflict
  and PostgreSQL serialization/deadlock SQLSTATEs to that named 409 error. Other
  errors, including unknown transaction outcomes and uniqueness violations, stay
  unchanged; mutations without this declaration retain existing behavior. The
  real two-connection DuckDB test verifies the mapped error and intact winner.
  Controlled connection tests verify rollback order and error classification.
  All 16 spreadsheet/concurrency tests (227 assertions), targeted lint and diff
  checks pass. Live PostgreSQL conflict and actual concurrent HTTP responses still
  require acceptance; this change does not strengthen transaction isolation.
- A concurrent reorder test now uses two real DuckDB connections, pauses both
  after reading the same list signature and releases their updates together.
  Exactly one transaction commits; stored order and versions match that winner
  with no partial losing update. The five assertions pass. PostgreSQL SQL
  translation also preserves existing DOUBLE PRECISION types instead of producing
  DOUBLE PRECISION PRECISION; four adapter tests pass. Targeted lint and diff
  checks pass. These are same-process DuckDB concurrency and adapter-translation
  evidence; PostgreSQL transaction isolation, live PostgreSQL reorder execution,
  multi-process behavior and conflict-to-HTTP mapping remain unverified.
- Reorder handles accept touch/pen pointer gestures with pointer capture, a small
  movement threshold and cancellation handling. Touch-action suppression applies
  only to the handle, preserving ordinary table scrolling elsewhere. Nested
  dashboard handles are visible on mobile. Chromium touch input verifies moving
  a group, cancelling without a request and persisted order after reload; the
  mobile layout was visually inspected. All five touch/mouse/keyboard/lifecycle
  browser tests, targeted lint and diff checks pass. Physical touch devices, pen
  input, off-screen auto-scrolling and other browser engines remain unverified.
- Generic list reordering now permits one pending move per component, exposes
  busy state and handles rejected callbacks without an unhandled promise. Browser
  evidence holds a request open, sends another gesture, verifies one submission,
  rejects the move, checks unchanged row order and visible feedback, then retries
  successfully. All three reorder browser tests, 12 shared list-renderer tests,
  targeted lint and diff checks pass. The rejection test uses a controlled HTTP
  response; it does not replace the separate backend stale-list checks or pending
  multi-process race verification.
- Dashboards inside a group now use the same generic drag/keyboard renderer with
  their own YAML reorder action. The server derives the source group, rejects
  cross-group destinations and validates the ordered visible IDs/versions before
  changing that group's sequences. Browser evidence verifies dragging, reload
  persistence and subsequent publication with the refreshed version. Integration
  tests cover spoofed group IDs, company/permission denial, stale lists and
  unaffected dashboards outside the group. Four reorder/lifecycle browser tests,
  14 integration tests (209 assertions), targeted lint and diff checks pass.
  Touch gestures, large paginated ordering and multi-process race behavior still
  need implementation or acceptance.
- Dashboard groups now support mouse drag reordering and Alt+Arrow keyboard moves
  through a schema-validated YAML reorder action and generic ListView callback.
  The server checks the visible list's ordered IDs/versions before transactionally
  assigning sequences and incrementing versions. Reordering is disabled for sorted,
  grouped and incomplete paginated lists; filtered list signatures are rejected
  if they omit visible server rows. Company and management checks protect source
  and destination groups. Browser evidence verifies dragging first to last,
  reload persistence, moving back by keyboard and hidden controls for non-managers.
  The focused browser test, 14 integration tests (202 assertions), 12 shared list
  renderer tests, build, targeted lint and diff checks pass. The other four
  configuration browser tests passed in the preceding run. Touch drag, nested
  dashboard ordering and multi-process reorder races remain open; the transaction
  test evidence does not establish those broader guarantees.
- Group display order can be changed through a YAML form. Only management actors
  in the group's company scope can save it, with expected-version checks and
  bounded whole-number validation. Integration evidence verifies that the viewer
  group list uses the saved order and rejects invalid, stale and denied changes.
  Browser evidence verifies saving zero and reading it back after reload. All 14
  integration tests (197 assertions), the focused browser test, targeted lint and
  diff checks pass. This supplies saved ordering; drag gestures on list handles
  remain unimplemented and are still required for complete ordering parity.
- Duplicate dashboard-group creation returns a named 409 conflict with a useful
  message. YAML checks existing names and uses an INSERT conflict fence so a
  skipped insert cannot report success. Integration tests exercise both checks
  independently and verify one stored row; browser evidence verifies the error
  toast, correction in the still-open form and successful retry. All 14 spreadsheet
  tests (188 assertions), the focused creation browser test, targeted lint and
  diff checks pass. This does not establish multi-process database race coverage.
- Dashboard groups support inline renaming through a YAML-defined management
  action. Company visibility, required names, duplicate names and expected row
  versions are checked before mutation; only the name is writable. The form and
  nested dashboard source refresh together. Shared inline field editors now use
  their YAML label as the input's accessible name. Browser evidence verifies
  rename, heading/nested-row updates, preserved notebook content and reload.
  All four configuration browser tests and 14 integration tests (185 assertions),
  targeted lint and diff checks pass. Group reordering and full navigation remain
  open.
- Custom dashboard groups are now included in the company-scoped configuration
  list. Group creation moved to its page-owned YAML API, refreshes the actual
  configuration datasource, rejects blank names and assigns the authenticated
  company instead of accepting arbitrary company/official fields. Integration
  evidence covers permission denial, spoofed fields, cross-company visibility
  and adding a dashboard to the new group. Browser evidence verifies creation,
  immediate list refresh and reload persistence. All 14 spreadsheet integration
  tests (178 assertions), three configuration browser tests, targeted lint and
  diff checks pass. Group rename/reordering and complete navigation remain open.
- Dashboard creation is available on desktop as well as mobile. The shared form
  renderer now returns notebook content slots to the page compositor, keeping the
  nested dashboard list inside its Spreadsheets tab. Browser tests create through
  the modal, publish/archive/restore, reload and check management-only controls
  at 1440px and 390px; both pass and screenshots were inspected. All 12 shared
  list-renderer tests, production build, targeted lint and diff checks pass.
  The broader modal run has one existing unrelated expectation mismatch: its
  money-input test expects string '2.50', while the unchanged normalizer returns
  numeric 2.5 (24 of 25 combined renderer/modal tests pass).
- Dashboard lifecycle controls now have browser evidence using the actual group
  page/API YAML, PageRuntime renderer and authenticated YAML API against the
  isolated DuckDB fixture. Publish, Archive and Restore refresh row-action
  visibility, restored Draft survives reload, and an actor without dashboard
  management permission sees none of those controls. The styled screenshot was
  inspected. The lifecycle/template/document browser regression passes three
  tests; the styled lifecycle rerun, targeted lint and diff checks also pass.
  This covers the group-row workflow, not complete dashboard configuration UX.
- Archived dashboards can be restored to Draft through a YAML workflow and a
  group-row Restore action. Restoration keeps publication off, checks dashboard
  and group company boundaries, requires management permission and atomically
  checks the expected row version. The nested dashboard source now returns state,
  which its Publish/Archive/Restore visibility expressions require. API and source
  tests verify archive/restore/republish, stale and repeated restores, denied
  actors, and absence from the viewer landing page until republished. All 14
  spreadsheet integration tests (171 assertions), targeted lint and diff checks
  pass. Group-row controls also have the browser evidence described above.
- Dashboard configuration now applies company visibility to group lists, group
  details, nested dashboard lists and dashboard details. YAML creation guards
  reject inaccessible groups and blank names; new dashboards use the authenticated
  actor's company instead of becoming Global. Rename guards check both dashboard
  and group visibility before concurrency checks. Group counts are computed from
  visible dashboard rows, so new private dashboards update the owner's company
  count without leaking into another company's count. Integration tests exercise
  authenticated creation/rename, spoofed company fields, stale edits, denied
  permissions and group boundaries, plus source visibility and dynamic counts.
  The dashboard/workbook regression run passes 32 tests and 360 assertions;
  targeted lint and diff checks pass. Browser configuration workflows and the
  remaining dashboard lifecycle still need acceptance.
- Print cells now use engine-computed styles, preserving conditional fills and
  text formatting, and engine-computed borders with their color, thickness and
  dashed/dotted styles. Merged cells read their outer perimeter borders; shared
  edges inherit the adjacent cell's explicit border. Proportional column widths
  keep collapsed outer borders inside the clipped print range. Browser assertions
  and visual inspection verify a merged rectangle, four border styles, a shared
  dashed edge and a conditional formula-cell fill. All five print browser tests,
  production build, targeted lint and diff checks pass. Mixed border segments
  along one merged edge and the complete conditional-format/table-style matrix
  still need acceptance; this is not full print-fidelity sign-off.
- Printing supports repeating the first visible header rows of a selected range,
  with a YAML-configured row-count limit. Header merges are preserved; merges
  crossing the header/body boundary are rejected, as are headers too tall for
  reliable page repetition. Native table header groups repeat across PDF pages.
  PDF.js 6.3.289 is a test-only dependency for inspecting generated PDF text.
  The multi-page test verifies one merged heading on every page and all 197
  visible body rows exactly once, with a hidden row excluded. The controls were
  visually inspected. Four print browser tests, configuration validation, build,
  lint and diff checks pass. Repeated headers combined with page-crossing figures,
  repeated columns and persistent per-sheet settings remain open.
- Print paper sizes, default paper and margin limits are now YAML-defined.
  The sample declares A4, Letter and Legal; the preview exposes paper selection,
  orientation and uniform margins. Width fitting uses the selected physical page
  dimensions minus margins, replacing fixed A4 pixel constants. Invalid margin
  input clears the preview and disables printing. Configuration validation rejects
  invalid dimensions, duplicate paper IDs, unknown defaults and unusable margins.
  Browser evidence checks the applied page rule, fitted width and actual PDF page
  dimensions for Letter landscape and Legal portrait. The controls were visually
  inspected. Three print browser tests, configuration validation, the real Orders
  print/API test, production build, targeted lint and diff checks pass. Persistent
  per-sheet print settings, repeated columns and other advanced layout remain open.
- Revision crash tests now cover both sides of the real database COMMIT. A
  test-only connection wrapper holds the child server immediately before commit
  or after commit but before the HTTP acknowledgement. Forced termination before
  commit preserves the old head/log; termination after commit preserves the entire
  new revision. Retrying the identical request saves it once or returns the stored
  acknowledgement as appropriate. A conflicting retry is rejected, and an actual
  XLSX export verifies the recovered cell value through engine replay. All fault
  injection stays in the isolated test child. Validation: all three process-crash
  scenarios pass (71 assertions), including the earlier queued-export recovery case.
- Abrupt process recovery now has an actual child-server test. After two
  acknowledged revisions and a queued export, the parent force-kills the Bun
  server without closing DuckDB. Restart replays the acknowledged revisions and
  automatically processes the queued export. A second forced kill follows a third
  acknowledged revision; another restart retains both that revision and the already
  generated artifact, with its original revision and formulas, while workers are
  paused. This test initially exposed DuckDB's catalog WAL replay failure on the
  freshly migrated database. Successful DuckDB migration runs now checkpoint before
  returning to startup; unchanged migration runs do not add checkpoints.
  The observed error matches the upstream [catalog WAL replay issue](https://github.com/duckdb/duckdb/issues/22044).
  Crashes during a migration, other in-flight transaction boundaries, large logs,
  power loss and multi-process stress remain unverified. Revision COMMIT boundaries
  are now covered by the additional tests above.
  Validation: 42 spreadsheet/backend tests (634 assertions), five additional
  migration upgrade/rollback tests, targeted lint and diff checks pass. The crash
  evidence uses separate Bun processes and forced SIGKILL, not graceful DB close.
- Cancellation now interrupts the dedicated import/export engine after a local
  cancellation commits. Workers also poll YAML-defined lease ownership, so a
  cancellation from another runtime, lease takeover or expiry can interrupt the
  matching conversion on the next successful poll. A delayed response belonging
  to a completed job cannot interrupt its successor. Transient observation errors
  do not cancel valid work; the final SQL lease check remains authoritative.
  Tests cover local interruption, duplicate/unrelated cancellation, continued work
  on the next job, delayed ownership responses and cancellation observed through
  the real job table by a separate worker instance. Validation: 8 job tests
  (80 assertions), both browser import/export workflows and targeted lint pass.
  Worker-termination latency under load and multi-process stress remain unverified.
- XLSX export conversion now has a durable queue, private expiring artifacts and
  an Export activity dialog. Prepare XLSX resolves live Core3 data under the
  requesting actor before persisting the job; no authentication token is stored.
  Preparation replaces Core3 expressions and their spilled output with values,
  retaining ordinary formulas. A separate engine converts that prepared snapshot.
  YAML owns visibility, limits, leases, retries, cancellation and artifact expiry.
  Downloads recheck export permission, current workbook access and the declared
  permissions of used datasources. Artifacts retain data from preparation time;
  downloading does not requery current business rows. Ownership/company isolation,
  revoked workbook access, declared source permission denial, expiry, restart,
  stale lease rejection and cancellation have API evidence. The real Orders API
  verifies actor-specific prepared values, ordinary formulas, spilled arrays and
  denial during preparation. Browser evidence covers preparation, a later workbook
  edit, reload and downloading the original prepared revision.
  Import/export workers share the lease/retry scheduler with separate YAML state
  transitions. Live-data preparation is still synchronous; durable snapshot jobs,
  detailed progress, worker-termination latency under load, full feature fidelity and
  multi-process stress remain open. The synchronous Download XLSX action is retained.
  Validation: 38 backend tests (588 assertions), 23 browser tests, production
  build, targeted lint and diff checks pass. The opt-in enterprise benchmark is
  skipped in the functional suite; its separate performance gate remains failed.
- XLSX imports now have a durable YAML-owned queue and an Import activity dialog.
  Uploads are committed before returning 202; a separate engine worker processes
  queued jobs. Owner/company scope protects job status and results. YAML declares
  per-user pending limits, retry/lease/retention policy and all state transitions.
  Workbook creation, its verified initial checkpoint and job completion commit
  atomically. Lease tokens fence cancelled or superseded conversions; terminal
  jobs discard uploaded bytes, and retention removes old job metadata while keeping
  created workbooks. Transient engine failures retry up to the configured limit;
  malformed files fail without repeated conversion. Startup polling recovers expired
  leases without storing authentication tokens. The library uses this path and
  provides queued/running/completed/failed/cancelled status, cancellation and opening
  the completed private workbook after closing the dialog or reloading the page.
  Integration evidence covers real XLSX formulas, private ownership, database reopen,
  obsolete-worker rejection, retries, cancellation during conversion and upload/queue
  limits. Browser evidence covers upload, closing, page reload and reopening a result.
  Durable snapshot jobs, detailed conversion progress, worker-termination latency
  under load and multi-process stress remain open.
  Validation: 36 backend tests (543 assertions) and 22 browser tests passed; the
  opt-in enterprise benchmark remained skipped. The final focused import suite
  passes 41 assertions, adding retention and competing-worker checks. Production
  build, targeted lint and diff checks pass. No PostgreSQL runtime or process-kill
  stress evidence is claimed from the DuckDB reopen/lease tests.
- Owners can publish saved templates to their company and withdraw publication.
  YAML owns catalog/reuse visibility and atomic owner/company/version-checked
  publication. New and migrated templates start private; forged publication on
  template creation is ignored. Recipients can create private independent copies,
  but cannot modify, publish or delete the source template. Withdrawal removes it
  from recipients' catalogs and rejects future creation without changing copies.
  Publishing exposes the saved workbook contents, as explained in the picker;
  it does not grant access to the source workbook. Source formulas remain definitions
  and continue to use the copying actor's data permissions.
  API evidence covers company isolation, owner-only changes, stale versions,
  private copies and withdrawal. Two browser sessions exercise publish, recipient
  reuse, withdrawal and continued calculation in an existing copy. The complete
  template catalog remains open.
  Validation: 17 workbook runtime tests (193 assertions), including migration
  upgrade/rollback with existing records, passed. Template editing/reuse and
  company publication browser workflows passed; the final publication workflow
  was rerun after its URL setup changed. Build, targeted lint and diff checks pass.
- Saved template metadata is editable from the catalog. YAML owns the owner/company
  checks and atomic version-checked update; stale edits return 409. The endpoint
  validates names, descriptions and versions, and cannot change ownership or the
  saved workbook snapshot. Static YAML templates remain immutable through this API.
  The version migration preserves existing records and supports rollback on DuckDB.
  Validation: 15 workbook runtime regression tests, a separate migration round-trip
  test, the browser create/edit/reuse/delete workflow and targeted lint passed.
  The full template catalog remains open.
- Document references are YAML-owned and stored separately from workbook content.
  Owners can find readable documents through the Documents service's authenticated
  query API, link them and remove references. Documents exposes a Spreadsheets
  action; its filtered library requires document access plus the workbook's own
  membership/company checks. Links grant no permissions. Every reference lookup
  rechecks the source; archived/missing documents disappear for readers and appear
  as removable unavailable references for owners. Browser coverage exercises link,
  filtered navigation and unlink. A two-database integration test uses the actual
  Documents YAML API and checks independent permissions, workbook company scope,
  source denial, idempotent links and limits. Documents' previously non-persisting
  Submit/Approve/Archive declarations now have YAML mutations with state/version
  checks, tested through the real action API. This implements references, not
  document-file storage or folder ACL inheritance; those remain open.
  Validation: 31 backend tests and 21 browser tests passed, along with the
  production build and targeted lint. The focused Documents integration test
  additionally passes 50 assertions, including document-write permission for a
  workbook owner and authentication-derived link authorship.
- Workbook printing now has an authorized server snapshot endpoint and a separate
  print preview. Export permission is required; live formulas use the requesting
  actor's data access and filter preferences. YAML enables the feature and limits
  each preview to 100,000 cells and 16,777,216 aggregate figure pixels. The preview supports sheet/range selection,
  A4 portrait/landscape, width fitting, formatted text/numbers, basic cell styles,
  merged cells and hidden rows/columns. Printing uses its iframe document, with
  cleanup on close or workspace disposal. Browser evidence covers formatting,
  escaping, range checks, invocation and generation of a multi-page PDF; the
  preview was visually inspected. The real Orders API test checks actor values
  and source denial. Charts reuse the engine's raster renderer; embedded raster
  images retain workbook positions. The used area expands to include figures,
  explicit ranges clip them, and printing waits for image decoding. A bar chart
  and PNG have rendered/PDF evidence; other chart families and page-crossing
  figures still need acceptance. All-visible-sheets printing starts each sheet
  on a new page and excludes hidden sheets. Print applies current range settings
  even without a separate preview update. Unsupported figures fail visibly.
  Conditional-format fidelity, remaining advanced page setup and
  large-document jobs remain required for complete print parity.
  Regression validation: 30 backend tests (417 assertions), 20 browser tests,
  production build and targeted ESLint pass. The enterprise benchmark remains
  skipped in the functional suite and has not passed its separate gate.
- Dynamic range pivots have browser and real Orders acceptance coverage. Insert >
  Pivot table creates a durable pivot; a grouped sum of linked cells refreshes,
  survives reload and becomes #N/A after source denial. Durable state contains
  definitions/formulas without the fixture's customer rows. A rendered pivot was
  visually inspected. The real API test verifies actor-specific PIVOT.VALUE XLSX
  cell totals, frozen dynamic output, source denial and immutable public snapshots.
  This covers a grouped sum with native command configuration, not all sidebar
  interactions, aggregators, static conversion, business-service aggregate pivots
  or native Excel pivot-table/cache round trips.
- YAML can declare workbook templates with names, descriptions, permissions and
  engine snapshots. The authenticated catalog omits unauthorized templates and
  snapshot payloads. Creation resolves the template on the server, normalizes it
  through the engine and saves a new private workbook under the actor's company.
  The library's Templates picker includes a budget planner with variance/totals.
  API tests cover denied/unknown templates, conflicting snapshot input, ownership
  spoofing and independent copies. Browser coverage verifies create, calculation,
  save and reload. The complete template catalog remains pending.
  Owners can also save the committed workbook as a private template and delete
  saved templates from the picker. YAML owns the table, account/company scope,
  insertion guard and deletion rules. Server replay preserves formula definitions
  without copying browser caches. Stale heads and archived sources are rejected;
  later source edits and template deletion do not change existing copies. Tests
  cover actor/company isolation, creation after source edits, live-formula
  preservation, disk reopen and the browser save/reuse/delete workflow.
  Validation after private template integration: 30 backend tests (385 assertions),
  17 browser tests, targeted ESLint and production build pass. The opt-in
  enterprise benchmark remains skipped in the functional suite and failed at
  its last measured run.
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
- Dashboard publication now toggles between Draft/unpublished and Published.
  The YAML action increments the row version atomically and refreshes dependent
  sources. Archived dashboards cannot be republished by the toggle. Both the
  toggle and publish/archive workflow enforce dashboard and group company scope.
  Authenticated API tests cover both toggle directions, landing-list visibility,
  stale versions, archive rejection, forged company fields and denied permissions.
  Regression validation: 28 backend tests (346 assertions), 21 schema tests,
  targeted ESLint and diff checks pass. The disk-reopen test stops the old runtime
  before reopening and allows 15 seconds for disk/worker startup; it remains a
  correctness test and does not replace or relax the enterprise performance gate.

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

Latest browser validation: **32 client/schema/transport/file tests + 3 dashboard unit tests + 21 browser tests
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
| Workbook lifecycle | Create/rename/duplicate/archive/restore, YAML/private/company templates, template metadata editing and document references implemented; full template catalog and document-file storage pending |
| Durable command persistence | Transactional head/log, clean reopen, acknowledged-revision crashes, both revision COMMIT boundaries and safe retries verified; other transaction crash points and large-log recovery pending |
| Collaboration | Two networked browsers converge and reconnect; WebSocket presence and 50-client soak pending |
| Server-authoritative validation/history | Worker validation, verified checkpoints, snapshot replay boundaries and owner-only restore implemented; physical retention/compaction and complete command-family validation evidence pending |
| Core3 lists/pivots/charts and global filters | Per-viewer reads, YAML catalog, CORE3.VALUE and persisted viewer global filter overrides implemented; isolation/refresh/dependent recalculation and filtered exports verified; named bindings, live pivots/charts and complete filter types/editor pending |
| Dashboard replacement | Actual engine surface, library linking and viewer filter controls implemented; navigation, formulas, read-only behavior, ownership/company link guards and refresh after revocation verified; complete filter semantics, legacy figure migration and full dashboard lifecycle pending |
| Immutable public sharing | Stored legacy snapshots and expiring/revocable owner-published workbook snapshots implemented; anonymous bootstrap, formula/spill/text freezing and revocation verified; complete figure/filter/asset fidelity and legacy token lifecycle still pending |
| Import/export/print | Client/server XLSX, library import, formula round trip, authorized cell/figure printing and all-visible-sheets printing verified; complete file-feature matrix, remaining figure fidelity and advanced page setup pending |
| Documents | References, access intersection when browsing links, and workflow transitions verified; document-file storage, folder ACL inheritance and complete Documents workflows pending |
| Durable background jobs | Imports and prepared XLSX exports have persistent queues, retries, lease recovery, state progress and cancellation; durable snapshot preparation, detailed progress and multi-process stress pending |
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
- Library imports use the durable import queue; the legacy synchronous import API
  remains available. Prepared XLSX conversion is durable; authorization and live-data
  preparation, synchronous downloads and snapshot actions still use the request
  worker. Durable snapshot preparation remains required for the full plan. Embedded
  PNG/JPEG/GIF/WebP image parts are supported; external image URLs fail export
  explicitly until an authorized asset resolver is implemented. Full XLSX feature
  fidelity and large-file resource measurements remain unproven.
- The workbook migration currently supports DuckDB/Postgres SQL; other database
  drivers must not be advertised as supported for this capability.
- The adapter imports the upstream engine LICENSE as a Vite asset so production
  output includes the notice. Keep those notices with redistributed assets.
  Dependency source/license: https://github.com/odoo/o-spreadsheet/tree/19.0.
