# Source comparison

Odoo's `survey_submit` route in
`/home/nhanjs/projects/odoo/addons/survey/controllers/main.py` validates each
submitted question through `validate_question` before saving answer lines.
Core3 now applies the same bounded choice/rating/multiple-choice/numerical
validation before the YAML-backed public progress and submit mutations.

The paired Odoo route was reachable at
`http://127.0.0.1:8069/survey/start/b135640d-14d4-4748-9ef6-344ca256531e`
with HTTP 200 at both requested viewports, but the seeded route remained on
the host-session waiting state and did not expose a question input for a fresh
invalid-answer mutation. Odoo mutation parity is therefore conditional.
