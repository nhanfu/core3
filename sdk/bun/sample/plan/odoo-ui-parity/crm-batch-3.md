# CRM parity batch 3: recurring plans configuration action

Status: `implemented`

This bounded wave closes the installed Odoo CRM configuration gap for
`crm.crm_recurring_plan_action` without changing the completed lead lifecycle,
activity/chatter, or general-settings work.

## Reference contract

The active Odoo database is `core3_codex_demo_20260912`, CRM is installed with
official demo data, and the authenticated admin is `codex@core3.local`. Odoo
action 379 (`crm_recurring_plan_action`) is a list-only action under CRM >
Configuration > Recurring Plans. Its list has the editable `Plan Name` and
`# Months` columns, a sequence handle, an `Archived` search facet, and four
demo rows: Monthly (1), Yearly (12), Over 3 years (36), and Over 5 years (60).

## Core3 contract

| Odoo action/menu | Core3 page/route | API fragment/datasource |
| --- | --- | --- |
| `crm.crm_recurring_plan_action` / Recurring Plans | `crm-recurring-plans` / `/recurring-plans` | `api/recurring-plans.yaml` / `crm_recurring_plans` |

The page is layout-only and joins its page.id-bound API fragment through
discovery. The CRM-local migration `20260910170000-019-recurring-plans.yaml`
seeds stable rows and timestamps from 2026-01-15. Manager-only CRUD includes
inline create/edit, bulk archive/restore/delete, duplicate and invalid-month
validation, stale-row protection, empty/no-result, and transport-error states.

## Implementation and evidence (2026-09-12)

The page/API split, manager-only CRUD, AI action catalog entries, deterministic
fixtures, and concurrency/validation guards are implemented. Individual and
bulk archive operations use distinct named actions, and DuckDB bulk actions
use the repository's array binding contract (`id IN :ids`), so the
shared inline-edit table gives sequence handles a fixed 40px column so the
desktop and mobile geometry matches Odoo.

Authenticated browser comparison used Odoo action 379 and Core3 at 1440x900
and 390x844. Core3 had no page errors or failed requests, exact document/body
widths, and all four demo rows at both sizes. Odoo rendered the same rows and
columns with exact widths and no page errors; its mobile capture also recorded
three aborted transition/avatar requests after the valid content was rendered.
The intentional residual is the Core3 Fluent shell and search treatment versus
Odoo's purple shell; the list title, handle geometry, columns, rows, and
responsive behavior match.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Recurring Plans | 1440x900 | `/tmp/odoo-crm-recurring-plans-desktop-1440x900-20260912.png` | `379591f5776544dfcc71f1e772158a277b6b97e37e025c8cd9c1acdb847d4b5b` |
| Odoo Recurring Plans | 390x844 | `/tmp/odoo-crm-recurring-plans-mobile-390x844-20260912.png` | `95f7f084710bb03f6d66c3b27da7fe77ec01650a5ae2f8dbcf961fcd011a03eb` |
| Core3 Recurring Plans | 1440x900 | `/tmp/core3-crm-recurring-plans-desktop-1440x900-20260912.png` | `300f698b9a3bfa605c7ad40096d82c4598aad151fe76914489e9e97883c82043` |
| Core3 Recurring Plans | 390x844 | `/tmp/core3-crm-recurring-plans-mobile-390x844-20260912.png` | `a37202091f36344a642530715743bb198e970e4a8125bdc614cd703999bf4031` |

Focused CRM validation passes 41 tests and 195 assertions across the CRM test
files; the recurring-plan slice itself passes 3 tests and 26 assertions. The
isolated worktree audit passes with 399 pages, 405 routes, and 699 datasources;
`git diff --check` passes. Images remain outside Git.
