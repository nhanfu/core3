# Source comparison

| Odoo behavior | Core3 implementation | Classification |
| --- | --- | --- |
| Project form Share Project header button | project-detail manager-only header action | implemented |
| action_open_share_project_wizard | share_project server_form in project-detail API | implemented |
| Collaborator access modes | Read, Edit with limited access, and Edit modal options | bounded implementation |
| Invitation intent | Durable send_invitation boolean on project_shares | bounded implementation |
| Project privacy/active/template eligibility | Migration default plus SQL share guards | implemented |
| Share link | Deterministic /my/projects/detail?id=project projection | bounded implementation |
| Email delivery and portal-user provisioning | Not implemented in this stable-ID slice | follow-up |
| Collaborator removal and full project-sharing client | Not implemented in this stable-ID slice | follow-up |
