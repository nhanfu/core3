# Functionality checklist

| Stable behavior | Result | Evidence |
| --- | --- | --- |
| Manager-only Projects Duplicate action | Pass | YAML contract test |
| New active `Project (copy)` with reset version/date metadata | Pass | Mutation test |
| Milestone persistence | Pass | Mutation result and reopen test |
| Active top-level and recursive child task mapping | Pass | Nine copied seeded tasks and parent assertions |
| Copied task state starts `In Progress` | Pass | Mutation test |
| Internal task dependency remapping | Pass | Dependency query assertion |
| Active/company/stale guards with no partial copy | Pass | Guard test |
| File-backed close/reopen persistence | Pass | Reopen query assertions |
| Authenticated desktop/mobile browser proof | Blocked | BrowserSkill borrow confirmation |
