# Functionality checklist

- [x] Page/API YAML separation through `page.id: project-task-detail`.
- [x] Stable child seed rows and idempotent migration replay.
- [x] Read collection with deterministic order, search, empty and 503 contract.
- [x] Add child with title, hours, active/company/parent-version guards.
- [x] Edit child with allowed state values and child row-version concurrency.
- [x] Delete child with company scope, concurrency and descendant guard.
- [x] Open child through the existing task-detail route.
- [x] Restart persistence assertion using file-backed DuckDB reopen.
- [ ] Authenticated Core3 task-detail browser CRUD; blocked by missing Timesheets service.
