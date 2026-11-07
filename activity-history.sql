-- ============================================================================
-- FAMILY PORTAL | TASK ACTIVITY HISTORY — DISPLAY NAMES
-- Run in the Supabase SQL Editor for the EXISTING memorial-planning project.
-- This migration keeps existing tasks and audit entries and replaces email
-- addresses in audit records with family_members.display_name snapshots.
-- Safe to run again; it does not recreate or erase the activity table.
-- ============================================================================

BEGIN;

-- This private schema is for the database trigger function only.
-- Never add "private" to the Data API exposed schemas.
CREATE SCHEMA IF NOT EXISTS private;

-- Create the activity table only if it does not yet exist.
CREATE TABLE IF NOT EXISTS public.task_activity (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id uuid NOT NULL,
    task_title text NOT NULL,
    action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    actor_id uuid,
    actor_name text,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    before_data jsonb,
    after_data jsonb
);

-- Add the new snapshot column to installations using the earlier version.
ALTER TABLE public.task_activity
    ADD COLUMN IF NOT EXISTS actor_name text;

CREATE INDEX IF NOT EXISTS task_activity_recent_idx
    ON public.task_activity (occurred_at DESC, id DESC);

-- Backfill existing events using the current family-member name mapping.
-- Only fill empty snapshots so that later name changes do not rewrite history.
UPDATE public.task_activity AS a
SET actor_name = COALESCE(
    (
        SELECT NULLIF(BTRIM(m.display_name), '')
        FROM public.family_members AS m
        WHERE m.user_id = a.actor_id
    ),
    CASE
        WHEN a.actor_id IS NULL THEN 'Database administrator'
        ELSE 'Former family member'
    END
)
WHERE a.actor_name IS NULL OR BTRIM(a.actor_name) = '';

-- The older audit table stored email addresses. They are no longer required.
-- Drop them rather than expose them through the existing SELECT privilege.
ALTER TABLE public.task_activity
    DROP COLUMN IF EXISTS actor_email;

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved members view task activity" ON public.task_activity;
CREATE POLICY "Approved members view task activity"
ON public.task_activity
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.family_members AS m
        WHERE m.user_id = (SELECT auth.uid())
          AND m.role IN ('admin', 'editor', 'viewer')
    )
);

-- The website may read entries; it cannot create, edit or delete audit entries.
REVOKE ALL ON TABLE public.task_activity FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.task_activity TO authenticated;
REVOKE ALL ON SEQUENCE public.task_activity_id_seq FROM PUBLIC, anon, authenticated;

-- The trigger resolves the actor from the authenticated Supabase user ID.
-- It saves the display name at event time, so old entries retain their names
-- if a member is renamed or their account is removed later.
CREATE OR REPLACE FUNCTION private.capture_task_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    acting_user uuid := auth.uid();
    acting_name text;
BEGIN
    IF acting_user IS NULL THEN
        acting_name := 'Database administrator';
    ELSE
        SELECT NULLIF(BTRIM(m.display_name), '')
        INTO acting_name
        FROM public.family_members AS m
        WHERE m.user_id = acting_user;

        acting_name := COALESCE(acting_name, 'Former family member');
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.task_activity
            (task_id, task_title, action, actor_id, actor_name, before_data, after_data)
        VALUES
            (NEW.id, NEW.title, 'created', acting_user, acting_name, NULL, to_jsonb(NEW));
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- No log entry when no task field actually changed.
        IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
            INSERT INTO public.task_activity
                (task_id, task_title, action, actor_id, actor_name, before_data, after_data)
            VALUES
                (NEW.id, NEW.title, 'updated', acting_user, acting_name,
                 to_jsonb(OLD), to_jsonb(NEW));
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.task_activity
            (task_id, task_title, action, actor_id, actor_name, before_data, after_data)
        VALUES
            (OLD.id, OLD.title, 'deleted', acting_user, acting_name,
             to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_task_activity() FROM PUBLIC, anon, authenticated;

-- Replacing the existing trigger does not alter task data or old audit events.
DROP TRIGGER IF EXISTS tasks_activity_audit ON public.tasks;
CREATE TRIGGER tasks_activity_audit
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.capture_task_activity();

COMMIT;

-- Verify: the trigger should be enabled (O) and only named actors are stored.
SELECT tgname AS trigger_name, tgenabled AS enabled
FROM pg_trigger
WHERE tgrelid = 'public.tasks'::regclass
  AND tgname = 'tasks_activity_audit';

-- Optional verification (safe read-only query):
-- SELECT actor_name, action, task_title, occurred_at
-- FROM public.task_activity ORDER BY id DESC LIMIT 20;
