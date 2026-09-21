# Source comparison

| Odoo behavior | Core3 before | Core3 after |
| --- | --- | --- |
| Active-by-default analysis action | No default report filter | `default_filters: { active: active }` and active/Cancelled filter |
| Graph dimensions and measures | Generic state graph measured `id` | State by Responsible series with Duration, Repeat Every, and Count measures |
| Pivot source fields | No datasource pivot declaration and no source-aligned fields | Responsible, Stage, Duration, Repeat Every, and Count fields with deterministic Count default |
| Duration | Constant `0` in the report query | One persisted-report hour for scheduled requests, zero for unscheduled requests, matching Odoo’s one-hour scheduled-end default |
| Empty/error/permission boundary | Empty state only at state chart level | Empty fixture, read permission, and existing transport-error contract remain service-owned |
| Restart | Existing request table persistence | Restart test proves identical report rows after migration replay |

The report remains read-only; no workflow mutation is applicable to this
feature. Request workflow guards and durable request state remain owned by the
existing Maintenance request contracts.
