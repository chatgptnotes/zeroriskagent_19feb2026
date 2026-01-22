-- Follow-up Master System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- 1. Follow-ups table
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('missing_documents', 'appeal_deadline', 'payment_overdue', 'verification_pending', 'escalation', 'custom')),
  priority_score INTEGER NOT NULL DEFAULT 5 CHECK (priority_score BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  assigned_to UUID DEFAULT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT NOT NULL,
  action_required TEXT NOT NULL,
  contact_person TEXT DEFAULT NULL,
  contact_phone TEXT DEFAULT NULL,
  contact_email TEXT DEFAULT NULL,
  whatsapp_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  phone_attempted BOOLEAN DEFAULT FALSE,
  last_contact_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  next_follow_up_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  escalation_level INTEGER DEFAULT 1,
  resolution_notes TEXT DEFAULT NULL,
  auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Communication logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('whatsapp', 'email', 'sms', 'phone', 'in_person')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  recipient TEXT NOT NULL,
  subject TEXT DEFAULT NULL,
  message_content TEXT NOT NULL,
  template_used TEXT DEFAULT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'read', 'replied', 'failed', 'bounced')),
  delivery_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  read_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  reply_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  reply_content TEXT DEFAULT NULL,
  external_message_id TEXT DEFAULT NULL,
  cost_inr DECIMAL(10,2) DEFAULT NULL,
  attachment_urls TEXT[] DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE DEFAULT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('missing_documents', 'appeal_deadline', 'payment_overdue', 'verification_pending', 'escalation', 'custom')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'multi_channel')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr', 'gu', 'te', 'ta', 'kn')),
  subject TEXT DEFAULT NULL,
  message_content TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Escalation rules table
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL DEFAULT 'all' CHECK (claim_type IN ('inpatient', 'outpatient', 'daycare', 'diagnostic', 'pharmacy', 'all')),
  payer_type TEXT NOT NULL DEFAULT 'all' CHECK (payer_type IN ('esic', 'cghs', 'echs', 'state_govt', 'private_insurance', 'corporate', 'all')),
  trigger_condition TEXT NOT NULL CHECK (trigger_condition IN ('days_overdue', 'amount_threshold', 'status_change', 'no_response')),
  trigger_value INTEGER NOT NULL,
  escalation_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_claim_id ON follow_ups(claim_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_hospital_id ON follow_ups(hospital_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_priority_score ON follow_ups(priority_score);

CREATE INDEX IF NOT EXISTS idx_communication_logs_follow_up_id ON communication_logs(follow_up_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_claim_id ON communication_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_type ON communication_logs(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_created_at ON communication_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_message_templates_hospital_id ON message_templates(hospital_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_hospital_id ON escalation_rules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active);

-- 6. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_logs_updated_at BEFORE UPDATE ON communication_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert some sample message templates to get started
INSERT INTO message_templates (name, category, channel, language, subject, message_content, variables, created_by) VALUES
-- WhatsApp Templates
('Missing Documents Reminder', 'missing_documents', 'whatsapp', 'en', NULL, 
 'Dear {{contactPerson}}, your claim {{claimNumber}} requires additional documents. Amount: ₹{{claimedAmount}}. Please submit the missing documents within 7 days to avoid delays. Contact: {{hospitalContact}}', 
 ARRAY['contactPerson', 'claimNumber', 'claimedAmount', 'hospitalContact'], 
 '00000000-0000-0000-0000-000000000000'),

('Payment Overdue Alert', 'payment_overdue', 'whatsapp', 'en', NULL,
 'URGENT: Payment for claim {{claimNumber}} is overdue by {{overdueDays}} days. Amount: ₹{{outstandingAmount}}. Please expedite processing. Hospital: {{hospitalName}}',
 ARRAY['claimNumber', 'overdueDays', 'outstandingAmount', 'hospitalName'],
 '00000000-0000-0000-0000-000000000000'),

('Appeal Deadline Reminder', 'appeal_deadline', 'whatsapp', 'en', NULL,
 'Appeal deadline approaching for claim {{claimNumber}}. {{daysLeft}} days remaining. Amount at risk: ₹{{claimAmount}}. Action required immediately. Contact: {{contactNumber}}',
 ARRAY['claimNumber', 'daysLeft', 'claimAmount', 'contactNumber'],
 '00000000-0000-0000-0000-000000000000'),

-- Email Templates
('Formal Document Request', 'missing_documents', 'email', 'en', 
 'Document Request - Claim {{claimNumber}}',
 '<h2>Document Request for Claim Processing</h2>
  <p>Dear {{contactPerson}},</p>
  <p>We are writing to request additional documentation for claim <strong>{{claimNumber}}</strong> submitted by <strong>{{hospitalName}}</strong>.</p>
  
  <div class="alert">
    <h3>Claim Details:</h3>
    <ul>
      <li><strong>Claim Number:</strong> {{claimNumber}}</li>
      <li><strong>Claimed Amount:</strong> ₹{{claimedAmount}}</li>
      <li><strong>Patient:</strong> {{patientName}}</li>
      <li><strong>Date of Service:</strong> {{serviceDate}}</li>
    </ul>
  </div>
  
  <p><strong>Required Documents:</strong></p>
  <ul>
    <li>{{requiredDocs}}</li>
  </ul>
  
  <p>Please submit the above documents within <strong>7 business days</strong> to avoid processing delays.</p>
  
  <p>For questions, contact us at {{hospitalContact}} or reply to this email.</p>
  
  <p>Best regards,<br>{{hospitalName}} Claims Department</p>',
 ARRAY['contactPerson', 'claimNumber', 'hospitalName', 'claimedAmount', 'patientName', 'serviceDate', 'requiredDocs', 'hospitalContact'],
 '00000000-0000-0000-0000-000000000000'),

('Payment Follow-up Email', 'payment_overdue', 'email', 'en',
 'URGENT: Payment Overdue - Claim {{claimNumber}}',
 '<h2 style="color: #dc3545;">Payment Overdue Notice</h2>
  <p>Dear Payment Processing Team,</p>
  
  <div class="alert" style="background-color: #f8d7da; padding: 15px; border-radius: 6px;">
    <h3>Overdue Payment Alert</h3>
    <p><strong>Claim Number:</strong> {{claimNumber}}</p>
    <p><strong>Outstanding Amount:</strong> ₹{{outstandingAmount}}</p>
    <p><strong>Days Overdue:</strong> {{overdueDays}} days</p>
    <p><strong>Original Due Date:</strong> {{originalDueDate}}</p>
  </div>
  
  <p>This claim has been pending payment for <strong>{{overdueDays}} days</strong> beyond the standard processing time. We request immediate attention to expedite the payment process.</p>
  
  <p><strong>Hospital Details:</strong></p>
  <ul>
    <li>Hospital: {{hospitalName}}</li>
    <li>Contact: {{hospitalContact}}</li>
    <li>Reference: {{hospitalClaimId}}</li>
  </ul>
  
  <p>Please prioritize this payment or provide a status update within 48 hours.</p>
  
  <p>Thank you for your prompt attention to this matter.</p>
  
  <p>Regards,<br>{{hospitalName}} Revenue Recovery Team</p>',
 ARRAY['claimNumber', 'outstandingAmount', 'overdueDays', 'originalDueDate', 'hospitalName', 'hospitalContact', 'hospitalClaimId'],
 '00000000-0000-0000-0000-000000000000');

-- 8. Insert some sample escalation rules
INSERT INTO escalation_rules (hospital_id, claim_type, payer_type, trigger_condition, trigger_value, escalation_sequence, created_by) VALUES
-- Rule for high-value overdue payments
('00000000-0000-0000-0000-000000000000', 'all', 'esic', 'days_overdue', 30, 
 '[{"step": 1, "action": "whatsapp", "template": "Payment Overdue Alert", "delay_hours": 0}, 
   {"step": 2, "action": "email", "template": "Payment Follow-up Email", "delay_hours": 72}, 
   {"step": 3, "action": "escalation", "contact": "supervisor", "delay_hours": 168}]'::jsonb, 
 '00000000-0000-0000-0000-000000000000'),

-- Rule for missing documents
('00000000-0000-0000-0000-000000000000', 'all', 'all', 'no_response', 7,
 '[{"step": 1, "action": "whatsapp", "template": "Missing Documents Reminder", "delay_hours": 0},
   {"step": 2, "action": "email", "template": "Formal Document Request", "delay_hours": 48}]'::jsonb,
 '00000000-0000-0000-0000-000000000000');

-- Success message
SELECT 'Follow-up Master System tables created successfully!' as message;
SELECT 'Sample templates and rules inserted!' as message;
SELECT 'You can now use the Follow-up Dashboard at /followups' as message;