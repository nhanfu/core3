# Verification chain

1. The Odoo source action and stat button were read from the local Odoo 19 checkout.
2. Core3 discovers separate page/API YAML contracts with matching `page.id`.
3. The page datasource returns both deterministic same-person rows, including the archived row, and supports search and empty/company-scoped states.
4. The applicant detail datasource reports the related application count.
5. Migration 026 is idempotent and a file-backed reopen returns both rows.
6. Full Recruitment regression and the UI audit pass.
7. Authenticated Odoo browser verification remains blocked; no visual parity claim is made.
