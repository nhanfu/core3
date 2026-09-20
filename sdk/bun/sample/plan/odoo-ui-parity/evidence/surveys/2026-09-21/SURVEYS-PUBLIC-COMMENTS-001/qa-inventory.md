# QA inventory — SURVEYS-PUBLIC-COMMENTS-001

## Scope

- Feature: Odoo-style choice-question comments and comment-as-answer.
- Core3 route: `/survey/start/comments-public-token-2026` with the paired
  token-scoped public API.
- Viewports: desktop `1440x900`; mobile `390x844`.
- Actors: authenticated Core3 Administrator where the host permits login,
  anonymous public token, and the Odoo reference route where installed.

## Required probes

1. Public catalog exposes the comment prompt and `comment_count_as_answer`.
2. Desktop/mobile renderer shows the comment field without horizontal overflow.
3. Comment-only submission satisfies the configured required choice and
   survives restart/idempotent replay.
4. A comment attached to a question that does not allow comments is rejected
   without mutation; Odoo comparison records installed-fixture availability.

## Evidence files

- `browser-results.json`
- `core3-desktop.png`, `core3-mobile.png`
- `odoo-desktop.png`, `odoo-mobile.png`
- `source-comparison.md`, `test-results.md`, `verification.md`,
  `blockers.md`

Browser artifacts are runtime observations; lifecycle and permission assertions
remain in the focused integration test.
