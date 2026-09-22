# Functionality evidence

- Source and page/API join: passed.
- Create payload is limited to Blog and Title: passed.
- Durable generated post ID and active Draft state: passed.
- Blog and company fields are derived server-side: passed.
- Blank title: rejected with `422 BLOG_POST_TITLE_REQUIRED`.
- Missing/unknown blog: rejected with `422 BLOG_POST_BLOG_INVALID`.
- Archived blog: rejected with `422 BLOG_POST_BLOG_INVALID`.
- Cross-company blog: rejected with `403 BLOG_COMPANY_SCOPE_REQUIRED`.
- Read-only actor: rejected with `403` before mutation.
- Restart and migration replay: created Draft remains present.
