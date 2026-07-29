INSERT INTO crm_stage VALUES
  ('new', 'New', 1, false),
  ('qualified', 'Qualified', 2, false),
  ('proposition', 'Proposition', 3, false),
  ('won', 'Won', 4, false),
  ('lost', 'Lost', 5, true)
ON CONFLICT DO NOTHING;

INSERT INTO crm_partner VALUES
  ('partner-deco', 'Deco Addict', 'contact@decoaddict.example', '+1 555 0101'),
  ('partner-azure', 'Azure Interior', 'sales@azureinterior.example', '+1 555 0102'),
  ('partner-gemini', 'Gemini Furniture', 'hello@gemini.example', '+1 555 0103'),
  ('partner-lumber', 'Lumber Inc', 'office@lumber.example', '+1 555 0104'),
  ('partner-jackson', 'The Jackson Group', 'buying@jackson.example', '+1 555 0105'),
  ('partner-ready', 'Ready Mat', 'contact@readymat.example', '+1 555 0106')
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
