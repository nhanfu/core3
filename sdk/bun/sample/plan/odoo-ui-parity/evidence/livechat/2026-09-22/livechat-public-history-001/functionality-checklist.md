# Functionality checklist

- [x] Stable ID and Odoo source route trace.
- [x] Page/API separation through `page.id: livechat-session-detail`.
- [x] Operator permission `livechat.write` and assigned-session scope.
- [x] Visitor partner membership guard prevents cross-session delivery.
- [x] Non-empty page history is recorded in the session timeline.
- [x] Empty page history produces `No history found`.
- [x] Missing session and oversized payload errors are deterministic.
- [x] Session `message_count` and `row_version` remain unchanged by history delivery.
- [x] File-backed restart preserves the bounded notification.
- [ ] Authenticated Odoo/Core3 desktop comparison.
- [ ] Authenticated Odoo/Core3 mobile comparison.
- [ ] True transient bus delivery and clickable HTML page links.
