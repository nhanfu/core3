# Test results

Command:

```text
bun test ./test/chat_scheduled_messages.integration.test.ts --timeout 20000
```

Result:

```text
3 pass
0 fail
23 expect() calls
```

Assertions cover page/API/menu contracts, route discovery, migration replay,
search and empty state, edit persistence, stale and past-date guards, Force
Send deletion, missing-record handling, and `chat.technical` enforcement.
