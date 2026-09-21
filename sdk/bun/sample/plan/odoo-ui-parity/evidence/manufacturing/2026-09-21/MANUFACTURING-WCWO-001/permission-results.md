# Permission results

- List datasource: `manufacturing.read`.
- Error states explicitly declared: 401 unauthorized, 403 forbidden, and 503
  transport failure.
- Six server workflow actions: `manufacturing.write` and workflow
  `mrp_workorders`.
- No create or delete action is exposed, matching the source create-disabled
  Work Order list.
- Existing workflow guards remain authoritative for invalid state and stale
  row-version handling; this slice does not bypass them.
