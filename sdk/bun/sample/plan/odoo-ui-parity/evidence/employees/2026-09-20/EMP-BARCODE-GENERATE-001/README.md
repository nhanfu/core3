# EMP-BARCODE-GENERATE-001

Bounded Employees slice: Odoo employee Settings badge-ID generation.

Odoo source exposes `generate_random_barcode` beside the employee Badge ID
field, only while the field is empty. Core3 implements the same page/API
binding with an `employees.write` action, authenticated actor guard,
current-company and active-employee scope, optimistic row-version checking,
alphanumeric length validation, and durable employee persistence.

The focused integration test is `test/employees_barcode_generate.integration.test.ts`.
It covers source mapping, page/API separation, deterministic generation,
permission contract, actor/company/active/stale/retry guards, migration replay,
unique-index enforcement, and file-backed restart persistence.

Authenticated browser evidence was captured at desktop (1440x900) and mobile
(390x844) for both Core3 and Odoo. Odoo Settings renders the source-backed
Generate control in both viewports. Core3 authentication succeeds, but the
selected session company is `Core3 Demo Company` while the deterministic
employee fixture is `Core3 Vietnam`; the requested employee detail therefore
renders as an empty record and the Core3 action cannot be exercised in that
runtime. This is recorded as an exact blocker, not a UI pass.

Artifacts:

- `source-comparison.md` — Odoo/Core3 contract comparison.
- `core3-blocker.json` — authenticated Core3 company/fixture mismatch.
- `odoo-desktop-evidence.json`, `odoo-mobile-evidence.json` — authenticated
  Odoo Settings observations.
- `core3-desktop-settings.png`, `core3-mobile-settings.png` — exact blocker
  captures.
- `odoo-desktop-settings.png`, `odoo-mobile-settings.png` — paired Odoo
  Settings captures.
