-- Remove all mock data inserted previously

-- Delete mock treasury transactions
DELETE FROM public.treasury_transactions 
WHERE description LIKE '%Ejemplo%' 
   OR description LIKE '%Depósito inicial%'
   OR description LIKE '%Compra de materiales%'
   OR description LIKE '%Pago a proveedor%'
   OR description LIKE '%Gasto de oficina%';

-- Delete mock bank accounts
DELETE FROM public.bank_accounts 
WHERE account_holder LIKE '%Banco Ejemplo%'
   OR bank_name LIKE '%Banco Nacional%'
   OR bank_name LIKE '%Banco Regional%'
   OR account_number IN ('1234567890', '0987654321');

-- Delete mock cash accounts  
DELETE FROM public.cash_accounts
WHERE name LIKE '%Caja Chica%'
   OR name LIKE '%Efectivo Obra%'
   OR name LIKE '%Oficina Principal%'
   OR name LIKE '%Proyecto Alpha%';

-- Verify tables are clean
-- The tables should now be empty and ready for real data