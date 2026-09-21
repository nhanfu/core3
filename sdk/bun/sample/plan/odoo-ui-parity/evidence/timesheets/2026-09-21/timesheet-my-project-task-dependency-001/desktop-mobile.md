# `TIMESHEET-MY-PROJECT-TASK-DEPENDENCY-001`

## Core3 authenticated desktop/mobile evidence

Blocked at runtime on 2026-09-21. A direct readiness probe to
`http://127.0.0.1:3001/timesheets` failed with:

```text
curl: (7) Failed to connect to 127.0.0.1 port 3001 after 0 ms: Could not connect to server
```

Because the Core3 server was not listening, authenticated desktop and mobile
browser captures were not claimed. The source and API contract, durable
mutation guards, and restart behavior are covered by the focused integration
suite instead.
