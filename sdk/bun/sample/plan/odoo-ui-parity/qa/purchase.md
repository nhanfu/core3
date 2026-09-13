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
