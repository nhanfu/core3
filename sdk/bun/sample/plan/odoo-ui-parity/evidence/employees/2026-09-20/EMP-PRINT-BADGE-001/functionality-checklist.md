# Functionality checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Odoo `qweb-pdf` report and employee form action mapped | pass | Focused source-mapping test |
| Page/API separation for detail action and badge page | pass | Focused source-mapping test and YAML audit |
| Permission and actor/company guards | pass | Focused guard test |
| Barcode required and stale row rejected | pass | Focused guard test |
| Durable print-run audit row | pass | Focused persistence test |
| Migration replay and file-backed restart | pass | Focused restart test |
| Authenticated Odoo desktop/mobile Print Badge state | pass | Odoo screenshots and download evidence |
| Authenticated Core3 desktop/mobile report exercise | blocked | Exact shared Auth schema blocker in `core3-blocker.json` |
