# Source comparison

## Odoo 19

- `addons/website_blog/views/website_pages_views.xml` declares the Blog Post
  list with `type="object" action="open_website_url"`.
- The same file declares the kanban with `action="open_website_url"`.
- `addons/website_blog/views/website_pages_views.xml` binds the list and
  kanban to `action_blog_post`, whose visible modes are `list,kanban,form`.
- `addons/website_blog/views/website_pages_views.xml` adds the form
  `is_published` field with the `website_redirect_button` widget.
- `addons/website_blog/models/website_blog.py` computes the public
  `website_url` as a slugged `/blog/<blog>/<post>` path and `_get_access_action`
  returns a public URL action for published posts.

The authenticated reference could not render this addon: BrowserSkill observed
`http://localhost:8069/blog` as Odoo Error 404 at desktop and mobile sizes.

## Existing Core3 before this slice

- `services/blog/pages/posts.yaml` used `row_open_action: view_blog_post` and
  had no `website_url` column or website action.
- `services/blog/pages/post-detail.yaml` exposed Back, Edit, and Print only.
- `services/blog/api/posts.yaml` projected post state but not a public URL.
- `services/blog/api/post-detail.yaml` returned the post row without a URL
  projection.

## Implemented classification

The gap was `missing`, not a duplicate of the completed post kanban or tag
relation slices. The page files remain layout-only; matching API files own the
projection and action. List/kanban row opens and the detail header now navigate
the same-tab public URL, while an explicit Open editor action preserves private
detail access. The Core3 route difference is deliberate and explicit:
`/blog/post?id=<post-id>` delegates to the existing Fluent public renderer.
