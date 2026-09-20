# Verification

Authenticated source-served Core3 probes used Admin (`admin@tms.local`) and
the deterministic Feedback Form live session `5822`.

At both 1440x900 and 390x844:

1. Open `/s/5822` and authenticate the Core3 shell session.
2. Join as a deterministic viewport-specific attendee.
3. Submit rating `5` for `How satisfied are you?`.
4. Reload the attendee-token URL and observe `Answer submitted: 5`.

Both viewports reported zero console/page failures, equal body/document and
viewport widths, and the expected attendee token plus answer state. Results
are in `core3-browser-results.json`; screenshots are the four
`core3-authenticated-*.png` files in this directory.
