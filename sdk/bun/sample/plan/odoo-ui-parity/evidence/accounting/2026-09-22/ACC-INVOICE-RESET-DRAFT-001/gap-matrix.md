# Gap matrix

| Stable gap | Required behavior | Resolution/evidence |
| --- | --- | --- |
| ACC-RESET-001 | Invoice detail must expose Odoo's reverse workflow | Added API action and header action; focused contract test |
| ACC-RESET-002 | State transition must be durable and stale-safe | Added YAML mutation guard/update and restart test |
| ACC-RESET-003 | Mobile posted/Draft states need authenticated checks | Browser verification records paired states and any runtime limitation |
| ACC-RESET-004 | Odoo draftability has deeper accounting rules | Explicit bounded limitation; no claim of full accounting lock/hash parity |
