# Functionality checklist

| Check | Expected result | Status |
| --- | --- | --- |
| Open action | Department action navigates to `/employees/departments/children` with the selected row ID | covered by YAML and focused test |
| Recursive result | Management returns itself and all seeded descendants; Research & Development returns itself and its descendants | covered by focused test |
| Search | Non-matching search returns an empty result without an exception | covered by focused test |
| Empty state | Empty result is represented by the page empty state | page contract present; query returns empty |
| Active/archived | Active is the default and explicit archived filtering is available | page/API contract |
| Child detail | A result row navigates to existing department detail | API action contract |
| Permission | Page, datasource, and navigation require `employees.read` | contract inspection |
| Durable relation | `parent_id` survives migration replay and file-backed restart | covered by focused test |
| Stale writes | Not applicable: this feature is read-only | no write action present |
| Odoo/Core3 visual comparison | Authenticated desktop/mobile captures | blocked by shared-tab ownership; no visual claim |
