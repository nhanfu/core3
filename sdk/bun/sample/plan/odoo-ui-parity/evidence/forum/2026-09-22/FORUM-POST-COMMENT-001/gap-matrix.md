# Gap matrix

| Odoo behavior | Core3 mapping | Status / remaining gap |
| --- | --- | --- |
| Question/answer comment composer | OdooFormView chatter plus answer row server form | implemented |
| Durable `mail.message` comment body/actor/time | `forum_post_comments` relation and datasource | implemented in bounded model |
| Question last activity refresh | `forum_posts.last_activity_at` and atomic parent version update | implemented |
| Karma thresholds | `forum.write` permission | partial: dynamic karma is not modeled |
| Comment deletion | not in this slice | missing; follow-up |
| Convert comment to answer | not in this slice | missing; follow-up |
| Follower notification delivery | not in this slice | missing; follow-up |
| Authenticated Odoo/Core3 visual pairing | Odoo reference route unavailable | blocked by missing `website_forum` addon |
