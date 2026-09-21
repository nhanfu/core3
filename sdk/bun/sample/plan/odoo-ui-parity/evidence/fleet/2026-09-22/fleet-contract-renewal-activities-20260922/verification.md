# Verification

The focused integration test exercised the YAML API mutations against a
file-backed DuckDB database, scheduled a renewal activity, closed and reopened
the database, replayed all Fleet migrations, queried the persisted activity,
completed it, and rejected stale/invalid/unauthorized attempts without
changing the current row.

The Odoo browser pass used authenticated Chrome instance `245ea108` at
`http://localhost:8069/odoo?db=core3_reference`. The root page was Discuss and
the desktop app launcher listed other applications but no Fleet. The captured
desktop/mobile states are blocker evidence only; no Odoo Fleet interaction was
possible.

The isolated Core3 Fleet runtime started at `http://localhost:4322` and served
the route, but the fresh tab redirected to protected sign-in. The browser-skill
human-help login step did not complete before finalization, so no authenticated
Core3 screenshot or workflow claim is made. No credentials, cookies, tokens,
or passwords are stored.
