# Odoo analysis

Addon: Odoo 19 `addons/website_forum`.

- `controllers/website_forum.py:343-352` defines the authenticated JSON-RPC
  route `toggle_favourite`; it computes the inverse of `question.user_favourite`,
  writes the current user to `favourite_ids`, subscribes the user when adding,
  and returns the boolean result.
- `models/forum_post.py:65-68` defines the `favourite_ids` Many2many,
  current-user `user_favourite`, and stored `favourite_count` fields.
- `models/forum_post.py:207-215` computes current-user state and relation count.
- `views/forum_post_views.xml:176-181` keeps a Users favorite posts action scoped
  to active/closed posts with `favourite_count > 0`.

The source action is distinct from `toggle_correct`; this feature deliberately
does not implement accepted-answer reversal.

Live BrowserSkill check, browser instance `245ea108`:

- `bsk status --json` reported a connected Chrome and the requested instance.
- User tab `1770662590` was the authenticated Odoo tab, but
  `bsk tab borrow 1770662590 --session qlif` returned the exact blocker:
  `tab is borrowed by another session` and identified owner session `ftio`.
- I did not inspect, navigate, or return another worker's borrowed tab. The
  worker session was stopped after the denial (runtime session id `xwxz`).
- Existing authenticated launcher captures record no Website/Forum app and
  the prior `/forum` 404; `website_forum` is not installed in `core3_reference`.
