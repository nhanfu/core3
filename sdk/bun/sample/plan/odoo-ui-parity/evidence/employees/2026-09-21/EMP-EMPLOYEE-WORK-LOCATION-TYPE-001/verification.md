# EMP-EMPLOYEE-WORK-LOCATION-TYPE-001 evidence

The source contract is Odoo `hr.employee.work_location_type`, computed from
the linked `hr.work.location.location_type` (`home`, `office`, or `other`).
Core3 keeps the API and page YAML contracts separate and joins them with
`page.id: employee-detail`; the existing Work Location assignment also keeps
the persisted type synchronized.

The focused integration test covers source mapping, durable read/refresh,
actor/company/missing/stale guards, migration replay, and file-backed restart.
Authenticated Core3 desktop/mobile probes reached `/employees/detail` after
the demo login; the Work Location Type field rendered and all observed API
requests returned 200, but the seeded employee was hidden by the authenticated
Demo Company context. Odoo desktop/mobile comparison is blocked by the local
`admin/admin` login being rejected; the login-page captures are retained here.
No aggregate Employees sign-off is claimed.
