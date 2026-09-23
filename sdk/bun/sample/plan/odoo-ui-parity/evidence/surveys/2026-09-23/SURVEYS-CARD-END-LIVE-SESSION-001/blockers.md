# Blockers

Core3 browser validation was blocked before render. Command:

```text
bun run agent:module -- surveys --port=4099
```

Exact discovery errors:

```text
PageSchemaError: Invalid page definition:
- components[0].follower_add_action references unknown action "add_event_follower"
- components[0].follower_remove_action references unknown action "remove_event_follower"
```

These references are in the concurrent Events module and are outside the
Surveys write scope. No unrelated files were changed and no Core3 screenshot
or visual parity claim is made.

BrowserSkill itself was available. No Odoo user tab was listed for borrowing;
an authenticated agent-owned tab loaded the requested Odoo service, produced
the desktop/mobile reference captures, and was stopped afterward.
