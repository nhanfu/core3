# Odoo source analysis

Source: /home/nhanjs/projects/odoo/addons/event, revision 65975996 as
recorded in the Events parity plan.

Action/menu: event_tag_category_action_tree, Events > Configuration > Event
Tags Categories, model event.tag.category, view order list,form.

The source files define event.tag.category.tag_ids as a one-to-many relation
to event.tag. The form in views/event_tag_views.xml renders an editable Tags
list with sequence using the handle widget, required name, and numeric color
using color_picker. The list view shows category sequence, name, and colored
tag chips. The model defines required tag name/category, sequence, and a color
index defaulted in the 1-11 range; category deletion cascades tags.

BrowserSkill attempt: daemon status was healthy, browser instance was 245ea108,
and authenticated tab 1770662590 was listed at the Odoo service. Borrowing it
from session mdyi was rejected with:

error: tab is borrowed by another session

details: tab 1770662590 is already borrowed or being borrowed by session zfuv

No credentials, cookies, tokens, or independent browser were used. No live Odoo
desktop/mobile screenshot was produced, so source behavior is not presented as
live visual evidence.
