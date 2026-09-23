# Functionality checklist

| Case | Class | Expected | Result |
| --- | --- | --- | --- |
| CONSENT-F-001 | functional | GET returns the Website-scoped banner contract and exact labels | pass |
| CONSENT-F-002 | workflow | `all` writes optional `true`; `essential` writes optional `false` | pass |
| CONSENT-F-003 | data | The cookie JSON replays on a subsequent GET and has a 999-day lifetime | pass |
| CONSENT-F-004 | security | Malformed cookie is not trusted and receives expiry | pass |
| CONSENT-F-005 | validation | Missing/invalid choice, unknown Website, disabled bar, and unsupported method return bounded errors | pass |
| CONSENT-P-001 | permission | Public consent route is anonymous like Odoo's public frontend; admin Website settings remain separately permissioned | pass for declared boundary |
| CONSENT-UI-001 | visual/responsive | Authenticated Odoo/Core3 desktop and mobile banner comparison | blocked before borrow; no visual claim |
| CONSENT-UI-002 | functional | Public banner DOM actions and optional iframe warning/release | open; existing public Website renderer has no consumer of the new contract |
