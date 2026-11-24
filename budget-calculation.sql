-- Family planning: calculated outstanding and actual budget.
-- Run once in Supabase SQL Editor BEFORE deploying updated site files.
-- This changes the meaning of outstanding_balance:
--   Outstanding = max(0, Estimated Budget - Payment Made)
--   Actual Budget = Payment Made + Outstanding
-- Existing manually entered outstanding balances will be REPLACED.
-- Export or back up tasks first if you need to preserve those values.
-- Keeps the same columns, users, permissions, and audit trigger.
BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_task_actual()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.budget IS NULL OR NEW.part_payment IS NULL
       OR NEW.budget < 0 OR NEW.part_payment < 0 THEN
        RAISE EXCEPTION 'Budget and payment made must be nonnegative';
    END IF;
    NEW.outstanding_balance := GREATEST(0, NEW.budget - NEW.part_payment);
    NEW.actual := NEW.part_payment + NEW.outstanding_balance;
    RETURN NEW;
END;
$$;

-- The existing BEFORE INSERT/UPDATE trigger tasks_calculate_actual
-- uses this replaced function. Recalculate existing task records.
UPDATE public.tasks SET budget = budget;

COMMIT;

SELECT title, budget AS estimated_budget,
       part_payment AS payment_made,
       outstanding_balance AS outstanding,
       actual AS actual_budget
FROM public.tasks ORDER BY title;
