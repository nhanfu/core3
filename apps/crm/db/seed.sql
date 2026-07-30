INSERT INTO crm_stage (id, name, sequence, folded) VALUES
  ('new', 'New', 1, false),
  ('qualified', 'Qualified', 2, false),
  ('proposition', 'Proposition', 3, false),
  ('won', 'Won', 4, false),
  ('lost', 'Lost', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_lost_reason VALUES
  ('lost-price', 'Too expensive'),
  ('lost-timing', 'Timing'),
  ('lost-competitor', 'Lost to competitor')
ON CONFLICT DO NOTHING;

INSERT INTO crm_config VALUES
  ('use_leads', 'true'),
  ('use_recurring_revenues', 'false'),
  ('auto_assign_leads', 'false')
ON CONFLICT DO NOTHING;

INSERT INTO crm_activity_type VALUES
  ('activity-call', 'Call', 'Call customer', true),
  ('activity-email', 'Email', 'Send an email', true),
  ('activity-meeting', 'Meeting', 'Schedule a meeting', true),
  ('activity-todo', 'To-do', 'Complete a task', true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_activity_plan VALUES
  ('plan-new-lead', 'New lead follow-up', true),
  ('plan-renewal', 'Renewal follow-up', true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_recurring_plan VALUES
  ('recurring-monthly', 'Monthly', 1, 'month', true),
  ('recurring-quarterly', 'Quarterly', 3, 'month', true),
  ('recurring-yearly', 'Yearly', 1, 'year', true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_partner VALUES
  ('partner-deco', 'Deco Addict', 'contact@decoaddict.example', '+1 555 0101'),
  ('partner-azure', 'Azure Interior', 'sales@azureinterior.example', '+1 555 0102'),
  ('partner-gemini', 'Gemini Furniture', 'hello@gemini.example', '+1 555 0103'),
  ('partner-lumber', 'Lumber Inc', 'office@lumber.example', '+1 555 0104'),
  ('partner-jackson', 'The Jackson Group', 'buying@jackson.example', '+1 555 0105'),
  ('partner-ready', 'Ready Mat', 'contact@readymat.example', '+1 555 0106')
ON CONFLICT DO NOTHING;

INSERT INTO res_user VALUES
  ('user-mitchell', 'Mitchell Admin', 'mitchell@example.com', true),
  ('user-marc', 'Marc Demo', 'marc@example.com', true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_team(id, name, quota, active) VALUES
  ('team-na', 'North America', 250000, true),
  ('team-eu', 'Europe', 180000, true),
  ('team-apac', 'Asia Pacific', 120000, true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_team_member VALUES
  ('team-na', 'user-mitchell'), ('team-eu', 'user-marc'), ('team-apac', 'user-mitchell')
ON CONFLICT DO NOTHING;

INSERT INTO crm_tag VALUES
  ('tag-warm', 'Warm', 'orange'),
  ('tag-design', 'Design', 'purple'),
  ('tag-services', 'Services', 'blue'),
  ('tag-priority', 'Priority', 'red'),
  ('tag-renewal', 'Renewal', 'green'),
  ('tag-recurring', 'Recurring', 'teal'),
  ('tag-retail', 'Retail', 'yellow'),
  ('tag-large', 'Large', 'red'),
  ('tag-integration', 'Integration', 'blue'),
  ('tag-inbound', 'Inbound', 'green'),
  ('tag-referral', 'Referral', 'purple')
ON CONFLICT DO NOTHING;

INSERT INTO crm_lead (id, name, type, stage_id, partner_name, salesperson, expected_revenue, priority, tags, next_activity) VALUES
  ('opp-001', 'Office refurbishment', 'opportunity', 'new', 'Deco Addict', 'Mitchell Admin', 12500, 2, 'Warm,Design', 'Call tomorrow'),
  ('opp-002', 'Cloud migration', 'opportunity', 'new', 'Azure Interior', 'Marc Demo', 32000, 1, 'Services', 'Email quote'),
  ('opp-003', 'Fleet renewal', 'opportunity', 'qualified', 'Gemini Furniture', 'Marc Demo', 18500, 3, 'Priority,Renewal', 'Meeting Friday'),
  ('opp-004', 'Annual support contract', 'opportunity', 'qualified', 'Lumber Inc', 'Mitchell Admin', 7600, 1, 'Recurring', 'Send proposal'),
  ('opp-005', 'Retail rollout', 'opportunity', 'proposition', 'The Jackson Group', 'Marc Demo', 45000, 2, 'Retail,Large', 'Follow up'),
  ('opp-006', 'ERP integration', 'opportunity', 'won', 'Ready Mat', 'Mitchell Admin', 22000, 0, 'Integration', 'Onboarding')
ON CONFLICT DO NOTHING;

INSERT INTO crm_lead (id, name, type, stage_id, partner_name, salesperson, expected_revenue, priority, tags, next_activity) VALUES
  ('lead-001', 'Website inquiry', 'lead', 'new', 'Deco Addict', '', 0, 1, 'Inbound', 'Qualify this week'),
  ('lead-002', 'Partner referral', 'lead', 'qualified', 'Gemini Furniture', 'Marc Demo', 0, 0, 'Referral', 'Call next week')
ON CONFLICT DO NOTHING;

INSERT INTO crm_message (id, lead_id, author, body) VALUES
  ('message-001', 'opp-001', 'Mitchell Admin', 'Customer requested a revised delivery timeline.'),
  ('message-002', 'opp-003', 'Marc Demo', 'Follow up after the fleet review meeting.')
ON CONFLICT DO NOTHING;

INSERT INTO crm_activity (id, lead_id, activity_type, summary, due_date) VALUES
  ('activity-001', 'opp-001', 'Call', 'Call customer about timeline', current_date + INTERVAL 1 DAY),
  ('activity-002', 'opp-003', 'Meeting', 'Fleet review meeting', current_date + INTERVAL 3 DAY),
  ('activity-003', 'opp-005', 'Email', 'Send final proposal', current_date + INTERVAL 2 DAY)
ON CONFLICT DO NOTHING;
