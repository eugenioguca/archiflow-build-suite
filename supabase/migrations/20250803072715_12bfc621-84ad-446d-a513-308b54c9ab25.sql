-- Migration to populate payment_plans and payment_installments from existing JSON data
-- First, create function to migrate data
CREATE OR REPLACE FUNCTION migrate_payment_plans_from_json()
RETURNS void AS $$
DECLARE
    proj_record RECORD;
    plan_record RECORD;
    payment_record RECORD;
    new_plan_id UUID;
BEGIN
    -- Loop through client_projects with payment_plan data
    FOR proj_record IN 
        SELECT id, client_id, payment_plan 
        FROM client_projects 
        WHERE payment_plan IS NOT NULL 
        AND payment_plan != '{}' 
        AND payment_plan != '[]'
    LOOP
        -- Extract payment plan data from JSON
        FOR plan_record IN 
            SELECT 
                (plan->>'plan_name')::TEXT as plan_name,
                (plan->>'total_amount')::NUMERIC as total_amount,
                (plan->>'currency')::TEXT as currency,
                COALESCE((plan->>'status')::TEXT, 'active') as status,
                (plan->>'created_at')::TIMESTAMP WITH TIME ZONE as created_at,
                plan->'payments' as payments
            FROM jsonb_array_elements(proj_record.payment_plan) as plan
            WHERE plan->>'plan_name' IS NOT NULL
        LOOP
            -- Insert into payment_plans table
            INSERT INTO payment_plans (
                client_project_id,
                plan_name,
                total_amount,
                currency,
                status,
                start_date,
                created_at
            ) VALUES (
                proj_record.id,
                COALESCE(plan_record.plan_name, 'Plan de Pago'),
                COALESCE(plan_record.total_amount, 0),
                COALESCE(plan_record.currency, 'MXN'),
                plan_record.status,
                COALESCE(plan_record.created_at::DATE, CURRENT_DATE),
                COALESCE(plan_record.created_at, now())
            ) RETURNING id INTO new_plan_id;
            
            -- Insert payments as installments if they exist
            IF plan_record.payments IS NOT NULL THEN
                FOR payment_record IN 
                    SELECT 
                        (payment->>'installment_number')::INTEGER as installment_number,
                        (payment->>'amount')::NUMERIC as amount,
                        (payment->>'due_date')::DATE as due_date,
                        (payment->>'paid_date')::TIMESTAMP WITH TIME ZONE as paid_date,
                        COALESCE((payment->>'status')::TEXT, 'pending') as status,
                        (payment->>'description')::TEXT as description,
                        (payment->>'reference_number')::TEXT as reference_number
                    FROM jsonb_array_elements(plan_record.payments) as payment
                    WHERE payment->>'amount' IS NOT NULL
                LOOP
                    INSERT INTO payment_installments (
                        payment_plan_id,
                        installment_number,
                        amount,
                        due_date,
                        paid_date,
                        status,
                        description,
                        reference_number
                    ) VALUES (
                        new_plan_id,
                        COALESCE(payment_record.installment_number, 1),
                        payment_record.amount,
                        COALESCE(payment_record.due_date, CURRENT_DATE),
                        payment_record.paid_date,
                        payment_record.status,
                        payment_record.description,
                        payment_record.reference_number
                    );
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Payment plans migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_payment_plans_from_json();

-- Drop the migration function after use
DROP FUNCTION migrate_payment_plans_from_json();