# Source comparison

| Odoo contract | Core3 result |
| --- | --- |
| `resource_calendar_global_leaves_action_from_calendar` | `/public-holidays/calendar` |
| `resource.calendar.leaves`, global domain | Existing durable `public_holidays` rows |
| Active calendar context | Working Hours filter using `calendar_name` |
| Calendar/list owning surface | Shared ListView Calendar and List tabs |
| Detail row action | Existing `/public-holidays/detail` |

The Employees working-schedule surface was not changed; this bounded slice
keeps the context seam inside the Time Off service.
