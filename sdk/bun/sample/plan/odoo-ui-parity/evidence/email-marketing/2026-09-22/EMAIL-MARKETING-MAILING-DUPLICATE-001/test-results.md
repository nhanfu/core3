# Test results

Executed from `sdk/bun/sample` on 2026-09-22:

- `bun test ./test/email_marketing_mailing_duplicate.integration.test.ts --timeout 20000` — **3 passed, 0 failed, 16 assertions**.
- `bun test ./test/email_marketing_mailings.integration.test.ts --timeout 20000` — **5 passed, 0 failed, 69 assertions**.
- `bun test ./test/email_marketing_add_contacts_to_list.integration.test.ts --timeout 20000` — **4 passed, 0 failed, 24 assertions**.
- `bun run audit` — **passed**, 799 pages, 808 routes, 1,646 datasources.
- `bun run css:build:email-marketing` — passed.
- `git diff --check` — passed.

The three Email Marketing test commands were run sequentially. A combined
parallel invocation also exposed an unrelated pre-existing full-discovery race
(`duplicate_contact_ui` referenced by another dirty-checkout change); the
affected existing mailing test passes when run alone and no unrelated file was
changed.
