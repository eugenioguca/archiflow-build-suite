-- Eliminar las dos facturas CFDI directamente
DELETE FROM public.cfdi_documents 
WHERE id IN (
  '275e32f8-6879-48a8-8755-84087b0c602e',
  'e43297ee-9ddb-46e8-9d97-085f790a84b5'
);