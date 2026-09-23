# Functionality checklist

| Check | Result |
| --- | --- |
| Page/API contracts share `page.id: employees` | pass |
| Current-company Employees rows expose stable tag names | pass |
| Tag-name search returns only matching current-company rows | pass |
| Foreign-company query returns no rows | pass |
| Existing tag assignment CRUD remains covered by adjacent regression | pass |
| Existing tag migration is replay-safe | pass |
| Tags group-by is available to the shared ListView | pass |
| Core3 authenticated desktop/mobile visual comparison | blocked; no local Core3 listener |
