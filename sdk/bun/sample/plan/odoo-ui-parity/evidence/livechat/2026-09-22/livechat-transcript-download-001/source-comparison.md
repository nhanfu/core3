# Source comparison

| Odoo behavior | Core3 contract | Result |
| --- | --- | --- |
| Public HTTP and CORS transcript routes | Action script retains the CORS route; API datasource is the token-scoped transport for Core3 | bounded |
| PDF report response and `application/pdf` | Durable `livechat_transcript_downloads` artifact with PDF MIME and base64 bytes | implemented |
| Ended conversation exposes Download | Visitor page action requires `Closed` and `transcript_available` | implemented |
| Guest/member ownership | Datasource joins the requested session to the supplied visitor token | implemented |
| Missing/open/non-owned conversation | Empty datasource result; no artifact bytes are returned | implemented |
| Report generation for every newly closed session | No outbound report renderer is configured; only durable seeded artifacts are exposed | bounded gap |
| Desktop/mobile visual parity | Requires authenticated Odoo/Core3 browser captures | blocked |
