# CRM-LEAD-MINING-REQUESTS-001

2026-09-21 source-backed bounded evidence.

- Odoo source: `addons/crm_iap_mine/views/crm_menus.xml`,
  `crm_iap_lead_mining_request_views.xml`, and
  `models/crm_iap_lead_mining_request.py`.
- Core3 contracts: CRM list/new/detail page/API fragments plus migration
  `20260921100000-029-lead-mining-requests.yaml`.
- Focused test: 2 pass / 26 assertions. Discovery audit: 772 pages / 781
  routes / 1,582 datasources. No `crm_lead_mining_teams` ID remains.
- Full CRM: 45 pass / 1 fail / 222 assertions; AI allowlist gap for the four
  new named actions. AI intentionally remains outside this CRM-only commit.
- Odoo PNGs, not committed: desktop SHA-256
  `49f38c3228ea5c031b4e830ba26939f5f96317c0f36fee68d2db81c22db3f70d`;
  mobile list `340e2fda3d1c985364e67bc6ff9aff2fa2c1b33a710456b7e1eade3b3c6f97da`;
  mobile New `8841fc094ba07f6f69747f43ba1ce661c317ebb158e47b524a94a66709ce2c32`.
- Core3 bsk rendered only the empty shell; this is a blocker, not parity
  evidence. Sessions were stopped cleanly. No credentials, cookies, tokens,
  or passwords were extracted.
