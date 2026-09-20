# Browser and reference verification — `SURVEYS-PUBLIC-NUMERICAL-QUESTION-001`

Fresh source-served Core3 verification loaded the authenticated Surveys
catalog and the public `Numerical Range Survey` at 1440x900 and 390x844. The
public renderer displayed `What is the measured service time in minutes?`,
used a number input with `min=1.5`, `max=10.5`, `step=any`, and preserved
content width at each viewport. An exploratory desktop submission of `11.1`
was rejected in the renderer with `Enter a value from 1.5 to 10.5 minutes.`;
the browser recorded no page errors or failed requests.

Odoo probes at `http://127.0.0.1:8069/odoo/surveys` for both viewports returned
HTTP 200 only at `/web/login?redirect=%2Fodoo%2Fsurveys%3F`, with the login body
visible and no authenticated Numerical fixture. The disposable proxy at
`127.0.0.1:8072` was connection-refused/unavailable. No paired Odoo mutation,
visual parity, or module sign-off is claimed.
