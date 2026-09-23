# Verification

Migration `20260923200000-045-event-followers.yaml` creates the follower
catalog and event relation with fixed IDs and timestamps. The focused suite
proves add/remove persistence, chatter audit rows, actor and lifecycle guards,
optimistic event versions, migration replay, and file-backed restart.

The Odoo source and authenticated BrowserSkill desktop/mobile captures verify
the source follower surface. Core3 runtime/browser captures were not produced
in this checkpoint, so paired visual verification and full module sign-off
remain open.
