# Odoo 19 UI parity — module register

## Scope

Clone the Odoo 19 Community UI in Core3, module by module and menu by menu.
This is UI-only work: pages use deterministic YAML fixture data until backend work
is explicitly planned. A module may not enter implementation until its linked
sub-plan is approved and marked `ready`.

Website Builder, Forum, Blog, eCommerce, and other composition-oriented modules
remain YAML-driven are on-hold for an appropreate architecture.
frontend code is not copied.

## Live Odoo reference environment

- URL: `http://localhost:8069`
- Login email: `admin@core3.local`
- Login password: `Core3Odoo2026!`
- Docker Compose file: `/home/nhanjs/projects/odoo-core3-demo/docker-compose.yml`
- Restore/start command: `docker compose -f /home/nhanjs/projects/odoo-core3-demo/docker-compose.yml up -d`
- Stop command: `docker compose -f /home/nhanjs/projects/odoo-core3-demo/docker-compose.yml down`

The Compose project contains the Odoo 19 container, PostgreSQL service, and
demo database used for UI comparison. Keep credentials out of source code
outside this local parity plan.

## Module register

| Core3 service | Odoo reference addon | Source status | Sub-plan | Status |
| --- | --- | --- | --- | --- |
| base | contacts, base | available | `odoo-ui-parity/base-contacts.md` | ready |
| chat | mail | available | `odoo-ui-parity/chat.md` | ready |
| crm | crm | available | `odoo-ui-parity/crm.md` | ready |
| order | sale_management | available | `odoo-ui-parity/sales.md` | ready |
| point-of-sale | point_of_sale | available | `odoo-ui-parity/point-of-sale.md` | in-progress |
| sale-subscription | sale_subscription | unavailable in supplied source | `odoo-ui-parity/subscriptions.md` | planned |
| sale-renting | sale_renting | unavailable in supplied source | `odoo-ui-parity/rental.md` | planned |
| accounting | account | available | `odoo-ui-parity/accounting.md` | in-progress |
| expenses | hr_expense | available | `odoo-ui-parity/expenses.md` | ready |
| documents | documents | unavailable in supplied source | `odoo-ui-parity/documents.md` | planned |
| approvals | approvals | unavailable in supplied source | `odoo-ui-parity/approvals.md` | planned |
| spreadsheet | spreadsheet | available | `odoo-ui-parity/spreadsheet.md` | ready |
| inventory | stock | available | `odoo-ui-parity/inventory.md` | ready |
| manufacturing | mrp | available | `odoo-ui-parity/manufacturing.md` | planned |
| purchase | purchase | available | `odoo-ui-parity/purchase.md` | ready |
| maintenance | maintenance | available | `odoo-ui-parity/maintenance.md` | ready |
| field-service | industry_fsm | unavailable in supplied source | `odoo-ui-parity/field-service.md` | planned |
| helpdesk | helpdesk | unavailable in supplied source | `odoo-ui-parity/helpdesk.md` | planned |
| quality | quality | unavailable in supplied source | `odoo-ui-parity/quality.md` | planned |
| plm | mrp_plm | unavailable in supplied source | `odoo-ui-parity/plm.md` | planned |
| employees | hr | available | `odoo-ui-parity/employees.md` | ready |
| recruitment | hr_recruitment | available | `odoo-ui-parity/recruitment.md` | ready |
| time-off | hr_holidays | available | `odoo-ui-parity/time-off.md` | planned |
| appraisals | hr_appraisal | unavailable in supplied source | `odoo-ui-parity/appraisals.md` | planned |
| referrals | hr_referral | unavailable in supplied source | `odoo-ui-parity/referrals.md` | planned |
| fleet | fleet | available | `odoo-ui-parity/fleet.md` | ready |
| email-marketing | mass_mailing | available | `odoo-ui-parity/email-marketing.md` | planned |
| sms-marketing | mass_mailing_sms | available | `odoo-ui-parity/sms-marketing.md` | planned |
| events | event | available | `odoo-ui-parity/events.md` | planned |
| surveys | survey | available | `odoo-ui-parity/surveys.md` | planned |
| marketing-automation | marketing_automation | unavailable in supplied source | `odoo-ui-parity/marketing-automation.md` | planned |
| project | project | available | `odoo-ui-parity/project.md` | ready |
| timesheets | hr_timesheet | available | `odoo-ui-parity/timesheets.md` | ready |
| website | website | available; YAML-driven | `odoo-ui-parity/website.md` | on-hold |
| ecommerce | website_sale | available; YAML-driven | `odoo-ui-parity/ecommerce.md` | on-hold |
| blog | website_blog | available; YAML-driven | `odoo-ui-parity/blog.md` | on-hold |
| forum | website_forum | available; YAML-driven | `odoo-ui-parity/forum.md` | on-hold |
| livechat | im_livechat | available | `odoo-ui-parity/livechat.md` | planned |

`auth` and `ai` are Core3 infrastructure, not Odoo-clone modules, and are outside
this register.

## Required gate for every sub-plan

1. Record the Odoo addon/version and whether its manifest provides official demo
   data.
2. Enumerate every visible menu, action, and view state.
3. Identify Odoo screenshots/routes at desktop and mobile viewports.
4. Declare Core3 YAML mock data in the screen's backend datasource definition for
   every list, form, kanban, calendar, chart, report, pivot, dashboard, and empty
   state shown by the module. Page-layout YAML remains data-source-only, so its
   backend mock provider can later be replaced by a query without changing UI YAML.
5. Identify shared UI primitives required by the module; do not implement new
   primitives before recording them here.
6. Define visual and fixture-data acceptance checks.

Only after all six are written does implementation begin.

The shared mock-data contract is defined in
`odoo-ui-parity/screen-mock-data.md` and applies to every module sub-plan.
