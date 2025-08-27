-- Rename monto to precio_unitario and add monto_total column
ALTER TABLE public.unified_financial_transactions RENAME COLUMN monto TO precio_unitario;
ALTER TABLE public.unified_financial_transactions ADD COLUMN monto_total NUMERIC DEFAULT 0 NOT NULL;