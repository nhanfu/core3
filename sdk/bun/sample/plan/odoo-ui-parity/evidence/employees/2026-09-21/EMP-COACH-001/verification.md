# Verification

- Focused: `bun test test/employees_coach.integration.test.ts` — **4 pass,
  23 assertions**.
- Scoped lint: `bunx eslint test/employees_coach.integration.test.ts` — pass.
- UI audit: `bun run audit` — pass, **712 pages / 721 routes / 1,359
  datasources**.
- Diff check: `git diff --check` on Employees and owned parity paths — pass.
- Browser: all four authenticated routes returned HTTP 200; no page errors or
  failed resource requests were observed. The Core3 login navigation emitted
  an expected aborted notifications request during redirect; there was no
  feature request failure or horizontal overflow.

The attempted full Employees glob was stopped after it exposed unrelated
pre-existing exact-shape failures in `employees.integration.test.ts` and
`employees_birth_identity.integration.test.ts`; this slice's focused test is
green and no unrelated contract was changed.
