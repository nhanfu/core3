# Gap matrix

| Stable ID | Gap / acceptance | Implementation | Evidence |
| --- | --- | --- | --- |
| AB-COMPARE-001 | Missing Odoo `action_compare_versions` action and page | `pages/ab-tests.yaml`, `api/ab-tests.yaml`, `api/mailing-detail.yaml` | focused source contract test |
| AB-COMPARE-002 | Missing five Odoo view modes | `pages/ab-tests.yaml` list/kanban/form/calendar/graph tabs | focused page contract test |
| AB-COMPARE-003 | Missing campaign/A/B scope and deterministic filters | `email_mailing_ab_tests` datasource query | focused datasource test |
| AB-COMPARE-004 | Compare action could show for one variant | detail `ab_testing_variant_count >= 2` guard | focused contract assertion |
| AB-COMPARE-005 | Missing read-only permission and error boundaries | `email_marketing.read`, 401/403/503 declarations, no server mutations | focused security contract test |
| AB-COMPARE-006 | Missing paired authenticated desktop/mobile evidence | BrowserSkill borrow blocked by owner session `ebbh` | browser-check and verification |
| AB-COMPARE-007 | Global discovery/audit blocked by unrelated Inventory YAML | No Inventory files changed | test-results |
