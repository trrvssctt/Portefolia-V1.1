
-- Insérer ou mettre à jour le profil admin pour ndiayemama868@gmail.com
INSERT INTO public.profiles (id, email, first_name, last_name, role, is_active)
VALUES (
  '88f32366-b052-45ce-9b00-12b093713ed9',
  'ndiayemama868@gmail.com',
  'Admin',
  'User',
  'admin',
  true
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  email = 'ndiayemama868@gmail.com';

-- Ajouter les colonnes pour la bannière personnalisable dans la table portfolios
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS banner_type VARCHAR(20) DEFAULT 'color',
ADD COLUMN IF NOT EXISTS banner_image_url TEXT,
ADD COLUMN IF NOT EXISTS banner_color VARCHAR(7) DEFAULT '#1e293b';
