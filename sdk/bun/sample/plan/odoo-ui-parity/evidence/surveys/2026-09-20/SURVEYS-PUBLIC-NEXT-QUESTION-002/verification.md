# Verification and blockers

Fresh source-served Core3 runtime evidence used Admin credentials before
exercising the public token flow. At both 1440x900 and 390x844, Question 1
rendered, the rendered Next control saved progress and called `/next_question`,
Question 2 rendered, the same key replayed with `replayed: true`, and reload
restored Question 2 from `current_question_id`. Browser results record zero
failed requests and no horizontal overflow. The disposable runtime was
stopped after capture.

Odoo source comparison is complete against
`/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:537-611`.
The installed reference at `http://127.0.0.1:8069` has no stable active
in-progress answer-token fixture accepted for a fresh mutation probe, so no
paired Odoo screenshot/mutation sign-off is claimed.
