# `SURVEYS-PUBLIC-MULTIPLE-CHOICE-001`

Bounded Wave 18 slice: Odoo `multiple_choice` / Core3 `Multiple Choice`
public multi-select response behavior.

The migration seeds a separate published Product Preferences Survey with one
required multiple-choice question. The paired `page.id: surveys` API/page
contract keeps public progress and submit under `surveys.public`; duplicate
and foreign options are rejected before mutation, while selected options
survive file-backed restart and concurrent idempotent submit.

Core3 browser evidence is conditional. The isolated runtime's frontend/backend
processes did not expose a reachable HTTP listener before the bounded probe;
desktop and mobile captures therefore record `ERR_CONNECTION_REFUSED` and no
visual sign-off is claimed.

Odoo desktop/mobile probes returned HTTP 200 only at the login shell,
redirecting to `/web/login?redirect=%2Fodoo%2Fsurveys%3F`; disposable proxy
8072 refused the connection. No authenticated Odoo Multiple Choice fixture or
parity sign-off is claimed.
