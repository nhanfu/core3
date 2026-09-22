# TIMEOFF-PUBLIC-HOLIDAY-CALENDAR-001

Bounded feature: Odoo `resource_calendar_global_leaves_action_from_calendar`
mapped to Core3 `/public-holidays/calendar`.

Source: `/home/nhanjs/projects/odoo/addons/hr_holidays/views/resource_views.xml`.
Core3 page/API: `public-holiday-calendar`, joined by `page.id`.

The route exposes manager-only Calendar and List views, date-range and
working-hours scope, existing public-holiday detail navigation, and explicit
empty/503 states over durable `public_holidays` data. No migration was needed.

Focused result: **PASS**, 3 tests / 48 assertions in
`test/time_off_public_holidays.integration.test.ts`.

BrowserSkill instance `245ea108` was connected. The required signed-in Odoo
tab `1770662590` was already borrowed by session `yabv`. A task-owned
`/odoo/time-off` tab showed the Discuss shell at desktop and emulated iPhone-14
mobile sizes. Captures are outside Git:

- `/tmp/core3-odoo-parity/timeoff-public-holiday-calendar-20260922/odoo-desktop-blocker-2.png`
- `/tmp/core3-odoo-parity/timeoff-public-holiday-calendar-20260922/odoo-mobile-blocker.png`

No Odoo mutation, credential, cookie, token, or visual-parity claim was made.
