-- 1. Seed Menu Items
INSERT INTO public.menu_items (name, price, category, image_url, is_available) VALUES
('Peanut Butter Chicken Burger', 220.00, 'Main Course', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800', true),
('Texas Style BBQ Burger', 210.00, 'Main Course', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800', true),
('The Country Style Hamburger', 170.00, 'Main Course', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800', true),
('The Legendary Burger', 190.00, 'Main Course', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=800', true),
('Crispy Garlic Wings', 150.00, 'Starters', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&q=80&w=800', true),
('Fresh Mint Mojito', 85.00, 'Beverages', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800', true),
('Caramel Lava Cake', 130.00, 'Desserts', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800', true);

-- 2. Seed Restaurant Floor Tables
INSERT INTO public.tables (table_number, seating_capacity, status) VALUES
(1, 2, 'Available'),
(2, 4, 'Occupied'),
(3, 4, 'Available'),
(4, 6, 'Reserved'),
(5, 8, 'Available'),
(6, 2, 'Occupied')
ON CONFLICT (table_number) DO NOTHING;