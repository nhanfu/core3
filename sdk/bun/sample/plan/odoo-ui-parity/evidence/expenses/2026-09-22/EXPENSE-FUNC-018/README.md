# EXPENSE-FUNC-018 - receipt attachment lifecycle guards

This bounded slice follows Odoo `hr_expense/models/ir_attachment.py`: expense
receipts can be added or removed only while the expense is draft/submitted and
the actor has write access. Core3 now exposes a page-bound removal action,
durable attachment row versions, stale/company/state guards, receipt metadata
cleanup, and an auditable removal activity.

Evidence files:

- `source-comparison.md` — local Odoo source mapping.
- `gap-matrix.md` — bounded acceptance and residuals.
- `test-results.md` — focused and regression verification.

BrowserSkill tab borrowing was blocked because the shared authenticated Odoo
tab was already owned by session `slyk`. No independent login, Playwright, DOM
capture, or visual-parity claim was made. The worker session was stopped after
implementation.

Remaining gaps include Odoo's full attachment binary preview/storage behavior,
multi-attachment UI comparison, follower/chatter parity, and the broader
Expenses module sign-off.
