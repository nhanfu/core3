# Verification

## Odoo reference

Authenticated bsk checks used browser instance `245ea108`, local service
`http://localhost:8069`, database `core3_reference`, and the existing local QA
login session. Odoo Options → Participants showed Access Mode “Anyone with the
link,” Require Login, Limit Attempts with “2 to attempts,” and Allow Roaming at
1440x900 and iphone-14 emulation 390x844. The captures and hashes are listed
in `README.md`.

## Core3 blocker

`bun run agent:module -- surveys --port=4061` failed before readiness during
shared page/API discovery:

`PageSchemaError: Invalid page definition: actions[4].success_message is not allowed`

The offending `success_message` entries are outside `services/surveys`; no
unrelated module was edited. bsk navigation after the failed start returned
`net::ERR_CONNECTION_REFUSED`. No Core3 desktop/mobile screenshot, action
click, or visual parity sign-off is claimed.
