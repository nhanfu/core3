# Test results

- `bun test test/fleet_vehicle_tags.integration.test.ts --timeout 30000`: **4 passed / 27 assertions**.
- Affected regression set (attachments, vehicle-tags, Mail to Driver, renewal activities): **13 passed / 112 assertions**.
- `bun run audit`: **807 pages / 816 routes / 1,671 datasources**.
- `bun run css:build:fleet`: passed.
- `bunx eslint test/fleet_vehicle_tags.integration.test.ts`: passed.
- `git diff --check`: passed.
