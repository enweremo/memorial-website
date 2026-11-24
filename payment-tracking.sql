-- Family Portal: cumulative part payments and outstanding balances
-- Execute ONCE in the existing Supabase SQL Editor before publishing files.
-- Leaves existing tables, users, RLS and audit triggers in place.
-- Existing actual values are treated as amounts already paid; verify them.
BEGIN;

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS part_payment numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS outstanding_balance numeric NOT NULL DEFAULT 0;

-- Preserve legacy "actual spending" values as total already paid.
-- No outstanding amounts are invented for existing tasks.
UPDATE public.tasks
SET part_payment = actual,
    outstanding_balance = 0
WHERE part_payment = 0 AND outstanding_balance = 0 AND actual <> 0;

-- Every insert/update sets Actual = Paid + Outstanding, even if a client
-- sends a different amount. The existing activity trigger still works.
CREATE OR REPLACE FUNCTION public.calculate_task_actual()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.part_payment < 0 OR NEW.outstanding_balance < 0 THEN
        RAISE EXCEPTION 'Payment amounts must not be negative';
    END IF;
    NEW.actual := NEW.part_payment + NEW.outstanding_balance;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.tasks'::regclass
          AND tgname = 'tasks_calculate_actual'
    ) THEN
        CREATE TRIGGER tasks_calculate_actual
        BEFORE INSERT OR UPDATE ON public.tasks
        FOR EACH ROW EXECUTE FUNCTION public.calculate_task_actual();
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_task_actual() FROM PUBLIC, anon, authenticated;

COMMIT;

-- Optional verification
SELECT title, budget, part_payment, outstanding_balance, actual
FROM public.tasks ORDER BY created_at DESC LIMIT 20;
