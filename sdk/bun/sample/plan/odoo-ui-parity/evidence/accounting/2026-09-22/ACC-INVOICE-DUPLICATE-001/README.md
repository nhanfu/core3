# ACC-INVOICE-DUPLICATE-001

## Outcome

Implemented the bounded YAML-first invoice Duplicate action on the existing
`invoice-detail` page/API boundary.

## Scope

- Odoo source: `account.move.action_duplicate()` and `account.move.copy_data()`/
  `copy()`.
- Core3 action: `duplicate_accounting_invoice` / `accounting.invoices.duplicate`.
- Permission: `accounting.write`; invoice reads remain `accounting.read`.
- Persistence: deterministic duplicate invoice row and durable origin chatter.
- Lifecycle: new row is Draft with payment, review, lock, PDF, and source-link
  state reset; amount due is restored to the duplicated total.

## Evidence index

- `odoo-analysis.md` — local Odoo 19 source and authenticated reference state.
- `functionality-checklist.md` — stable-ID acceptance cases.
- `source-comparison.md` — Odoo/Core3 mapping and bounded classification.
- `gap-matrix.md` — implemented behavior and deliberate gaps.
- `test-results.md` — focused test and diff-check results.
- `verification.md` — BrowserSkill and runtime blocker evidence.

## Sign-off state

Functional contract: passed.

Visual/browser parity: not signed off. BrowserSkill confirmed the Odoo desktop
Actions menu, and the current UI audit passes, but no paired authenticated
Core3/Odoo desktop/mobile capture was taken for this bounded contract slice.
No visual-parity claim is made.
