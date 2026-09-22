# Functionality checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Stable page/API join | pass | `page.id: mailing-detail`; focused test |
| Odoo source action identity | pass | source comparison test |
| Deterministic A/B fixtures | pass | migration replay test |
| Durable queued winner copy | pass | stable winner ID and persisted row test |
| Source/group completion | pass | focused mutation assertions |
| Stale-row guard | pass | focused mutation assertions |
| Missing/not-ready/duplicate guards | pass | focused mutation assertions |
| Write permission boundary | pass | YAML contract assertion |
| Odoo desktop capture | blocked | shared tab remained user-owned |
| Odoo mobile capture | blocked | shared tab remained user-owned |
| Visual-parity claim | not claimed | required browser evidence unavailable |
