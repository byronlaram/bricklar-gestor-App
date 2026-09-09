-- Migration: Create directory_contacts table
-- Description: Central directory for Clientes, Proveedores e Instituciones y Otros

CREATE TABLE IF NOT EXISTS public.directory_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('customer', 'provider', 'institution_other')),
    contact_person TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    address_reference TEXT,
    maps_url TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    default_task_type TEXT,
    default_financial_type TEXT DEFAULT 'none' CHECK (default_financial_type IN ('none', 'collection', 'payment')),
    default_currency TEXT DEFAULT 'NIO' CHECK (default_currency IN ('NIO', 'USD')),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_directory_contacts_category ON public.directory_contacts(category);
CREATE INDEX IF NOT EXISTS idx_directory_contacts_name ON public.directory_contacts(name);
CREATE INDEX IF NOT EXISTS idx_directory_contacts_is_active ON public.directory_contacts(is_active);

-- Enable RLS
ALTER TABLE public.directory_contacts ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read
CREATE POLICY "directory_contacts_select_policy"
    ON public.directory_contacts
    FOR SELECT
    TO authenticated
    USING (true);

-- Policies: Authenticated users / admins can insert
CREATE POLICY "directory_contacts_insert_policy"
    ON public.directory_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policies: Authenticated users / admins can update
CREATE POLICY "directory_contacts_update_policy"
    ON public.directory_contacts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policies: Authenticated users / admins can delete
CREATE POLICY "directory_contacts_delete_policy"
    ON public.directory_contacts
    FOR DELETE
    TO authenticated
    USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_directory_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_directory_contacts_updated_at ON public.directory_contacts;
CREATE TRIGGER trigger_directory_contacts_updated_at
    BEFORE UPDATE ON public.directory_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_directory_contacts_updated_at();
