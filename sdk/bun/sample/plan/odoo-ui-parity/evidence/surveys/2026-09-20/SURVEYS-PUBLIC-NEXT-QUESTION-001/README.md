# SURVEYS-PUBLIC-NEXT-QUESTION-001

Bounded evidence for the Odoo public next-question lifecycle and Core3's
durable token-scoped cursor transition.

Core3 runtime evidence is in `core3-browser-results.json` with desktop and
mobile screenshots. The public route returned HTTP 200 and advanced the
response cursor from `question-feedback-rating` to
`question-feedback-comment` at both viewports.

The API transition is verified. The existing public renderer remains on its
client-side Question 1 after reload because `public/components/PublicSurvey.ts`
does not consume `answer.current_question_id`; that file is outside the
Surveys-owned write boundary for this commit. The installed Odoo reference has
no stable active answer-token fixture for a paired mutation request. These are
explicit blockers, not sign-off claims.
