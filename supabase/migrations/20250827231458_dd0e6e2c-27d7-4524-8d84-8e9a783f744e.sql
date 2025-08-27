-- Add new columns to unified_financial_transactions table
ALTER TABLE public.unified_financial_transactions 
ADD COLUMN unidad TEXT DEFAULT 'PZA' NOT NULL,
ADD COLUMN cantidad_requerida NUMERIC DEFAULT 1 NOT NULL CHECK (cantidad_requerida > 0);