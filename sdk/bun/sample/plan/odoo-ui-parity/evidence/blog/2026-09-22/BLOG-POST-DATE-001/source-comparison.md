# Source comparison

## Odoo 19

- `website_pages_views.xml` form `view_blog_post_form` places `post_date` in
  the `publishing_details` / `Publishing Options` group.
- `website_blog.py` defines `post_date` as a stored computed field derived
  from `published_date` or `create_date`, with an inverse that writes
  `published_date`.
- The same form exposes author, create date, visits, last contributor, and
  last update around the publishing date. This slice covers only the missing
  date behavior.

## Core3

- `pages/post-detail.yaml` remains presentation-only and labels the existing
  `published_date` projection as `Publishing date` using the shared datetime
  text control.
- `api/post-detail.yaml` adds `published_date` to the existing guarded edit
  mutation, normalizes a blank value to NULL, validates date/time input, and
  preserves row-version and company guards.
- The existing list/kanban `post_date` projection continues to use
  `COALESCE(published_date, created_at)`, matching the Odoo inverse fallback.
