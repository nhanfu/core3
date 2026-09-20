# Verification

Authenticated source-served Core3 probes used Admin (`admin@tms.local`) and
the deterministic published Feedback Form token at both 1440x900 and 390x844.

1. Start the public survey and reach the rating question.
2. Submit unsupported rating `9` through the token-scoped progress API.
3. Observe HTTP 422 `SURVEY_PUBLIC_ANSWER_INVALID` and verify the response
   remains `{}` in the read API.
4. Select valid rating `5` through the rendered UI and advance to Question 2.

Both viewports had equal body/document and viewport widths. The browser JSON
records the intentional 422 as an expected validation response; the associated
console line is not an application failure. Screenshots are the four
`core3-authenticated-*.png` files in this directory.
