# Purchase QA ledger

## Candidate QA — `fa6e2b65` — 2026-09-13

- Worktree: `/home/nhanjs/projects/core3-worktrees/purchase-receipt-lifecycle-20260913`
- Candidate: `fa6e2b65cd8e4191a5aebd2577ac3394187f4759`
- Scope: bounded Purchase receipt cancellation lifecycle only; no full Purchase parity sign-off.
- QA state: conditional evidence recorded; open gates remain.

### Verification results

- Focused: `bun test ./test/purchase_receipt.integration.test.ts --timeout 20000` — **PASS**, 4 tests, 35 assertions, 0 failures. The passing cancellation case verified seeded `purchase-receipt-p00005` / `WH/IN/00005` starts Draft at version 1, cancellation persists Cancelled at version 2, and the latest message stores actor `Purchase User`, action `purchase.receipt.cancelled`, label `Cancelled`, and detail `Receipt cancelled`. A repeat cancellation is rejected with status 409 and `PURCHASE_RECEIPT_NOT_OPEN`.
- The focused suite also passed the existing receipt contract, line CRUD/stale guards, and Ready-to-Done workflow. Its permission evidence is declaration-level (`purchase.write`/`purchase.read` assertions); it does not prove an authenticated actor HTTP 403 for cancellation.
- UI audit: `bun run audit` — **PASS**, 659 pages, 668 routes, 1,139 datasources; every discovered page uses supported shared components and has a route.
- CSS: `bun run css:build:purchase` — **PASS** (`sass` completed successfully).
- ESLint: `bunx eslint --no-ignore test/purchase_receipt.integration.test.ts` — **PASS**, exit 0. The attempted directory lint `bunx eslint services/purchase test/purchase_receipt.integration.test.ts` was not a valid scoped check because the service YAML directory is ignored by ESLint.
- Diff check: `git diff --check` — **PASS**.
- Full regression: `bun test ./test --timeout 20000` — **NOT COMPLETED**. It remained active after numerous passing files and was interrupted at QA request; no aggregate pass is claimed.

### Browser and Odoo evidence

- Candidate server attempt: `bun run dev --db=ddb --memory --port=4399` from the candidate sample package exposed Vite at `http://localhost:3002`, but the backend at the reported `http://127.0.0.1:3001` never became reachable (`curl` connection refused). The authenticated Playwright probe therefore could not load `/auth/login`; no candidate receipt cancellation click, reload, console/request, or actor-boundary evidence was produced.
- The server and regression processes were stopped. No hanging browser/Odoo probe remains.
- Existing pre-candidate evidence remains limited to route/render smoke and PO/vendor slices: `/tmp/core3-odoo-parity/module-matrix-20260912/purchase-desktop.png`, `purchase-mobile.png`, `/tmp/core3-purchase-acknowledge-desktop.png`, and the vendor paired captures listed in the prior ledger. These do not prove candidate receipt cancellation and are not relabeled as candidate captures.
- Existing Odoo/Core3 vendor paired captures show an open fidelity finding (fixture cardinality, action label/fields/activity differences). No fresh Odoo receipt pair is claimed for this candidate.

### Open findings and gates

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-QA-001 | Authenticated candidate receipt cancellation desktop/mobile and paired Odoo evidence unavailable because backend `:3001` was unreachable | open/blocker |
| PURCHASE-QA-002 | Cancellation stale-version rejection was not directly exercised by the new test; only the successful version-1 transition and repeat closed-state guard were exercised | open coverage gap |
| PURCHASE-QA-003 | Permission evidence for cancellation is contract metadata only; no authenticated Purchase User/Fleet/unauthenticated HTTP actor matrix was completed | open coverage gap |
| PURCHASE-VIS-001 | Prior vendor Odoo/Core3 paired comparison remains open for fixture cardinality and visible field/activity differences | open, pre-existing |

### Tester decision

The bounded persistence/audit implementation is supported by the focused integration evidence and static quality checks above. This ledger does **not** sign off the complete Purchase module, authenticated cancellation UI, stale cancellation guard, actor permission boundary, full regression, or Odoo visual parity.

## Conditional review handoff — candidate `0f5620e8` (2026-09-13)

- Purchase Analysis bounded API/page slice: **conditional pass**. Focused
  suite passed 9 tests / 95 assertions; audit, Purchase Sass, Vite frontend,
  API normal/search/repeat/empty behavior, 401/403 boundaries, and diff-check
  passed.
- Blocker `QA-PURCHASE-ANALYSIS-BROWSER-001`: authenticated Core3 desktop/mobile
  browser comparison and fresh paired Odoo captures were unavailable because
  persistent `js_repl` was unavailable and Playwright was not installed in the
  candidate worktree.
- Blocker `QA-PURCHASE-TS-001`: repository TypeScript remains non-clean from
  pre-existing shared `med`, client/server, and unrelated AI diagnostics; no
  candidate Purchase file was implicated.

Disposition: retain as **conditional only**; do not integrate or sign off the
Purchase module until browser/Odoo evidence and the TypeScript blocker are
resolved or explicitly waived.

## Reviewer disposition — candidate `2afe3fc4`

- Integrated on the active branch as `38497c93`; the bounded Vendor CRUD delta
  preserves the richer active vendor list/detail contract and adds timestamp
  mutation behavior plus stale/not-found guards and a dedicated regression
  test.
- Post-merge Vendor verification passed: 2 tests / 8 assertions, with the
  candidate's broader 90-test / 1,013-assertion evidence retained separately.
- Preserved blockers: direct timestamp before/after assertion, repository
  TypeScript diagnostics, authenticated desktop/mobile browser evidence, and
  fresh Odoo comparison. Purchase remains conditional and unsigned-off.

## 2026-09-13 coordinator review: repair candidate `19eec536`

- **Not integrated.** The candidate is a one-test diff, but its patch context
  depends on an older `purchase.integration.test.ts` structure. Cherry-picking
  it onto the active branch imported a 55-line Vendor test context and produced
  three unrelated active-contract failures (15 tests: 12 passed, 3 failed)
  in Vendor route and Purchase Analysis datasource assertions.
- The attempted integration was reverted as `03b22d62`; no candidate code is
  retained. Same-owner repair required: rebase the timestamp/version assertion
  onto the active Purchase test structure or provide a standalone test file,
  with no route-contract changes.
- Candidate evidence remains conditional bounded pass (10 tests / 110
  assertions, API persistence, timestamp/version, audit/CSS/Vite/diff-check).
  Preserve TypeScript and authenticated Core3/Odoo browser blockers; no
  Purchase module sign-off is issued.

## 2026-09-13 coordinator reconciliation: candidate `19eec536`

- The candidate’s timestamp/version repair was **not retained** because its
  one-test diff was not self-contained against the active Purchase test
  structure. The attempted cherry-pick imported stale Vendor test context and
  caused three active-contract failures; that attempt was reverted as
  `03b22d62`.
- Same-owner repair remains required: rebase the timestamp assertion onto the
  active tests or submit a standalone test. Preserve the candidate’s
  conditional evidence and the TypeScript/authenticated Core3/Odoo blockers.

## 2026-09-13 coordinator dispatch

- Dispatched to the existing Purchase developer owner on
  `agent/odoo-ui-purchase-analysis` at
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-purchase-analysis`.
- Durable owner handoff: `qa/purchase-repair-handoff.md`, commit `989c2621`.
  The owner must repair against current active contracts, run the focused
  Purchase suite plus audit/build/diff-check and scoped ESLint, commit a
  self-contained candidate, then trigger the existing Purchase QA owner for
  retest and return the evidence here. No duplicate owner/worktree was
  created.

## 2026-09-13 R2 coordinator dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-PURCHASE-RECEIPT-WAVE-20260913-R2` → `QA-PURCHASE-RECEIPT-WAVE-20260913-R2` | existing `agent/odoo-ui-purchase-receipt-lifecycle-20260913` in `/home/nhanjs/projects/core3-worktrees/purchase-receipt-lifecycle-20260913` | Receipt cancellation/fulfillment stale and actor/company guards, 401/403 and missing references, and focused unchanged-row/no-partial-write tests | dispatched in `8111d52c`; awaiting self-contained product commit before QA |

| `DEV-PURCHASE-ANALYSIS-WAVE-20260913-R2` → `QA-PURCHASE-ANALYSIS-WAVE-20260913-R2` | existing `agent/odoo-ui-purchase-analysis` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-purchase-analysis` | Purchase Analysis graph/pivot/list filters and measures, company/permission boundaries, deterministic empty/missing/invalid/transport states, and focused refusal tests | dispatched in `1736911a`; awaiting self-contained product commit before QA |

## 2026-09-13 lifecycle decision — Purchase Analysis R2

- Handoff `1736911a` was re-polled after the unresolved `0f5620e8` contract
  conflict and repeated repair requests. The owner worktree has no new commit
  or implementation diff; only its pre-existing untracked `qa/purchase.md`
  remains.
- The same-owner repair is therefore **stalled/terminal for this wave**. The
  active branch remains unchanged, and the conditional `0f5620e8` evidence and
  its browser/TypeScript blockers are preserved. No Purchase module sign-off
  is implied.

## QA disposition `c14ca127`: blocked; same-owner repair required (2026-09-13)

- Do **not** integrate `c14ca127`. Focused receipt QA passed **6 tests / 53
  assertions** and full Purchase passed **58 tests / 558 assertions**; lifecycle
  guards, actor contracts, atomicity, build, audit, CSS, lint, and diff-check
  passed.
- Critical defect `PURCHASE-RECEIPT-001`: authenticated admin is `Core3 Demo
  Company`, while `WH/IN/00005` is seeded as `My Company (San Francisco)`.
  Live Cancel returns the company-scope error before mutation, so live
  cancellation and persistence cannot be signed off.
- Repair is routed to existing owner/worktree
  `agent/odoo-ui-purchase-receipt-lifecycle-20260913` at
  `/home/nhanjs/projects/core3-worktrees/purchase-receipt-lifecycle-20260913`:
  align the deterministic receipt fixture/company context, then rerun
  authenticated Cancel/fulfillment mutation and reload checks.
- Preserve live restart and authenticated paired Odoo gates. Candidate remains
  blocked; no product merge or replacement owner was created.

## Reviewer reconciliation `120cc740`: held for active Purchase dependencies (2026-09-13)

- Owner QA passed the repaired receipt lifecycle: Draft -> Cancelled `1 -> 2`,
  reload/mobile, file-backed reopen, stale/wrong-company/Fleet/anonymous/missing/
  closed replay and atomicity, 59 tests, build/audit/CSS/targeted ESLint, and
  diff-check. `PURCHASE-RECEIPT-001` is resolved in the owner lineage.
- Active verification exposed missing prerequisite Purchase contracts: the
  broader suite failed in Purchase Analysis datasource mapping, receipt
  activity actor handling (`purchase_receipt_messages.actor_name` NOT NULL),
  and receipt read error-state declarations. The provisional cherry-pick was
  reverted as `4265e3ac`; no Purchase product change is integrated.
- Same owner must rebase the receipt lifecycle repair with its required active
  Purchase contract dependencies, then rerun the full Purchase suite and gates.
- Preserve authenticated Odoo comparison and unrelated Website lint blockers.

## Reviewer reconciliation `8e67c355`: conditionally integrated (2026-09-13)

- The self-contained receipt/analysis bundle was cherry-picked as `7c34b28c`.
  The owner worktree later advanced to `db3e0caa`; that later HEAD was not
  substituted for the candidate during review.
- Active bounded verification passed receipt **7 tests / 56 assertions** and
  Purchase Analysis **3 tests / 24 assertions**. Audit passed **661 pages / 670
  routes / 1160 datasources**; Purchase CSS build and `git diff --check` passed.
  The broader active Purchase run exceeded the review command window after
  emitting many passes; owner QA records the complete **61 tests / 576
  assertions** pass across 17 files.
- Receipt cancel lifecycle, close/reopen persistence, timeline actor, analysis
  totals/report, stale/actor/company/anonymous/atomicity guards, and
  desktop/mobile evidence are accepted for this bounded slice.
- Conditional status remains because authenticated Odoo comparison is
  unavailable. Unrelated Website lint findings remain outside this slice.

## 2026-09-21 candidate QA — Purchase Order Print report

- Scope: Odoo Purchase Order form `Print` report actions only; no full Purchase
  parity sign-off.
- Source/live gate: local Odoo 19 source under
  `/home/nhanjs/projects/odoo/addons/purchase`; authenticated `core3_reference`
  session at `http://localhost:8069`, confirmed order `P00012`, desktop and
  mobile captures.
- Focused validation: `bun test ./test/purchase_order_print.integration.test.ts
  --timeout 30000` — **PASS**, 4 tests, 27 assertions, 0 failures.
- Contract coverage: page/API `purchase-detail` join, Odoo source/report IDs,
  quotation Draft -> Sent transition, confirmed state preservation, read
  permission declaration, actor/stale/missing/invalid-state guards, no partial
  rows, migration replay, and file-backed restart persistence.
- Browser Core3: isolated clean-branch runtime plus only the Purchase patch at
  `http://localhost:4412`; authenticated Admin User reached
  `/purchase/detail?id=po-demo-005`, clicked `Print`, and produced HTTP 200
  `POST /api/mutate` plus HTTP 200 refresh queries. Desktop body/document
  widths were `1916/1916`; mobile widths were `390/390`.
- Evidence: `/tmp/core3-odoo-parity/purchase-order-print-20260921/` and the
  committed evidence manifest at
  `evidence/purchase/2026-09-21/PURCHASE-PRINT-001/README.md`.

### Open gates

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-PRINT-QA-001 | Odoo's report click completes as a browser download, so no post-download DOM success state or PDF byte was extracted | open, accurately bounded in evidence |
| PURCHASE-PRINT-QA-002 | Shared working-tree runtime cannot start because unrelated Email/SMS changes fail global YAML discovery; Purchase evidence was captured from a clean temporary runtime with only this Purchase patch | blocker outside Purchase scope; unrelated files preserved |
| PURCHASE-PRINT-QA-003 | Core3 currently prepares and persists report metadata but does not render/download a binary PDF | follow-up implementation gap |

Disposition: **conditional bounded pass** for the declarative action contract,
workflow guard, persistence, restart, and authenticated button interaction;
not a full PDF-rendering or module sign-off.

## 2026-09-22 candidate QA — RFQ email composer

- Scope: Draft/Sent Purchase RFQ `Send RFQ` composer only. Confirmed-order
  `Send PO` is not included.
- Source/live gate: local Odoo 19 source at
  `/home/nhanjs/projects/odoo/addons/purchase` and authenticated
  `core3_reference` at `http://localhost:8069`; P00011 was checked at desktop
  and an emulated iPhone 14 viewport. Odoo showed the full Compose Email
  modal with recipient, subject, body, RFQ PDF attachment, Send, and Discard.
- Focused validation: `bun test ./test/purchase_order_email.integration.test.ts
  --timeout 30000` — **PASS**, 4 tests, 28 assertions, 0 failures.
- Purchase regression validation: focused Purchase suite — **PASS**, 28 tests,
  238 assertions, 0 failures. `bun run audit` — **PASS**, 789 pages, 798
  routes, 1626 datasources. `bun run frontend:build` — **PASS**.
- Contract coverage: matching page/API id, `purchase.write` composer action,
  Draft/Sent workflow guard, row-version guard, vendor/content/actor guards,
  durable email history, migration replay, and file-backed restart.
- Evidence: committed manifest and source comparison at
  `evidence/purchase/2026-09-22/PURCHASE-SEND-RFQ-001/`, with Odoo desktop and
  mobile composer screenshots.

### Open gates

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-RFQ-QA-001 | Core3 authenticated `/purchase/detail?id=po-demo-001` rendered `Send RFQ`, but clicking it produced no `/api/mutate` request, modal, or console error in the shared browser runtime | open UI-dispatch blocker; no Core3 visual pass claimed |
| PURCHASE-RFQ-QA-002 | `bun run audit:yaml` is not a repository script | tooling limitation; audit and focused tests passed |

## 2026-09-22 candidate QA - confirmed Send PO composer

- Scope: confirmed/received Purchase Order `Send PO` composer only; Draft/Sent
  `Send RFQ` and state-specific Print remain separate bounded slices.
- Source/live gate: local Odoo 19 Purchase source and authenticated
  `core3_reference` `P00012` at `http://localhost:8069`; desktop and emulated
  iPhone 14 modal captures are committed in
  `evidence/purchase/2026-09-22/PURCHASE-SEND-PO-001/`.
- Focused validation: `bun test ./test/purchase_order_send_po.integration.test.ts
  --timeout 30000` - **PASS**, 4 tests, 27 assertions, 0 failures.
- Regression validation: RFQ email, Print, and Purchase integration tests
  passed; `bun run audit` passed with 805 pages, 814 routes, and 1664
  datasources; `bun run frontend:build` and `git diff --check` passed.
- Contract coverage: `purchase-detail` page/API join, `Send PO` action and
  Purchase Order prefill datasource, `purchase.write`, Confirmed/Received
  state guards, vendor/content/actor/stale/missing guards, durable email
  history, migration replay, and file-backed restart.

### Browser result and open gate

The isolated Core3 module runtime at `http://127.0.0.1:4015` authenticated
successfully and loaded `/purchase/detail?id=po-demo-005` at desktop and
mobile. The `Send PO` button was visible and detail captures were taken, but
clicking it produced no modal and no `/api/mutate` request. The network buffer
contained successful HTTP 200 detail/datasource reads, and the console had no
new application exception. This is the same shared `server_form`/mail-composer
dispatch blocker observed by the RFQ composer slice. No Core3 composer visual
parity or send-flow pass is claimed.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-SEND-PO-QA-001 | Core3 `Send PO` click does not dispatch the declared `server_form` action in the authenticated runtime | open shared-runtime blocker |
| PURCHASE-SEND-PO-QA-002 | Odoo composer modal and desktop/mobile controls are captured; completed external mail/PDF delivery is not exercised | bounded follow-up |

Disposition: **conditional bounded pass** for source-backed YAML contract,
workflow/permission guards, durable persistence, restart coverage, and Odoo
desktop/mobile evidence; Core3 composer browser integration remains blocked by
the exact UI dispatch finding above.

## 2026-09-22 candidate QA — Purchase Order Catalog action

- Stable ID: `PURCHASE-CATALOG-001`.
- Scope: Products-tab `Catalog` action only; no full Purchase sign-off.
- Source: Odoo 19 `purchase_views.xml:240-255`,
  `purchase_order.py:1149-1168`, and `purchase_order_line.py:531-533`.
- Focused: Catalog + order-line regression **PASS**, 5 tests / 49 assertions.
- Purchase regression: **PASS**, 86 tests / 743 assertions.
- Audit: **PASS**, 824 pages / 832 routes / 1,714 datasources.
- Frontend/CSS: **PASS**, Purchase Sass and `bun run frontend:build`.
- Diff check: **PASS**.
- Evidence: `evidence/purchase/2026-09-22/PURCHASE-CATALOG-001/`.

### Contract and persistence result

The page/API pair remains joined by `page.id: purchase-detail`. The Catalog
options datasource filters active `purchase_ok` products and the `purchase.write`
server form atomically adds or merges selected products. Fresh migration and
replay, total/version recalculation, stale parent, locked/non-editable order,
empty selection, missing product, and positive quantity guards are covered.

### Browser result and open gates

BrowserSkill instance `245ea108` was connected. The first borrow of signed-in
Odoo tab `1770662590` was denied because session `lexx` held it. A new borrow
request in session `jqlz` stayed pending until its 120-second timeout; the
session was stopped. No Odoo tab was borrowed or returned, no desktop/mobile
capture was produced, and no visual-parity claim is made.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-CATALOG-QA-001 | Authenticated live Odoo tab was unavailable through the required BrowserSkill borrow flow | open blocker; no visual claim |
| PURCHASE-CATALOG-QA-002 | Core3 uses one quantity for a multi-select and fixture `cost_price`; Odoo has per-card seller-price behavior | bounded follow-up |

Disposition: **conditional bounded pass** for the source-backed declarative
contract, durable add/merge workflow, guards, tests, and build. This does not
sign off the Purchase module or visual parity.

## 2026-09-22 candidate QA — Purchase Order Add a section

- Stable ID: `PURCHASE-ORDER-SECTION-001`.
- Scope: Purchase Order Products-tab `Add a section` line action only; Odoo's
  `Add a note` and full Purchase sign-off remain outside this slice.
- Source: Odoo 19 `addons/purchase/views/purchase_views.xml:250-253`, with the
  existing `purchase.order.line` display-line model contract.
- Focused: `bun test ./test/purchase_order_sections.integration.test.ts
  ./test/purchase_order_lines.integration.test.ts --timeout 30000` — **PASS**,
  7 tests / 53 assertions.
- Contract coverage: `purchase-detail` page/API join, Purchase write
  permission, Draft/Sent unlocked state guard, stable durable `line_section`
  fixture, atomic parent row version and zero-total persistence, section edit
  and delete, invalid/stale/locked/non-section guards, and migration replay.
- Audit: `bun run audit` — **PASS**, 834 pages, 842 routes, 1,740 datasources.
- `bun run audit:yaml` — **UNAVAILABLE**; no such script exists in the active
  `sdk/bun/sample/package.json`.

### Browser result and open gates

BrowserSkill instance `245ea108` was connected and session `imom` was stopped
cleanly. The required borrow of signed-in Odoo tab `1770662590` did not enter
the agent scope: the borrow confirmation remained pending until the 30-second
request timeout, and `bsk tab list --scope all` showed the tab still in user
scope. Because the live tab was not borrowed, this slice has no truthful live
Odoo action inspection, no desktop/mobile screenshots, and no Core3 browser
captures; no visual-parity claim is made and no credentials were accessed.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-SECTION-QA-001 | Required BrowserSkill borrow confirmation timed out before the authenticated Odoo tab entered agent scope | open blocker; no visual claim |
| PURCHASE-SECTION-QA-002 | Shared LineItemGrid control dispatch was changed and covered indirectly by the page/action contract, but authenticated click/reload proof is unavailable until a tab/runtime is borrowable | open browser gate |
| PURCHASE-SECTION-QA-003 | `Add a note` remains a separate source-defined Products-tab action | explicit follow-up |

Evidence manifest: `evidence/purchase/2026-09-22/PURCHASE-ORDER-SECTION-001/`.
This is a conditional bounded pass for source-backed persistence and guards,
not a visual or module sign-off.

## 2026-09-22 candidate QA — Confirm RFQ list action

- Stable ID: `PURCHASE-RFQ-CONFIRM-001`.
- Scope: Odoo Purchase RFQ list/kanban `Confirm RFQ` bulk action only; no full
  Purchase sign-off.
- Source: Odoo 19 `addons/purchase/views/purchase_views.xml:921-933` and
  `addons/purchase/models/purchase_order.py:625-639`.
- Focused validation: `bun test ./test/purchase.integration.test.ts -t
  'confirms eligible RFQs' --timeout 30000` — **PASS**, 1 test / 8 assertions;
  restart/replay test — **PASS**, 1 test / 2 assertions.
- Purchase Sass: `bun run css:build:purchase` — **PASS**.
- Diff check: `git diff --check` — **PASS**.
- Contract coverage: page/API `purchase-rfqs` binding, `purchase.write`, empty
  and invalid selection guards, Draft/Sent confirmation, unchanged To Approve
  selection, row versions, deterministic `po-demo-010`, replay, and restart.

### Browser result and open gates

BrowserSkill was healthy (`245ea108`), but the only local Odoo-looking user tab
(`1770663154`) did not enter agent scope during borrow request session `sotj`
and the request timed out. The session was no longer registered afterward; no
tab was borrowed, so no tab return or authenticated Odoo/Core3 capture is
claimed and no credentials were accessed.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-RFQ-CONFIRM-QA-001 | Required authenticated BrowserSkill tab borrow timed out | open blocker; no visual claim |
| PURCHASE-RFQ-CONFIRM-QA-002 | Repository audit cannot discover all pages because unrelated Activity/CRM/Accounting YAML references are incomplete in the shared checkout | external blocker; Purchase files preserved |

Disposition: **conditional bounded pass** for the source-backed YAML contract,
durable confirmation workflow, state/permission guards, migration, and focused
tests; not a browser or full-module sign-off.

## 2026-09-22 candidate QA — Purchase Order Upload Bill

- Stable ID: `PURCHASE-UPLOAD-BILL-001`.
- Scope: confirmed/received Purchase Order `Upload Bill` action only; PDF
  rendering, OCR/vendor-price extraction, multi-vendor batch upload, and full
  Purchase sign-off remain outside this slice.
- Source: Odoo 19 `addons/purchase/views/purchase_views.xml:139` and
  `static/src/components/purchase_file_uploader/purchase_file_uploader.js`.
- Focused validation: `bun test ./test/purchase_order_bill_upload.integration.test.ts
  --timeout 30000` — **PASS**, 5 tests / 28 assertions.
- Contract coverage: `purchase-detail` page/API join, `purchase.write`, upload
  metadata and actor guards, confirmed/received state and row-version guards,
  Accounting Vendor Bill creation, durable attachment/bill link, billing
  refresh, Accounting failure atomicity, migration replay, and restart.
- Evidence: `evidence/purchase/2026-09-22/PURCHASE-UPLOAD-BILL-001/`.

### Browser result and open gates

BrowserSkill instance `245ea108` was connected, but the required borrow of
authenticated Odoo tab `1770662590` remained user-scoped. The single borrow
request was pending in session `yabv` until BrowserSkill cleanup; no tab was
borrowed, so no new live desktop/mobile capture or authenticated Core3 click
proof was obtained. Existing Odoo detail captures are referenced in the
feature manifest only. No visual-parity claim is made.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-UPLOAD-BILL-QA-001 | Required authenticated tab borrow did not enter agent scope | open blocker; no visual claim |
| PURCHASE-UPLOAD-BILL-QA-002 | Core3 persists attachment metadata and bill linkage but does not yet expose binary download/OCR/vendor-extracted invoice values | bounded follow-up |

Disposition: **conditional bounded pass** for the source-backed upload action,
Accounting integration, durable persistence, guards, and focused tests; not a
visual or module sign-off.

## 2026-09-22 candidate QA — Purchase Order Add a note

- Stable ID: `PURCHASE-ORDER-NOTE-001`.
- Scope: Purchase Order Products-tab `Add a note` line action only; no full
  Purchase sign-off.
- Source: Odoo 19 `addons/purchase/views/purchase_views.xml:250-253` and
  `addons/purchase/models/purchase_order_line.py:91-104,287-307`.
- Focused validation: `bun test ./test/purchase_order_notes.integration.test.ts
  --timeout 30000` — **PASS**, 4 tests / 21 assertions.
- Contract coverage: `purchase-detail` page/API join, `purchase.write`,
  Draft/Sent unlocked state guard, stable `line_note` fixture, atomic parent
  row version and zero-total behavior, note edit/delete, invalid/stale/locked/
  non-note guards, migration replay, and file-backed restart.
- Full Purchase regression: **PASS**, 94 tests / 785 assertions. UI audit,
  Purchase Sass, frontend build, and `git diff --check` also passed.

### Browser result and open gates

BrowserSkill instance `245ea108` was connected. The required signed-in Odoo
tab `1770662590` was requested for borrowing in session `cqvt`, but the borrow
confirmation did not complete; `bsk tab list --scope all` subsequently showed
the tab still in user scope. The session was stopped without borrowing or
returning a tab. No live Odoo/Core3 desktop/mobile capture was obtained and no
visual-parity claim is made.

| ID | Finding | Result |
| --- | --- | --- |
| PURCHASE-NOTE-QA-001 | Required BrowserSkill borrow confirmation did not complete before the tab remained user-scoped | open blocker; no visual claim |

Evidence manifest: `evidence/purchase/2026-09-22/PURCHASE-ORDER-NOTE-001/`.
This is a conditional bounded pass for source-backed persistence and guards,
not a visual or module sign-off.
