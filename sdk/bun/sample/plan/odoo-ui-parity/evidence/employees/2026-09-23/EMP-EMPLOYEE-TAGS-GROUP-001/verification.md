# Verification

Implementation files are limited to the Employees API/page YAML and the
Employees focused integration test. `git diff --check` passes for the scoped
change.

The API reads the existing durable tag relation and does not create a second
fixture store. Replaying the full Employees migration chain preserves the
seeded relation and projected values without duplicate rows. The focused and
adjacent tag suites pass.

No aggregate Employees sign-off is claimed because Core3 visual evidence could
not be captured without a running local Core3 listener.
