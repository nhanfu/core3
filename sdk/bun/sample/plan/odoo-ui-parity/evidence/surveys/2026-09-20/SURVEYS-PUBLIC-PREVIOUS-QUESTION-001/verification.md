# Verification

Authenticated source-served Core3 probes used Admin (`admin@tms.local`) and
the deterministic public Feedback Form token. At both 1440x900 and 390x844:

1. Start the survey and answer Question 1.
2. Advance to Question 2, press Back, and observe Question 1.
3. Read the durable response cursor after Back.
4. Replay the same previous-navigation key and receive HTTP 200 with
   `replayed: true`.
5. Reload and observe Question 1 again.

Both viewports reported zero console/page failures, equal body/document and
viewport widths, and the expected `question-feedback-rating` cursor. Results
are in `core3-browser-results.json`; screenshots are the four
`core3-authenticated-*-*.png` files in this directory.
