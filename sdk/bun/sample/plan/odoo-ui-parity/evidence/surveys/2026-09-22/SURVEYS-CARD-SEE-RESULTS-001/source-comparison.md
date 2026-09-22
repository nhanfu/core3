# Source comparison

| Odoo 19 | Core3 |
| --- | --- |
| Active survey kanban renders `See results` and calls `action_result_survey`. | Cards view renders `See results` and calls `open_survey_results_card`. |
| Model action opens authenticated `/survey/results/<survey_id>`. | Page action opens authenticated `/surveys/results?survey_id=<stable_id>`. |
| Results report contains response filters and per-question statistics. | Existing results API supplies All/Completed and Passed/Failed filters, question response rates, choice chart, and text responses. |

The Core3 route is a YAML-first equivalent, not copied Odoo frontend code. The
card action uses the existing durable surveys, participants, and detailed-answer
rows; it adds no duplicate result storage or page-local fixture.
