# Test results

Command:

```text
bun test ./test/base_contact_merge.integration.test.ts --timeout 20000
```

Result: **3 passed, 0 failed, 22 assertions**.

Coverage includes page/API separation and action binding; deterministic
same-email fixtures; category, activity, chatter, attachment, follower, and
bank-account reparenting; audit persistence; file-backed restart and migration
replay; selection, email, hierarchy, company, destination, and stale guards;
and no-partial-write behavior on rejected requests.
