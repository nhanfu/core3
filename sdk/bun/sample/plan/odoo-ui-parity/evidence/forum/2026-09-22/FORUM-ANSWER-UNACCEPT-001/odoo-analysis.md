# Odoo analysis

Addon: Odoo 19 `addons/website_forum`.

The source route `post_toggle_correct` in
`/home/nhanjs/projects/odoo/addons/website_forum/controllers/website_forum.py`
implements the answer workflow: it rejects a question row, clears
`is_correct` on sibling answers, and toggles the selected answer. The model
defines `is_correct` and the question-level validated-answer projection in
`models/forum_post.py`; the backend action is available to the question owner
or a user meeting the forum karma threshold (`karma_answer_accept_own` / `all`).
The admin form exposes answer rows with `is_correct`, and the search view has
an `Accepted Answer` filter in `views/forum_post_views.xml`.

Live authenticated BrowserSkill check, browser instance `245ea108`:

- the app launcher contained Discuss and installed business apps but no Website
  or Forum entry;
- authenticated `/forum` returned Odoo's `Error 404` page at desktop and
  mobile emulation;
- therefore the live database has no installed `website_forum` screen to
  exercise or pair visually.
