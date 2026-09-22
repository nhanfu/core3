# Test results

- `bun test ./test/livechat_transcript_download.integration.test.ts --timeout 20000`
  — **3 passed, 18 assertions, 0 failed**.
- Paired regression for transcript download, public message, visitor
  feedback/leave, widget bootstrap, transcript email, and Invite People —
  **18 passed, 120 assertions, 0 failed**.
- Full Live Chat corpus: **91 passed, 861 assertions, 0 failed across 27
  files**.
- `bun run audit` — **843 pages, 851 routes, 1,761 datasources**, passed.
- `bun run frontend:build` (full CSS build plus Vite) — passed; the build log
  contained no warning or error lines.
- `bunx eslint test/livechat_transcript_download.integration.test.ts` — passed.
- `git diff --check` — passed.

The broader repository contains unrelated concurrent Blog/eCommerce changes;
they were preserved and are not part of this feature's test claim.
