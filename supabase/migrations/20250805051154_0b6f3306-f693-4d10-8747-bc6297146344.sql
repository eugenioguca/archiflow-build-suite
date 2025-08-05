CREATE OR REPLACE FUNCTION public.create_payment_plan_from_sales(p_client_project_id uuid, p_plan_name text, p_total_amount numeric, p_currency text DEFAULT 'MXN'::text, p_installments_data jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_plan_id UUID;
  v_installment JSONB;
BEGIN
  -- Create payment plan
  INSERT INTO public.payment_plans (
    client_project_id,
    plan_name,
    total_amount,
    currency,
    status,
    start_date,
    created_by
  ) VALUES (
    p_client_project_id,
    p_plan_name,
    p_total_amount,
    p_currency,
    'active',
    CURRENT_DATE,
    (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  ) RETURNING id INTO v_plan_id;
  
  -- Create installments if provided
  FOR v_installment IN SELECT * FROM jsonb_array_elements(p_installments_data)
  LOOP
    INSERT INTO public.payment_installments (
      payment_plan_id,
      installment_number,
      amount,
      due_date,
      status,
      description
    ) VALUES (
      v_plan_id,
      (v_installment->>'installment_number')::INTEGER,
      (v_installment->>'amount')::NUMERIC,
      (v_installment->>'due_date')::DATE,
      COALESCE(v_installment->>'status', 'pending'),
      v_installment->>'description'
    );
  END LOOP;
  
  RETURN v_plan_id;
END;
$function$;