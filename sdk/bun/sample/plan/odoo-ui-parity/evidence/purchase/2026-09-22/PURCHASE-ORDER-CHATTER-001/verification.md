# Verification

The implementation is limited to Purchase-owned page/API YAML, migration,
integration test, and evidence files. BrowserSkill cleanup completed with the
owned session stopped and zero owned tabs borrowed. The authenticated Odoo tab
remained owned by another session, so no visual comparison is recorded.

Required final checks for this commit:

- focused Purchase chatter test
- `bun run audit`
- `bun run frontend:build`
- `git diff --check`
- remote branch synchronization
