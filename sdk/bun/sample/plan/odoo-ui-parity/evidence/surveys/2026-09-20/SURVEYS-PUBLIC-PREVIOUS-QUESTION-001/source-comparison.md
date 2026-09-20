# Source comparison

Odoo's survey controller handles `previous_page_id` in
`addons/survey/controllers/main.py:583-587` and returns the prior ordered
page/question. Core3 maps this to `surveys.public.previous_question`, persists
`survey_responses.current_question_id` and `navigation_key`, and binds the
rendered public Back control to the API action.

The Odoo live mutation comparison is blocked: the installed reference at
`127.0.0.1:8069` has no stable active answer-token fixture accepted for a fresh
previous-question request. This exact fixture blocker is retained rather than
treated as Odoo parity sign-off.
