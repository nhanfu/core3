# MAINT-REQUEST-CHATTER-NOTE-001

Bounded feature: log an internal note from an Odoo Maintenance Request detail
form.

This is one missing slice of `MAINT-WF-005`. Core3 previously rendered the
request activity stream but had no durable request Chatter message source or
`Log note` composer. This batch does not add Send message, followers,
attachments, or a second request CRUD/stat action.

## Evidence

The Odoo source action was inspected through BrowserSkill on shared browser
instance `245ea108`, using the existing authenticated Odoo browser session. The
task-created BrowserSkill tab rendered the live `core3_reference` Maintenance
request action at `/odoo/maintenance-requests` and the request detail for
“Some keys are not working”.

| State | Capture | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| Request detail | `odoo-request-detail-1440x900.png` | 1440x900 | `46e4d60d67978209f57e58499d31368e328a062dff1f019c769c72aaba59bef0` |
| Log note composer | `odoo-log-note-composer-1440x900.png` | 1440x900 | `4ef6a401a7d4c90b42d6416492825f41d88803efd421775ba562393b93ec9a22` |
| Log note composer | `odoo-log-note-composer-390x844.png` | 390x844 | `2dd816c694353fee96647fa15cdfdc94974bc196d443164c2ae8c3fc98579431` |

The earlier dashboard/list/detail captures in this folder are supporting live
route evidence; the three captures above are the feature comparison states.

## Comparison boundary

The existing signed-in user tab (`1770662590`) could not be borrowed: its
mandatory borrow confirmation remained pending and the borrow command timed out
after the configured wait. No credentials were printed or used, and no
independent login or Playwright session was substituted. The live action was
still visibly available in the BrowserSkill task tab with the shared session,
but this ownership limitation means this batch makes no paired Core3/Odoo
visual-parity claim.

BrowserSkill cleanup completed: mobile emulation was cleared and session `eryp`
was stopped. No user tab was left borrowed.
