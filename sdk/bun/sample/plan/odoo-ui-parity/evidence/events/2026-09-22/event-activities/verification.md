# Verification

## Reference

Using browser instance `245ea108` and the existing authenticated QA session,
the Odoo route was opened through the Events menu on `Design Fair Los Angeles`.
The Schedule Activity dialog was captured at desktop 1916x833 and mobile
390x844, including type choices, summary, due date, assignee, and footer
actions. The Odoo session was stopped after capture.

## Core3

The module-scoped runner was started on port 4025 and the authenticated route
`/events/event-detail?id=event-demo-001` was exercised. The seeded planned
activity was visible; Schedule activity was opened, `Review event logistics`
was saved, and its Mark Done action produced the completed activity message.
The route was reopened to verify the persisted state. Under `iphone-14`
emulation, bsk observe/evaluate reported a 390x844 CSS viewport and
`scrollWidth=390`, so the mobile layout had no horizontal overflow.

No Core3 mobile screenshot is claimed: bsk's screenshot response/files remained
1916x833 during the 390px emulation. This is a tooling capture blocker, not a
claim of screenshot parity.

## Runtime blocker

The shared `bun run dev --db=ddb --memory` startup reached its Vite/mediator
startup messages but the backend did not open port 3001 in the bounded wait;
the initial Vite request returned 502 with `ECONNREFUSED 127.0.0.1:3001`.
The module runner supplied a working bounded verification environment and was
stopped after the flow. Full Events sign-off remains open.
