# Test results

- `bun test ./test/timesheets_my_billed_fixed_price_filter.integration.test.ts`
  — 4 pass, 0 fail, 21 expectations.
- Selected adjacent My Timesheets regression (six integration files) — 23
  pass, 0 fail, 119 expectations.
- `bunx eslint
  sample/test/timesheets_my_billed_fixed_price_filter.integration.test.ts` —
  pass.
- `bun run css:build:timesheets` — pass.
- Owned `git diff --check` — pass.

The broader `timesheets_my*.integration.test.ts` glob exposed the pre-existing
schema failure in `timesheets_my.integration.test.ts`:
`components[0].follower_add_action references unknown action
"add_event_follower"` and
`components[0].follower_remove_action references unknown action
"remove_event_follower"`. That bounded command was stopped; the defect is not
in this feature's files.
