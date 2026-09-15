-- 1. Create Menu Categories Enum
CREATE TYPE menu_category AS ENUM ('Starters', 'Main Course', 'Beverages', 'Desserts');

-- 2. Create menu_items Table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category menu_category NOT NULL,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Anyone authenticated (Admin or Staff) can view available menu items to take orders
CREATE POLICY "Authenticated users can read menu items"
    ON public.menu_items
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. RLS Policy: Only Admin can insert, update, or soft-delete menu items
CREATE POLICY "Admins can insert menu items"
    ON public.menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

CREATE POLICY "Admins can update menu items"
    ON public.menu_items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );