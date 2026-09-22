# TIMEOFF-REQUEST-BULK-ACTIONS-001

Bounded feature: Odoo All Time Off selection-header Approve and Refuse actions.

## Source contract

- Source view: `/home/nhanjs/projects/odoo/addons/hr_holidays/views/hr_leave_views.xml` (`hr_leave_view_tree`)
- Source methods: `/home/nhanjs/projects/odoo/addons/hr_holidays/models/hr_leave.py` (`action_approve`, `action_refuse`)
- Core3 route: `/time-off-approval`
- Core3 page/API seam: `page.id: time-off-approval`
- Core3 implementation: `services/time_off/pages/time-off-approval.yaml`, `services/time_off/api/time-off-approval.yaml`
- Migration: none; existing durable request, balance, validation-type, and approval-audit tables are reused.

## Functional result

The All Time Off list is selectable and exposes manager-only `Approve` and
`Refuse` bulk actions. Approval validates the entire selection before changing
rows, applies balance only to final approvals, advances two-step requests to
Second Approval, records first/second approvers, and increments request row
versions. Refusal changes pending rows to Refused, records the manager, and
persists `Bulk refusal` as the refusal reason. Missing, non-pending, and
insufficient-balance selections return deterministic guards.

## Verification

- Focused command: `bun test ./test/time_off_request_bulk_actions.integration.test.ts --timeout 30000`
- Result: 3 tests, 14 assertions, 0 failures
- Covered: page/API ownership, permission boundary, ordinary approval, first
  approval, second approval, aggregate balance application, refusal, selection
  and state guards, and row-version persistence.

## BrowserSkill gate

- Browser instance: `245ea108`
- Session: `xlgl` (stopped)
- Existing authenticated tab: `1770662590`
- Borrow result: blocked because the tab was already borrowed by session `lfvs`.
- Task-created tab: `1770663776`, navigated to `http://localhost:8069/odoo/time-off-approval?db=core3_reference`; it showed the Discuss shell without a Time Off surface.
- No credentials, cookies, tokens, Odoo mutation, or Playwright session was used. No tab was retained.

Status: bounded functional implementation verified; authenticated Odoo visual
comparison remains blocked by shared-tab ownership and missing Time Off action
surface. No visual-parity claim or whole-module sign-off is made.
