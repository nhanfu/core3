# Source comparison

Odoo 19 source revision: `659759969d535d286b656c96b675e4612b925ddd`.

| Odoo source contract | Core3 bounded mapping |
| --- | --- |
| `hr_applicant_views.xml:92-93` renders `Create Employee` for an active applicant with no employee and a closed date | Applicant detail header action shows for `Hired` applicants without `employee_id`; `employees.write` is required |
| `hr_applicant.py:998-1027` checks interviewer access, creates an employee, maps applicant/contact/job/company fields, and opens the employee | YAML guard requires actor/company/current Hired state, inserts the existing Employees row, links the applicant, and navigates to `/employees/detail` |
| `hr_applicant.py:1029-1053` maps name, work contact, private/contact fields, job, department, email and phone | Bounded field mapping persists applicant name, email, phone, department, job title, company, hire date, and deterministic employee number |

The adaptation intentionally excludes Odoo's partner/contact creation,
attachment-copy behavior, and the full employee private-address model because
those are separate Base/Employees boundaries. The durable applicant link and
employee record are included so reload and restart prove the result.
