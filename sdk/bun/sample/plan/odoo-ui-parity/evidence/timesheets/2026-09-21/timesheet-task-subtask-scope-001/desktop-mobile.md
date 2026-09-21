# `TIMESHEET-TASK-SUBTASK-SCOPE-001`

## Core3 desktop/mobile evidence

Authenticated browser capture was blocked on 2026-09-21 because the bounded
Core3 probe could not connect to the backend:

```text
http://127.0.0.1:3001/api/modules
curl: (7) Failed to connect to 127.0.0.1 port 3001 after 0 ms: Could not connect to server
```

The task-timesheets route could not be authenticated or rendered at desktop or
mobile sizes. No screenshot or visual sign-off is claimed. The paired YAML
contract, exact/expanded scopes, durable hierarchy, and guards are covered by
the focused integration tests.

## Odoo desktop/mobile evidence

The configured Odoo endpoints were reachable only at the unauthenticated login
surface during the bounded probe:

```text
127.0.0.1:8069 -> HTTP 200 /web/login
127.0.0.1:8073 -> HTTP 200 /web/login
```

No authenticated task Timesheets desktop/mobile capture is claimed.
