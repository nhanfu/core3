# Verification

## Odoo

Authenticated bsk session used browser instance `245ea108` and the existing
QA login session. The route `/odoo/surveys/2` loaded `MyCompany Vendor
Certification`; Options exposed `Survey Time Limit`, `10:00`, and `minutes`.
The state was checked in a desktop agent window and iphone-14 emulation at a
semantic 390x844 viewport. Captures are the two `odoo-*.png` artifacts here.

## Core3

The bounded isolated start command was:

`bun run agent:module -- surveys --port=3390`

It failed before a listener became ready with the exact shared discovery
failure:

`PageSchemaError: Invalid page definition: actions[0].fields must be a non-empty array`

The subsequent bsk navigation to
`http://127.0.0.1:3390/surveys/detail?id=survey-demo-public-timer` returned
`Page.navigate rejected: net::ERR_CONNECTION_REFUSED`. No Core3 browser
capture, authenticated route result, request telemetry, or visual parity
claim is made. The failure points to shared page discovery and no unrelated
module path was edited.

The bsk sessions created for this feature were stopped; the final daemon check
showed those sessions stopped. Other pre-existing browser sessions were left
untouched.

