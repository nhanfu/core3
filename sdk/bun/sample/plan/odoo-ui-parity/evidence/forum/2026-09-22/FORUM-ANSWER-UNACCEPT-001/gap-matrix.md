# Gap matrix

| ID | Gap | Contract | Evidence |
| --- | --- | --- | --- |
| FUA-01 | Accepted answer could not be reversed | `api/question-detail.yaml` action `unaccept_forum_answer` | focused contract test |
| FUA-02 | Question detail was not page/API separated | `pages/question-detail.yaml` + `api/question-detail.yaml`, same page id | discovery test |
| FUA-03 | No reverse-state stale/replay guard | accepted-state and parent/answer row-version guards | mutation and HTTP tests |
| FUA-04 | No restart proof for the new transition | file-backed DuckDB action after reopen and migration replay | restart test |
| FUA-05 | No paired live Forum screen | `website_forum` absent from reference database | BrowserSkill captures and 404 |
