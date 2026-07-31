INSERT INTO crm_lead(id, name, company, email, phone, source, status, expected_revenue, notes)
VALUES
  ('lead-001', 'Website enquiry', 'Acme Corporation', 'sam@acme.test', '+1 555 0101', 'Website', 'new', 12000, 'Asked for a product demonstration.'),
  ('lead-002', 'Partner introduction', 'Globex', 'lee@globex.test', '+1 555 0102', 'Partner', 'qualified', 45000, 'Referred by an existing customer.'),
  ('lead-003', 'Conference follow-up', 'Initech', 'pat@initech.test', '+1 555 0103', 'Event', 'contacted', 21000, 'Met at the industry conference.')
ON CONFLICT(id) DO NOTHING;

INSERT INTO crm_catalog(id, kind, name, value)
VALUES
  ('tag-hot', 'tag', 'Hot', '#dc2626'), ('lost-price', 'lost_reason', 'Budget', ''),
  ('activity-call', 'activity_type', 'Call', ''), ('plan-followup', 'activity_plan', 'Follow up', ''),
  ('recurring-monthly', 'recurring_plan', 'Monthly', '1 month')
ON CONFLICT(id) DO NOTHING;

INSERT INTO crm_stage(id, name, sequence)
VALUES
  ('new', 'New', 10),
  ('contacted', 'Contacted', 20),
  ('qualified', 'Qualified', 30),
  ('won', 'Won', 40),
  ('lost', 'Lost', 50)
ON CONFLICT(id) DO NOTHING;

INSERT INTO crm_activity(id, lead_id, summary, activity_type, due_date, done)
VALUES
  ('activity-001', 'lead-001', 'Call about product requirements', 'call', current_date + 1, false),
  ('activity-002', 'lead-002', 'Prepare follow-up email', 'email', current_date + 2, false)
ON CONFLICT(id) DO NOTHING;

INSERT INTO crm_customer(id, name, email, phone)
VALUES
  ('customer-001', 'Acme Corporation', 'hello@acme.test', '+1 555 1001'),
  ('customer-002', 'Globex', 'hello@globex.test', '+1 555 1002')
ON CONFLICT(id) DO NOTHING;

INSERT INTO crm_team(id, name, quota)
VALUES
  ('team-001', 'North America', 250000),
  ('team-002', 'Europe', 180000)
ON CONFLICT(id) DO NOTHING;
