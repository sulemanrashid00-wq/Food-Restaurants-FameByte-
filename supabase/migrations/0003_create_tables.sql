DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'table_status') THEN
        CREATE TYPE table_status AS ENUM ('Available', 'Occupied', 'Reserved');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INT NOT NULL UNIQUE,
    seating_capacity INT NOT NULL DEFAULT 4 CHECK (seating_capacity > 0),
    status table_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can manage tables" ON public.tables;

CREATE POLICY "Authenticated users can read tables"
    ON public.tables FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage tables"
    ON public.tables FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );