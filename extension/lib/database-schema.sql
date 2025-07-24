-- ApplyToMation Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Personal Information
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'United States',
  
  -- Professional Information
  current_title TEXT,
  years_experience INTEGER,
  summary TEXT,
  skills TEXT[], -- Array of skills
  
  -- Education
  education JSONB, -- Array of education objects
  
  -- Work Experience
  experience JSONB, -- Array of work experience objects
  
  -- Documents
  resume_url TEXT,
  cover_letter_template TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create applications tracking table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Job Information
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_portal TEXT, -- linkedin, indeed, etc.
  
  -- Application Status
  status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'reviewing', 'interview', 'rejected', 'offer', 'accepted')),
  
  -- Form Data Used
  form_data JSONB, -- The data that was filled in the form
  form_fields_detected JSONB, -- What fields were detected and mapped
  
  -- Metadata
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_applications_user_id (user_id),
  INDEX idx_applications_applied_at (applied_at),
  INDEX idx_applications_status (status)
);

-- Create form templates table (for site-specific form configurations)
CREATE TABLE form_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Site Information
  site_domain TEXT NOT NULL, -- linkedin.com, indeed.com, etc.
  site_name TEXT NOT NULL,
  
  -- Form Configuration
  field_selectors JSONB NOT NULL, -- CSS selectors for different fields
  field_mappings JSONB NOT NULL, -- How to map profile data to form fields
  
  -- Template Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(site_domain, version)
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe Information
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Subscription Details
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  
  -- Usage Limits
  monthly_applications_limit INTEGER DEFAULT 10,
  applications_used_this_month INTEGER DEFAULT 0,
  
  -- Billing
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Row Level Security Policies

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Applications: Users can only access their own applications
CREATE POLICY "Users can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

-- Form templates: Read-only for all authenticated users
CREATE POLICY "Authenticated users can view form templates" ON form_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- Subscriptions: Users can only access their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for resumes and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policy for documents
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Insert default form templates for popular job sites
INSERT INTO form_templates (site_domain, site_name, field_selectors, field_mappings) VALUES
('linkedin.com', 'LinkedIn', 
 '{"firstName": ["input[name*=\"firstName\"]", "input[id*=\"firstName\"]"], "lastName": ["input[name*=\"lastName\"]", "input[id*=\"lastName\"]"], "email": ["input[type=\"email\"]"], "phone": ["input[name*=\"phone\"]", "input[type=\"tel\"]"]}',
 '{"firstName": "first_name", "lastName": "last_name", "email": "email", "phone": "phone"}'
),
('indeed.com', 'Indeed',
 '{"name": ["input[name*=\"name\"]"], "email": ["input[name*=\"email\"]"], "phone": ["input[name*=\"phone\"]"]}',
 '{"name": ["first_name", "last_name"], "email": "email", "phone": "phone"}'
),
('glassdoor.com', 'Glassdoor',
 '{"firstName": ["input[name*=\"first\"]"], "lastName": ["input[name*=\"last\"]"], "email": ["input[type=\"email\"]"], "phone": ["input[type=\"tel\"]"]}',
 '{"firstName": "first_name", "lastName": "last_name", "email": "email", "phone": "phone"}'
);

-- Create function to reset monthly usage counter
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions 
  SET applications_used_this_month = 0,
      current_period_start = CURRENT_TIMESTAMP,
      current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month'
  WHERE current_period_end < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
  usage_limit INTEGER;
  usage_current INTEGER;
BEGIN
  SELECT monthly_applications_limit, applications_used_this_month 
  INTO usage_limit, usage_current
  FROM subscriptions 
  WHERE user_id = user_uuid;
  
  RETURN (usage_current < usage_limit);
END;
$$ LANGUAGE plpgsql;