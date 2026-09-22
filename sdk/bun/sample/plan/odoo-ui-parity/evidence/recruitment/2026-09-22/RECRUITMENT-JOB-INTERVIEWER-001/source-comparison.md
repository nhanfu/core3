# Source comparison

| Source contract | Core3 implementation |
| --- | --- |
| `action_hr_job_interviewer` | `services/recruitment/api/openings-interviewer.yaml` action and `pages/openings-interviewer.yaml` |
| `res_model = hr.job` | `recruitment_openings` datasource |
| `view_mode = kanban,form` | Kanban-only list surface plus `pages/openings-interviewer-detail.yaml` read-only form |
| `context = {'create': False}` | No page `create_action`; no mutating API actions |
| Domain on interviewer / extended interviewer | `recruitment_opening_interviewers` join using normalized `current_user_name` |
| Interviewer `hr.job` read-only access | `recruitment.read` page/datasource; no create/update/delete action |
