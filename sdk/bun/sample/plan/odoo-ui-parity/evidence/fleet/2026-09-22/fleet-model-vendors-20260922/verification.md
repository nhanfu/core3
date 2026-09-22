# Verification

Focused command:

```text
bun test test/fleet_model_vendors.integration.test.ts --timeout 30000
```

The focused test covers source mapping, page/API joining, deterministic
vendor options and assignments, add/remove persistence, actor/stale/invalid/
duplicate/archived/missing guards, atomicity, migration replay, and a
file-backed restart.

Static checks for the bounded slice:

- Fleet YAML discovery/audit
- Fleet frontend/CSS build
- `git diff --check`
- commit check with `git show --check`

BrowserSkill status:

- instance: `245ea108`
- explicit borrow target: `1770662590`
- outcome: confirmation unavailable; no borrow, navigation, screenshot, or
  credentials access
- session: stopped cleanly
