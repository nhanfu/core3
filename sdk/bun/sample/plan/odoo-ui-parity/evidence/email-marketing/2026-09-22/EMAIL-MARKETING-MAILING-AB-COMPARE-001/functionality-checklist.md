# Functionality checklist

| Case | Classification | Result |
| --- | --- | --- |
| AB-COMPARE-FUNC-001 | functional | **PASS** — source action maps to a page/API join with exact five view modes and row navigation. |
| AB-COMPARE-DATA-001 | data | **PASS** — deterministic Newsletter variants are returned in stable order after idempotent migration replay. |
| AB-COMPARE-FILTER-001 | functional | **PASS** — campaign scope, search, status filter, and empty/no-result states are covered. |
| AB-COMPARE-SEC-001 | permission/security | **PASS** — datasource and navigation require `email_marketing.read`; unauthorized/forbidden/transport states are declared; no mutation action exists. |
| AB-COMPARE-GUARD-001 | workflow | **PASS** — Compare Version visibility requires at least two active A/B variants. |
| AB-COMPARE-UI-001 | responsive | **BLOCKED** — no authenticated desktop/mobile capture because the required user tab was already borrowed. |
| AB-COMPARE-REF-001 | visual | **BLOCKED** — installed Odoo action could not be reached; no visual-parity claim. |
