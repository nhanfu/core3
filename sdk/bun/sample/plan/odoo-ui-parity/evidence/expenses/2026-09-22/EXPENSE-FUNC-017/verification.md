# EXPENSE-FUNC-017 verification

Functional and static verification was run for the department approval Form
mode. The change is limited to the Expenses page contract, its focused test,
and Expenses evidence/QA records; no shared client or unrelated module file was
changed.

Verification results:

- First focused run: 3 tests / 14 assertions passed.
- Full Expenses corpus: 60 tests, 51 passed, 9 discovery-phase failures.
- Focused rerun: 2 tests passed; the discovery assertion was blocked by the
  unrelated Purchase page reference to missing `upload_purchase_bill`.
- Merged Expenses page/API contract validation passed directly.
- `bun run css:build:expenses` passed.
- `bun run frontend:build` passed.
- `git diff --check` passed.
- `bun run audit` was blocked by global discovery; it reached the unrelated
  Purchase action-reference/schema defect rather than an Expenses error.

BrowserSkill record:

- Instance `245ea108`: daemon and extension connected.
- Required authenticated Odoo tab `1770662590` was listed but already borrowed
  by session `yabv`.
- Borrow returned `tab is borrowed by another session`; this worker did not
  stop or interfere with `yabv`, and stopped its own session `wryg`.
- No Odoo DOM was read and no desktop/mobile captures were produced.

Desktop/mobile comparison is therefore an explicit blocker, not a visual
parity result. The borrowed-tab cleanup for this worker is complete.
