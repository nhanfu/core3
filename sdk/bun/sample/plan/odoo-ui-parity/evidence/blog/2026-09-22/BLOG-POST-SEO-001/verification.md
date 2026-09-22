# Verification

The focused integration slice exercises the real YAML mutation and datasource
contracts against DuckDB. It proves:

- deterministic demo metadata and page/API separation;
- valid save, blank-to-NULL clear, and computed optimization state;
- 422 unsafe/oversized validation with no partial write;
- 403 reader and wrong-company rejection;
- 409 stale-row rejection with unchanged current data; and
- file-backed close/reopen persistence after idempotent migration replay.

The full Blog wildcard and shared UI audit also passed. No authenticated visual
parity is asserted because the Odoo reference lacks Website/Blog and Core3
authentication was not completed in BrowserSkill.
