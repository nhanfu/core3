# Odoo analysis

- Addon: Odoo 19 `addons/website_forum`.
- Route: `controllers/website_forum.py:439-451`, authenticated
  `POST /forum/<forum>/post/<post>/comment`.
- Behavior: accept `comment`, post a `mail.message` with
  `message_type='comment'` and `mail.mt_comment`, update the containing
  question's `last_activity_date`, and redirect to the question.
- Eligibility: `models/forum_post.py:240-263` computes `can_comment` from
  forum karma thresholds; the bounded Core3 actor equivalent is `forum.write`.
- Presentation: `views/forum_forum_templates_post.xml:522-563` renders
  `Comment this post`, `Add a comment`, author, timestamp, and comment body
  for both questions and answers.
