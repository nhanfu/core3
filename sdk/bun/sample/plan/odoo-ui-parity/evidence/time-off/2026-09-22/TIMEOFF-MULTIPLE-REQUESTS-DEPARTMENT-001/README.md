# TIMEOFF-MULTIPLE-REQUESTS-DEPARTMENT-001

Bounded feature: generate time off for every active employee in a selected department.

## Source contract

- Odoo model: `hr.leave.generate.multi.wizard`
- Odoo source: `/home/nhanjs/projects/odoo/addons/hr_holidays/wizard/hr_leave_generate_multi_wizard.py`
- Odoo view/action: `/home/nhanjs/projects/odoo/addons/hr_holidays/wizard/hr_leave_generate_multi_wizard_views.xml`
- Source behavior: `allocation_mode = 'department'` resolves `department_id.member_ids`, validates the selected date range, creates one leave request per employee, and opens the generated request list.
- Core3 route: `/time-off-approval`
- Core3 page/API seam: `page.id: time-off-approval`
- Core3 implementation: `services/time_off/pages/time-off-approval.yaml`, `services/time_off/api/time-off-approval.yaml`
- Migration: `services/time_off/migrations/20260922210000-027-multiple-request-department-mode.yaml`

Core3 exposes an explicit `New Department Time Off` form on the same All Time Off surface. This is the bounded equivalent of Odoo's Department mode and avoids sending a conditionally omitted employee multi-select through the shared SQL binder. It uses the same Odoo-shaped type/date/description fields, a manager-only department lookup, stable `LEAVE/GROUP/<date>/<employee-id>` names, and the existing request lifecycle.

## Verification

- Focused command: `bun test ./test/time_off_multiple_requests.integration.test.ts ./test/time_off_multiple_requests_department.integration.test.ts --timeout 30000`
- Result: 5 tests, 39 assertions, 0 failures
- Covered: page/API ownership, department lookup counts, migration replay, deterministic per-employee generation, active-department validation, date validation, and overlap protection.
- Existing employee-mode regression remains green in the same focused run.

## BrowserSkill Odoo gate

- Browser instance: `245ea108`
- Required tab: `1770662590`, `http://localhost:8069/odoo/contacts/9`
- Session created for this feature: `chhk`
- One explicit borrow attempt was made with a short confirmation window.
- Result: denied immediately because the tab was already borrowed or being borrowed by session `slyk`.
- No Odoo navigation, mutation, screenshot, credential access, independent login, or Playwright session was used.
- Session `chhk` was stopped; no tab was borrowed or retained.

Status: bounded functional implementation verified; Odoo desktop/mobile visual comparison remains blocked by shared-tab ownership. No visual-parity claim or whole-module sign-off is made.

## Remaining gaps

- Odoo's single wizard still exposes Company and Employee Tag modes; this slice implements the documented Department mode only.
- Paired authenticated Odoo/Core3 desktop and mobile captures remain unavailable until the shared tab can be explicitly borrowed.
- Full Time Off parity, generated-request result navigation parity, and broader permission/persona coverage remain open.
