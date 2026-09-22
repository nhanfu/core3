# BLOG-POST-WEBSITE-001

Bounded Odoo Website Blog action slice: Blog Post `open_website_url`.

This slice adds a durable Core3 `website_url` projection and the shared
read-only `Open website` action on the Posts list/kanban and Post detail form.
The Core3 public route alias is `/blog/post?id=<post-id>` because the existing
public renderer uses an ID query parameter rather than Odoo's slug path.

Files:

- `source-comparison.md` — Odoo source and current Core3 gap.
- `functionality.md` — focused test and contract evidence.
- `browser-check.md` — BrowserSkill live-reference result and exact blocker.
- `odoo-blog-desktop-blocker.png` and `odoo-blog-mobile-blocker.png` — truthful
  Odoo `/blog` Error 404 captures from the same Chrome instance.

No visual-parity claim is made because `website_blog` is not installed in the
authenticated `core3_reference` database and the shared signed-in action tab
was already borrowed by another team session.
