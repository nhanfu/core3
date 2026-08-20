Understood. The target is user-visible Odoo behavior, not cloning Odoo’s internal ORM or every addon implementation.

The revised strategy is:

- Keep Core3 YAML as the source of truth.
- Add only reusable runtime primitives required by multiple user-facing modules.
- Implement one module as a complete vertical slice.
- Include its menus, pages, fields, actions, workflows, permissions, search/reporting, and visible base/demo data.
- Remove synthetic Core3 seed data only after that module reaches parity.

## User-visible parity definition

Each module is complete only when it has:

1. Odoo-equivalent menus and navigation
2. List, form, kanban, calendar, graph, pivot, or other user-visible views where applicable
3. Search, filters, grouping, sorting, pagination, and favorites where applicable
4. Create, edit, archive, delete, duplicate, import, export, and bulk actions where applicable
5. Status transitions and validation rules
6. Relational fields and inline child records
7. Permissions and user-visible access restrictions
8. Reports, dashboards, activities, chatter, notifications, or portal behavior where applicable
9. Odoo-equivalent base/reference data
10. Odoo demo data visible in the module
11. Browser and API verification
12. Clean install, restart, and upgrade verification

Odoo internals that users do not directly observe are out of scope unless they are required to make one of these behaviors work.

## Phase 0 — Shared user-facing foundation

This is not an Odoo module clone. It is the reusable Core3 infrastructure needed by all modules.

Improve only as required:

- Generic model-backed forms
- Relational field editors
- Many-to-one selectors
- One-to-many child grids
- Many-to-many selectors
- Generic search domains
- Grouping and aggregation
- Kanban/calendar/pivot/graph rendering
- Attachments
- Activities and chatter
- Import/export
- Notifications
- Generic access and record filtering
- YAML-defined sequences and reference data
- Odoo-style action/menu/view metadata

All routes, menus, actions, permissions, datasource metadata, workflows, and seed declarations remain YAML-derived.

## Phase 1 — Base, users, companies, and contacts

Implementation note: Base detail pages must use the same Odoo FormView interaction as
Orders: direct module-aware routes, an inline Edit action, editable fields, Save and
Discard controls, optimistic-concurrency saves, and declarative YAML mutations. A
detail route must never fall back to the Order module when opened without a module
prefix (for example `/contact-detail?id=...` resolves to `/base/contact-detail`).

Cross-module list/grid UI requirement: every list or grid feature must expose a
tab-based view switcher using `view_navigation: tabs`, with at minimum ListView and
CardView definitions. Each feature must also provide an inline FormView definition
and allow the user to toggle between the collection view and the FormView through
an icon control, following the Orders page contract in
`sample/services/order/pages/orders.yaml` (`views`, `view_navigation`, and
`form_view`). The FormView must use the same edit, Save, and Discard interaction
when the feature supports editing; placeholders or view tabs without data-backed
renderers do not satisfy this requirement.

Odoo scope:

- `base`
- `contacts`
- User/company/profile functionality

User-facing features:

- Users
- Companies
- Contacts
- Addresses
- Contact categories
- User groups and permissions
- Company switching
- Languages, currencies, countries
- Contact search and duplicate handling
- Basic activity and communication history

Seed data:

- Administrator/demo users
- Demo company
- Countries and states
- Currencies
- Contact categories
- Odoo-equivalent base reference records required by later modules

Exit gate: all later modules can use shared users, companies, contacts, currencies, and permissions.

## Phase 2 — Discuss, mail, activities, and attachments

Odoo scope:

- `mail`
- `bus`
- `portal` where required for user-visible access

User-facing features:

- Chatter
- Messages and notes
- Followers
- Activities
- Mentions
- Attachments
- Notifications
- Scheduled activities
- Record communication history

This phase should provide shared components consumed by CRM, Sales, Events, Projects, Helpdesk, and other modules.

## Phase 3 — CRM

Odoo scope:

- `crm`
- `utm`
- CRM-related contact and mail extensions

User-facing features:

- Leads
- Opportunities
- Pipeline stages
- Kanban pipeline
- Lead conversion
- Activities
- Expected revenue and probability
- Teams and salespersons
- Lost reasons
- Forecast and pipeline reporting
- Lead/opportunity search, filters, grouping, and favorites

Replace the current simplified CRM service with Odoo-derived user-visible fields, stages, actions, menus, and demo records.

## Phase 4 — Sales

Odoo scope:

- `sale`
- `product`
- `sale_management`
- Relevant `delivery` and `portal` behavior

User-facing features:

- Quotations
- Sales orders
- Customers
- Products and variants
- Pricelists
- Order lines
- Taxes and discounts
- Confirmation, quotation, cancellation, and locking
- Delivery status
- Customer portal order visibility
- Sales reporting

This phase should supersede or absorb the current `order` service where the current behavior diverges from Odoo.

## Phase 5 — Purchase

Odoo scope:

- `purchase`
- Vendor/product integrations

User-facing features:

- Vendors
- Requests for quotation
- Purchase orders
- Purchase order lines
- Vendor prices
- Confirm, cancel, lock, and receipt status
- Purchase analysis
- Vendor bills linkage where applicable

Seed data should include Odoo-visible vendors, products, purchase orders, and reference configuration.

## Phase 6 — Inventory

Odoo scope:

- `stock`
- `barcodes`
- `delivery`
- Inventory-related product and purchase integrations

User-facing features:

- Warehouses and locations
- Products and stock quantities
- Receipts
- Deliveries
- Internal transfers
- Stock moves
- Pickings
- Lots and serial numbers
- Inventory adjustments
- Barcode-facing workflows where supported
- Inventory reporting

This will require generic relational child records, state transitions, and reservation/quantity handling in YAML-backed actions.

## Phase 7 — Manufacturing

Odoo scope:

- `mrp`
- `mrp_workorder`
- `quality`
- `maintenance` integration where applicable

User-facing features:

- Bills of materials
- Manufacturing orders
- Work orders
- Components
- Operations
- Produce, consume, confirm, cancel, and close
- Manufacturing analysis
- Work-center views
- Quality checks where connected

The existing Core3 `manufacturing` service should be treated as a prototype and replaced module-by-module with Odoo-visible behavior and data.

## Phase 8 — Accounting

Odoo scope:

- `account`
- `account_payment`
- `account_tax`
- `analytic`
- Relevant invoice and payment modules

User-facing features:

- Customers and vendors
- Invoices and bills
- Invoice lines
- Taxes
- Journals
- Payments
- Posting and cancellation
- Credit notes
- Reconciliation-facing workflows
- Accounting reports
- Analytic accounts and tags

Accounting should be split into sub-slices if necessary:

1. Chart of accounts and journals
2. Customers/vendors and invoices
3. Payments
4. Taxes and fiscal positions
5. Reports and analytics

## Phase 9 — Events

This should be the first complete parity slice because the current Core3 Events service already exists but is substantially simplified.

Odoo scope:

- `event`
- `event_sale`
- `event_product`
- `event_crm`
- `event_booth`
- Required `mail`, `portal`, `utm`, and contact behavior

User-facing features:

- Events
- Event types
- Event stages
- Event tags
- Tickets
- Ticket limits and pricing
- Registrations
- Registration questions and answers
- Event slots
- Attendee management
- Event list, form, kanban, calendar, and search views
- Registration actions
- Publish/start/complete/cancel behavior
- Activities and chatter
- Event reporting
- Portal registration behavior where applicable

Seed replacement:

- Remove the synthetic `event-demo-001`
- Import Odoo-visible event stages
- Import event types, tags, questions, tickets, events, registrations, answers, users, partners, and activities
- Preserve Odoo’s relative date behavior
- Support demo-data enabled and disabled modes
- Verify the visible dataset against Odoo’s event demo XML

The current `events` tables and workflow should be treated as temporary implementation data, not the final contract.

## Phase 10 — Employees and HR

Odoo scope:

- `hr`
- `hr_attendance`
- `hr_expense`
- `hr_holidays`
- `hr_recruitment`
- `hr_appraisal`
- `hr_fleet`

User-facing modules:

- Employees
- Departments and jobs
- Attendance
- Time off
- Expenses
- Recruitment
- Appraisals
- Fleet

These should remain separate phases internally, even if they share employee and company foundations.

## Phase 11 — Projects and timesheets

Odoo scope:

- `project`
- `hr_timesheet`
- `planning`
- Relevant task, activity, and analytic behavior

User-facing features:

- Projects
- Stages
- Tasks
- Milestones
- Kanban
- Task dependencies
- Timesheets
- Project billing/analytic linkage
- Activities
- Project reporting

This maps to the current `project` and `timesheets` services but requires Odoo-compatible task, stage, and timesheet behavior.

## Phase 12 — Helpdesk and Field Service

Odoo scope:

- `helpdesk`
- `industry_fsm`
- Relevant planning, timesheet, sale, and mail integrations

User-facing features:

- Helpdesk teams
- Tickets
- Ticket stages
- SLA behavior
- Assignment
- Activities
- Field-service tasks
- Planning and technician assignment
- Timesheets and customer/project linkage

## Per-module execution template

Every module phase should follow the same sequence:

1. Inventory Odoo user-visible features.
2. Map them to the existing Core3 YAML model.
3. Identify missing shared primitives.
4. Extend the generic runtime only where reusable.
5. Write the module manifest, permissions, pages, views, actions, workflows, and data in YAML.
6. Import Odoo base/reference data.
7. Import Odoo demo data.
8. Remove the module’s synthetic Core3 seed data.
9. Verify browser behavior.
10. Verify API behavior.
11. Verify permission boundaries.
12. Verify clean install, restart, and upgrade.
13. Mark the module complete in the parity ledger.

## Seed-data rule

Seed data is included when it is visible to users or required to make a visible feature behave correctly.

We do not need to reproduce:

- Odoo’s internal ORM metadata tables
- Unused backend-only records
- Private implementation details
- Addons not included in the selected module phase
- Internal records that have no user-visible effect

We do need to reproduce:

- Menus and actions
- Reference configuration
- Default stages and types
- Visible demo users, companies, contacts, and business records
- Data shown in lists, forms, dashboards, reports, and portals
- Records required for workflows and permissions

This gives us a practical module-by-module Odoo clone while preserving Core3’s YAML-first architecture. I would start with the Events vertical slice, then use the resulting generic primitives as the template for the remaining modules.
