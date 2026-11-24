-- Family Portal: confirmed cost + Nigerian Naira display update
-- IMPORTANT: Export the current tasks as CSV before running.
-- No existing tasks, auth users, or policies are deleted.
-- Existing `actual` is a calculated legacy field, not a confirmed cost.
-- We preserve it and introduce a separate nullable confirmed amount.
BEGIN;

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS confirmed_actual_cost numeric;

-- Optional final cost must never be negative.
ALTER TABLE public.tasks
    DROP CONSTRAINT IF EXISTS tasks_confirmed_actual_cost_nonnegative;
ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_confirmed_actual_cost_nonnegative
    CHECK (confirmed_actual_cost IS NULL OR confirmed_actual_cost >= 0);

-- Replace existing calculation function used by tasks_calculate_actual.
-- The legacy `actual` is maintained for compatibility but the updated UI
-- uses confirmed_actual_cost and outstanding_balance instead.
CREATE OR REPLACE FUNCTION public.calculate_task_actual()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    calculation_basis numeric;
BEGIN
    IF NEW.budget IS NULL OR NEW.part_payment IS NULL
       OR NEW.budget < 0 OR NEW.part_payment < 0
       OR (NEW.confirmed_actual_cost IS NOT NULL AND NEW.confirmed_actual_cost < 0) THEN
        RAISE EXCEPTION 'Estimated budget, payment made and confirmed actual cost must be nonnegative';
    END IF;

    calculation_basis := COALESCE(NEW.confirmed_actual_cost, NEW.budget);
    NEW.outstanding_balance := GREATEST(0, calculation_basis - NEW.part_payment);
    NEW.actual := NEW.part_payment + NEW.outstanding_balance;
    RETURN NEW;
END;
$$;

-- Backfill derived balances; the existing AFTER UPDATE audit trigger will log
-- actual changes. No user-entered final costs are presumed from legacy values.
UPDATE public.tasks
SET budget = budget
WHERE confirmed_actual_cost IS NULL;

COMMIT;

SELECT title, budget AS estimated_budget,
       confirmed_actual_cost AS "Actual Cost",
       part_payment AS payment_made,
       outstanding_balance
FROM public.tasks
ORDER BY title;
