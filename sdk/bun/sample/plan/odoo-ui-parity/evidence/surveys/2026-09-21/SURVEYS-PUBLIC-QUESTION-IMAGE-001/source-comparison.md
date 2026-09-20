# Source comparison — `SURVEYS-PUBLIC-QUESTION-IMAGE-001`

Odoo source `addons/survey/controllers/main.py:463-484` exposes `/survey/get_question_image/<survey_token>/<answer_token>/<question_id>/<suggested_answer_id>`. It validates the public answer context, confirms the question belongs to the survey and the suggested answer belongs to that question, then streams `survey.question.answer.value_image`.

Core3 migration `0.0.35` adds durable `value_image_content` to suggested answers and seeds a separate published `Image Choice Survey`. `survey.public.questions` projects image-answer IDs, while `survey.public.question_image` joins the published survey, in-progress/new answer token, question, and suggested answer before serving the deterministic SVG at `/api/public/surveys/<survey_token>/question-image/<answer_token>/<question_id>/<suggested_answer_id>`. The public renderer consumes that metadata in the existing Choice control and uses the token-scoped image URL. The paired API action is `surveys.public.question_image` with `surveys.public` metadata; the authenticated page remains separate through `page.id: surveys`.

This slice covers suggested-answer images only; survey/section background behavior and other question types remain separate.
