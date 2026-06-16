
-- Add validation fields to nfc_cards table
ALTER TABLE public.nfc_cards 
ADD COLUMN is_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE;
