
-- Ajouter les colonnes manquantes à la table portfolios
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS cv_url TEXT;
