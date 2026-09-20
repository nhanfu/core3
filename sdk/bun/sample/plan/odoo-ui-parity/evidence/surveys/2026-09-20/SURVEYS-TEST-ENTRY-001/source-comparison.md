# Source comparison

Odoo source: `addons/survey/controllers/main.py:156-165`.

Odoo's authenticated `survey_test` route resolves the survey token, creates a
test answer with `test_entry=True`, and redirects to the public survey start
route with the new answer token. Core3 keeps the authenticated `survey-test`
page and `api/survey-test.yaml` action separate by `page.id`, requires
`surveys.write`, validates the published/active token and question graph, and
uses the deterministic test-entry row as an idempotent launch key. The same
public start surface then renders the test-entry state.

The deterministic fixture is an explicit Core3 adaptation of Odoo's newly
created test answer: repeated launches reset the same durable test row rather
than creating duplicate browser fixtures. Its stable access token and launch
key survive file-backed DuckDB reopen.
