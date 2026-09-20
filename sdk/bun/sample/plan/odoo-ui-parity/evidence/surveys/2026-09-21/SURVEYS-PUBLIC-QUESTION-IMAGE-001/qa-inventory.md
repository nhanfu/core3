# Surveys public suggested-answer image QA inventory

Feature: `SURVEYS-PUBLIC-QUESTION-IMAGE-001`
Date: 2026-09-21

Required claims and checks:

- Odoo source route is represented by the token-scoped Core3 public image helper; verify survey token, answer token, question ownership, suggested-answer ownership, method, and published/in-progress state guards.
- The paired `page.id: surveys` page/API YAML remains separate; verify the `surveys.public` action and the `image_answers` question projection.
- The image content is durable; verify a deterministic SVG is returned, replayed, and available after file-backed DuckDB restart.
- The public renderer consumes the returned image metadata; verify the Choice question displays its image after a normal public Start → Next → Next flow.
- Capture authenticated Core3 admin/public desktop and mobile states at 1440x900 and 390x844, with request/page failures and horizontal overflow recorded.
- Attempt paired Odoo desktop/mobile access to `/survey/get_question_image/...`; record exact login, installation, or fixture blockers without claiming sign-off.

Exploratory cases: use a valid survey token with a wrong answer token and a valid answer token with a suggested-answer ID from another question; also replay the same image request and try POST before asserting the failure boundaries.
