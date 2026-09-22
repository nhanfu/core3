# ACC-INVOICE-LOCK-001

## Outcome

Implemented the bounded YAML-first invoice Lock contract on the existing
`invoice-detail` page/API boundary.

## Scope

- Odoo source: `account.move.button_hash()` and the `Lock` form button.
- Core3 action: `lock_accounting_invoice` / `accounting.invoices.lock`.
- Permission: `accounting.write`; datasource remains `accounting.read`.
- Persistence: `locked`, `locked_at`, `locked_by`, `lock_enabled`, and
  `row_version` on `accounting_invoices`, plus a chatter event.
- Workflow effect: locked documents cannot be reset to Draft.

## Evidence index

- `odoo-analysis.md` — local Odoo 19 source and authenticated reference state.
- `functionality-checklist.md` — stable-ID acceptance cases.
- `source-comparison.md` — Odoo/Core3 mapping and bounded classification.
- `gap-matrix.md` — implemented behavior and deliberate gaps.
- `test-results.md` — focused test and audit results.
- `verification.md` — BrowserSkill and runtime blocker evidence.

## Sign-off state

Functional contract: passed.

Visual/browser parity: not signed off. The Core3 runner and global audit stop
before Accounting discovery on unrelated CRM YAML errors, and the reference
invoice's journal hash restriction is disabled.
