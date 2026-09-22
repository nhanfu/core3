# Functionality checklist

- [x] Manager-only Configuration > Projects menu and route.
- [x] Page/API separation joined by `project-configuration`.
- [x] Sequence-ordered durable project rows; templates excluded.
- [x] List, Kanban, and Form tabs with responsive card fallback contract.
- [x] Search, active/archived, status, stage, empty, and transport-error states.
- [x] Create and edit with required-name, duplicate-name, and non-negative-hour guards.
- [x] Archive and restore with row-version checks.
- [x] Delete with missing, stale, and task/milestone dependency guards.
- [x] Migration replay and restart-equivalent persistence assertions.
- [ ] Authenticated Odoo/Core3 desktop capture at 1440x900.
- [ ] Authenticated Odoo/Core3 mobile capture at 390x844.
- [ ] Browser actor/permission and request-error probes.

The unchecked browser items are blocked by the already-borrowed authenticated
tab and are not represented as passes.
