# Gap matrix

| Gap | Classification | Decision/evidence |
| --- | --- | --- |
| Contract create/edit/delete/archive/restore durability | implemented | Focused file-backed test and 75-test Fleet corpus pass |
| Required relation/date/cost/status guards | implemented | Mutation guards and atomic invalid-input coverage |
| Chatter and mail activity scheduling | partial | Source declares them; shared Core3 activity/chatter persistence remains deferred |
| Full Odoo partner/service/user relational widgets | partial | Bounded Core3 contract keeps deterministic text fields and vehicle selector |
| Live Odoo Fleet menu/action rendering | blocked | Current authenticated `core3_reference` session exposes no Fleet menu |
| Core3 desktop/mobile capture | blocked | Runtime reached the frontend, then `/api/modules` returned 502 and the host hit `EMFILE` descriptor exhaustion |

The blockers are recorded instead of being converted into a parity claim.
