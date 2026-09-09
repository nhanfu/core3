# Referrals — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr_referral` (Odoo 19 Community)
- Source availability: unavailable in the supplied Odoo source; use documented Odoo 19 UI contract
- Odoo demo data: verify from addon manifest when available; mock both populated and empty modes
- Core3 service: `referrals`

## UI inventory

- Referrals dashboard with points/rewards summary, leaderboard, referral link, and onboarding cards.
- Jobs/open positions cards, job detail, share/invite dialog, referral submission form, referred candidates list, and status cards.
- Rewards/points history, employee leaderboard, filters, pagination, candidate stage/status, and mobile bottom navigation.
- Empty/no-reward/no-open-position states and confirmation/toast dialogs.

## Core3 backend mock-data plan

Declare `referral_dashboard`, `referral_jobs`, `referral_candidates`, `referral_employees`, `referral_rewards`, `referral_points`, `referral_stages`, and `referral_share`. `default` includes leaderboard rows, points, rewards, open jobs, candidates in stages, and share metadata. States: `no_open_jobs`, `candidate_pending`, `candidate_hired`, `empty_rewards`, `leaderboard`, `mobile`, `share_dialog`.

## Shared UI primitives

Dashboard cards, kanban/status cards, contact/job relations, share dialog, progress/points indicators, toast/confirmation dialogs, pager, and mobile navigation.

## Screenshots

Capture Odoo contract/reference and Core3 at 1440x900 and 390x844 for dashboard, jobs, job detail/share, candidates, rewards/leaderboard, and empty states.

## Acceptance criteria

- Referral dashboard hierarchy, copy, cards, actions, job/candidate flow, points/rewards, and responsive layout match Odoo.
- All cards, leaderboard rows, candidate states, rewards, points, dialogs, and empty states are backend YAML fixtures.
- Share/submit actions, filters, candidate status, and mobile overflow render offline with stable datasource IDs.
- No fixture records are embedded in page-layout YAML; future providers can be queries.
