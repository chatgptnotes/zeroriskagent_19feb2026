-- Simple Supabase Setup for Zero Risk Agent
-- Copy and paste this in your Supabase SQL Editor and run it

-- Create contacts table (simple version)
CREATE TABLE contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT DEFAULT 'other',
    organization TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add basic constraints
ALTER TABLE contacts ADD CONSTRAINT contacts_name_not_empty CHECK (length(trim(name)) > 0);
ALTER TABLE contacts ADD CONSTRAINT contacts_need_contact CHECK (phone IS NOT NULL OR email IS NOT NULL);

-- Create basic indexes for better performance
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_role ON contacts(role);
CREATE INDEX idx_contacts_created ON contacts(created_at);

-- Insert sample data for testing
INSERT INTO contacts (name, phone, email, role, organization) VALUES
('ESIC Regional Office Mumbai', '9876543210', 'esic.mumbai@gov.in', 'payer_contact', 'ESIC'),
('CGHS Delhi Office', '9876543211', 'cghs.delhi@nic.in', 'payer_contact', 'CGHS'),
('Hospital Claims Department', '9876543212', 'claims@hospital.com', 'hospital_contact', 'Main Hospital');

-- Check if everything was created successfully
SELECT 'Table created successfully!' AS status;
SELECT COUNT(*) AS sample_contacts_added FROM contacts;