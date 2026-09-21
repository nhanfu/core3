# Gap matrix

| Gap | Resolution | Evidence |
| --- | --- | --- |
| Core3 attendee answers were read-only | Replaced ContactGrid with page-owned LineItemGrid and line CRUD | focused test |
| Answer rows lacked durable relation/version fields | Added migration 033 columns and fixed dietary relation | focused test and migration |
| No relation-aware value validation | Added question/choice lookup and stable 404/409/422 guards | focused test |
| Core3 visual comparison unavailable | Authenticated Core3 desktop/mobile capture was not rerun in this checkpoint | verification.md |
