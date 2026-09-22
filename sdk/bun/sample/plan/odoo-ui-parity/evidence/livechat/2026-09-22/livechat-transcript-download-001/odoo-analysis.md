# Odoo source analysis

- `addons/im_livechat/controllers/main.py` defines public HTTP
  `/im_livechat/download_transcript/<int:channel_id>`.
- `addons/im_livechat/controllers/cors/main.py` defines the CORS equivalent
  `/im_livechat/cors/download_transcript/<int:channel_id>` and establishes the
  guest context before delegating.
- The controller renders
  `im_livechat.action_report_livechat_conversation`, sets the persona timezone,
  and returns `application/pdf` with an inline `transcript_<id>.pdf` filename.
- `static/src/core/common/thread_model_patch.js` and
  `static/src/embed/cors/thread_model_patch.js` expose the transcript URL.
- `static/src/core/web/livechat_channel_info_list.xml` and
  `static/src/embed/common/feedback_panel/feedback_panel.xml` show Download
  after the conversation ends.
- Odoo's `tests/test_transcript.py` proves a member can download a PDF and a
  non-member receives 404.

The live authenticated action was not inspected in this turn because the
required BrowserSkill borrow confirmation for tab `1770662590` timed out.
