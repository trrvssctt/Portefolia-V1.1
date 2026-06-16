
-- Ajouter la colonne is_active à la table portfolios
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ajouter la colonne is_active à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
