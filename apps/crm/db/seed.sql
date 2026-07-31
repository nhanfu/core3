INSERT INTO crm_lead(id, name, company, email, phone, source, status, notes)
VALUES
  ('lead-001', 'Website enquiry', 'Acme Corporation', 'sam@acme.test', '+1 555 0101', 'Website', 'new', 'Asked for a product demonstration.'),
  ('lead-002', 'Partner introduction', 'Globex', 'lee@globex.test', '+1 555 0102', 'Partner', 'qualified', 'Referred by an existing customer.'),
  ('lead-003', 'Conference follow-up', 'Initech', 'pat@initech.test', '+1 555 0103', 'Event', 'contacted', 'Met at the industry conference.')
ON CONFLICT(id) DO NOTHING;
