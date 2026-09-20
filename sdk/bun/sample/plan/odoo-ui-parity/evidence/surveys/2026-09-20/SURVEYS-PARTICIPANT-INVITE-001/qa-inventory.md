# SURVEYS-PARTICIPANT-INVITE-001 QA inventory

## Core3 authenticated evidence

| Actor/state | Evidence | Result |
| --- | --- | --- |
| Administrator, desktop 1440x1000, New participant send | `core3-admin-desktop-before.png`, `core3-admin-desktop-after.png` | Invitation Sent; count 1; sent-at `2026-01-15 09:10:00` |
| Administrator, mobile 390x844, In Progress participant resend | `core3-admin-mobile-before.png`, `core3-admin-mobile-after.png` | Invitation Sent; count 2; sent-at `2026-01-15 09:15:00` |
| Fleet Manager, mobile 390x844 | `core3-fleet-denied-mobile.png` | 403, `Requires permission: surveys.read`, no Survey disclosure |
| Anonymous, mobile 390x844 | `core3-anonymous-mobile.png` | Redirected to `/auth/login?redirect=%2Fsurveys%2Fparticipants` |

The Core3 desktop and mobile probes recorded zero page errors, failed
requests, HTTP errors, or horizontal overflow. The isolated runtime used for
the browser probe loaded only the auth/AI/chat/Surveys service set so an
unrelated shared Employees YAML failure could not contaminate the bounded
module evidence; no non-Surveys repository files were changed.

## Odoo authenticated comparison

| View | Evidence | Observation |
| --- | --- | --- |
| Participants desktop 1440x1000 | `odoo-participants-desktop.png` | Surveys installed; all visible participant groups/rows are Completed |
| Participants mobile 390x844 | `odoo-participants-mobile.png` | Responsive kanban/list also contains only Completed cards |

The live reference therefore has no New/In Progress participant fixture for a
paired resend mutation. This is a precise fixture-availability blocker, not an
uninstalled-addon claim. The earlier `odoo-desktop-before.png` and
`odoo-mobile-before.png` landing captures are retained as supplementary
installed-Surveys evidence.
