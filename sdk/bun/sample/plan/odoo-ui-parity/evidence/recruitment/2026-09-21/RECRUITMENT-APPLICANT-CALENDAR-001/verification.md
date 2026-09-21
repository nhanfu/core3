# Recruitment applicant Calendar — verification

Date: 2026-09-21

## Automated checks

- `bun test test/recruitment_applicant_calendar.integration.test.ts` — 3
  passed, 0 failed, 18 assertions.
- `bun test test/recruitment_applicant_calendar.integration.test.ts test/recruitment_applicant_activities.integration.test.ts` — 5 passed, 0 failed.
- `bun run audit` — passed: 769 pages, 778 routes, 1572 datasources.
- `bunx eslint test/recruitment_applicant_calendar.integration.test.ts test/recruitment_applicant_activities.integration.test.ts` — passed.
- `git diff --check` — passed for owned Recruitment paths.

The broader `recruitment.integration.test.ts` discovery assertions remain
blocked by an unrelated pre-existing Time Off page-schema error:
`components[0].attachment_remove_action is not allowed` plus unknown
`upload_leave_request_attachment` and `download_leave_request_attachment`
actions in `services/time_off`. No non-Recruitment file was changed to bypass
that blocker.

## Browser evidence

An own BSK session (`xjpx`) was started on browser instance `245ea108`, used
with the authenticated shared profile, and stopped cleanly after capture. No
credentials, cookies, tokens, or passwords were read or printed.

Core3 could not stay online for authenticated capture. The required startup
command `bun run dev --db=ddb --memory` reached Vite on port 3002, then the
backend exited during page discovery with the same unrelated Time Off schema
error recorded above. BSK therefore observed `ERR_CONNECTION_REFUSED` at
`http://127.0.0.1:3002/applicants`.

The Odoo session was authenticated, but its live launcher showed Discuss,
Calendar, To-do, Contacts, CRM, Sales, Dashboards, Point of Sale, Invoicing,
Project, Timesheets, Events, Surveys, Purchase, Inventory, Maintenance,
Employees, Expenses, and Apps; it did not show a Recruitment root. The
authenticated direct navigation to
`http://localhost:8069/odoo/recruitment-applications` returned the Odoo shell
instead of the Recruitment action. Odoo Calendar comparison is therefore
blocked, and this record makes no visual-parity claim.

Blocker screenshots were captured at the requested target sizes and remain
outside Git under `/tmp/core3-odoo-parity/recruitment-calendar-2026-09-21/`:

| Surface | Viewport | File | SHA-256 |
| --- | --- | --- | --- |
| Core3 refused runtime | 1440×900 | `core3-runtime-blocked-desktop-1440x900.png` | `f3d08d7df86a3ee4c809be191ee8dd469860ab31473222916f5d6e25808d618b` |
| Core3 refused runtime | 390×844 | `core3-runtime-blocked-mobile-390x844.png` | `7f1322ece102e27985aadbcfa733476d2e19fb76ec2d5b4599e4719a949304ce` |
| Odoo authenticated shell | 1440×900 | `odoo-reference-shell-desktop-1440x900.png` | `80d19fc750cf60c5009c8894181fb12da634b7f7d372ed71f3330d3ac0a648f7` |
| Odoo authenticated shell | 390×844 | `odoo-reference-shell-mobile-390x844.png` | `bce905e5d3107d26c7b188f93c9932a3e10d3974ff8e4fdab19a206dd3ddacd1` |

These are blocker evidence only, not parity evidence.
