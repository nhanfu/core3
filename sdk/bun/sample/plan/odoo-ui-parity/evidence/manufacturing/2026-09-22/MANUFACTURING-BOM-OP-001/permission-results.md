# Permission results

- Report and filter datasources: `manufacturing.read`.
- Record-scoped navigation action: `manufacturing.read`.
- No create, update, delete, archive, or workflow action is exposed.
- Datasources explicitly declare 401 unauthorized, 403 forbidden, and 503
  transport-error envelopes.
- This is contract-level permission evidence; no authenticated Core3 actor
  browser session was supplied for this module task.
