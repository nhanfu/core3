# SURVEYS-SCORING-CONFIG-001 verification

The live Odoo reference was reached at `http://localhost:8069`, database
`core3_reference`, through the authenticated browser session. Surveys exists
and the Options form exposes the four Odoo scoring choices and Required Score
(%). Desktop and mobile screenshots are stored beside this record.

Core3 backend startup completed on ports 3001/3002, but the fresh in-memory
auth store had no shared QA login state. The browser therefore received 401
from `/api/pages/dashboard`; this is the exact Core3 browser blocker. The
implementation is covered by the focused persistence/permission/restart
tests, but Core3 authenticated desktop/mobile visual parity remains
conditional.
