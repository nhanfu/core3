# Permission results

- Datasources declare `manufacturing.read`.
- Workflow actions declare `manufacturing.write`.
- Existing `mrp_workorders` CAS/state guards are reused.
- Create and delete are intentionally absent because the Odoo action has no
  create/delete controls.
- The focused test asserts the 401, 403, and 503 datasource envelopes.
