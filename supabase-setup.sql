-- Supabase Setup Script for Zero Risk Agent
-- Run this in your Supabase SQL Editor

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'other',
    organization TEXT,
    notes TEXT,
    hospital_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints
ALTER TABLE contacts ADD CONSTRAINT contacts_name_check CHECK (length(name) > 0);
ALTER TABLE contacts ADD CONSTRAINT contacts_contact_check CHECK (phone IS NOT NULL OR email IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_hospital_id ON contacts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING GIN (to_tsvector('english', name || ' ' || COALESCE(organization, '') || ' ' || COALESCE(email, '')));

-- Enable Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read/write their own data
CREATE POLICY IF NOT EXISTS "Users can manage their contacts" ON contacts
    FOR ALL USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update timestamp on every update
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO contacts (name, phone, email, role, organization) VALUES
('ESIC Regional Office Mumbai', '9876543210', 'esic.mumbai@gov.in', 'payer_contact', 'ESIC'),
('CGHS Delhi Office', '9876543211', 'cghs.delhi@nic.in', 'payer_contact', 'CGHS'),
('Hospital Claims Department', '9876543212', 'claims@hospital.com', 'hospital_contact', 'Main Hospital')
ON CONFLICT DO NOTHING;

-- Check if table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'contacts' 
ORDER BY ordinal_position;