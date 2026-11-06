-- Execute in Supabase SQL Editor using a trusted administrator session.
-- Authorization is enforced by PostgreSQL RLS; never place credentials or private task data in the GitHub repo.
create extension if not exists pgcrypto;
create table if not exists public.family_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','editor','viewer')),
 added_at timestamptz not null default now()
);
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 160),
 category text not null,
 status text not null default 'Not started' check(status in ('Not started','In progress','Blocked','Completed')),
 assigned_to text,
 due_date date,
 budget numeric(12,2) not null default 0 check(budget>=0),
 actual numeric(12,2) not null default 0 check(actual>=0),
 notes text,
 created_at timestamptz not null default now(),
 constraint notes_len check(notes is null or length(notes)<=3000)
);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_category on public.tasks(category);
alter table public.family_members enable row level security;
alter table public.tasks enable row level security;
-- Restrict database privileges in addition to using RLS.
revoke all on public.family_members from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
grant select on public.family_members to authenticated;
grant select,insert,update on public.tasks to authenticated;
-- A signed-in user can read only their own approved role, never insert or edit membership.
create policy "Members read own approval" on public.family_members for select to authenticated
 using (user_id=(select auth.uid()));
-- Membership reads are protected by the above policy; EXISTS returns only the caller's row.
create policy "Approved members view tasks" on public.tasks for select to authenticated
 using (exists (select 1 from public.family_members m where m.user_id=(select auth.uid())));
create policy "Coordinators create tasks" on public.tasks for insert to authenticated
 with check (exists (select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.role in ('admin','editor')));
create policy "Coordinators update tasks" on public.tasks for update to authenticated
 using (exists (select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.role in ('admin','editor')))
 with check (exists (select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.role in ('admin','editor')));
-- After creating an Auth user in Supabase dashboard, approve using SQL Editor:
-- insert into public.family_members(user_id,role) values ('USER_UUID_FROM_AUTH_USERS','admin');
-- For other invited members choose 'editor' or 'viewer'.
-- No member-management writes are exposed to the browser.
