# Source comparison

| Odoo behavior | Core3 implementation | Result |
| --- | --- | --- |
| `access_mode` public/token | `survey-detail` datasource and `update_survey_access` server form | implemented |
| `users_login_required` | Existing durable column and API field | implemented |
| `is_attempts_limited` / `attempts_limit` | Existing durable columns, positive and identity guards | implemented |
| `users_can_go_back` / Allow Roaming | Existing durable column and scoring conflict guard | implemented |
| Options → Participants labels | `pages/survey-detail.yaml` group and action | implemented |
| Inline save and source constraints | Permissioned YAML mutation with optimistic row version | implemented at bounded contract level |
| Authenticated Core3 visual comparison | Runtime fails before page discovery | blocked |
