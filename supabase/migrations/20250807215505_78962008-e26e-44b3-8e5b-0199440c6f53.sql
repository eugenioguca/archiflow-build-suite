-- Deshabilitar acceso público a la vista materializada desde la API por seguridad
REVOKE ALL ON public.financial_summary_by_client_project FROM PUBLIC;
REVOKE ALL ON public.financial_summary_by_client_project FROM anon;
REVOKE ALL ON public.financial_summary_by_client_project FROM authenticated;

-- Solo permitir acceso a roles de servicio
GRANT SELECT ON public.financial_summary_by_client_project TO service_role;