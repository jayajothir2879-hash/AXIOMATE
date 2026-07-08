-- supabase/schema.sql
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Requires no extensions beyond what Supabase ships with by default.

-- ---------------------------------------------------------------------------
-- PROFILES
-- One row per Supabase Auth user (auth.users). Holds everything the app
-- needs about a person beyond email/password, which Supabase Auth already
-- manages for us.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  emp_code      text unique,
  name          text not null,
  email         text not null,
  role          text not null default 'Employee' check (role in ('Admin','Project Manager','Employee')),
  department    text,
  designation   text,
  phone         text,
  join_date     date default current_date,
  avatar_url    text,
  two_factor    boolean default false,
  created_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by any authenticated user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up via supabase.auth.signUp().
-- Reads `name` and `role` out of the signup call's `options.data` metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_code text;
begin
  select 'EMP-' || lpad((count(*) + 1)::text, 3, '0') into next_code from public.profiles;
  insert into public.profiles (id, emp_code, name, email, role)
  values (
    new.id,
    next_code,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Employee')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id                  bigint generated always as identity primary key,
  client_code         text unique,
  name                text not null,
  company             text,
  contact_person      text,
  email               text,
  phone               text,
  project_count       int default 0,
  active_projects     int default 0,
  completed_projects  int default 0,
  risk_level          text default 'Low' check (risk_level in ('Low','Medium','High')),
  created_at          timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- EMPLOYEES  (workforce records — separate from login profiles)
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id                  bigint generated always as identity primary key,
  emp_code            text unique,
  name                text not null,
  email               text,
  phone               text,
  department          text,
  designation         text,
  assigned_projects   text,
  daily_hours         numeric(4,1) default 0,
  weekly_hours        numeric(5,1) default 0,
  productivity_score  int default 0,
  workload            text default 'Low' check (workload in ('Low','Medium','High','Overloaded')),
  profile_id          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id                  bigint generated always as identity primary key,
  project_code        text unique,
  name                text not null,
  client_id           bigint references public.clients(id) on delete set null,
  start_date          date,
  end_date            date,
  progress            int default 0,
  priority            text default 'Medium' check (priority in ('Low','Medium','High')),
  status              text default 'Active' check (status in ('Active','Completed','Delayed','On Hold')),
  assigned_employees  text,
  remarks             text,
  created_at          timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- WORK LOGS
-- ---------------------------------------------------------------------------
create table if not exists public.work_logs (
  id            bigint generated always as identity primary key,
  employee_id   bigint not null references public.employees(id) on delete cascade,
  log_date      date not null,
  task          text,
  hours         numeric(4,1) not null default 0,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  type        text default 'update' check (type in ('update','warn','risk')),
  title       text,
  message     text,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security for business tables.
-- Simplified for this project: any signed-in user can read/write. Role
-- restrictions (Admin / Project Manager / Employee) are enforced in the
-- React app based on profiles.role. If you want DB-level role enforcement
-- too, tighten these policies to check public.profiles.role for the
-- current auth.uid().
-- ---------------------------------------------------------------------------
alter table public.clients        enable row level security;
alter table public.employees      enable row level security;
alter table public.projects       enable row level security;
alter table public.work_logs      enable row level security;
alter table public.notifications  enable row level security;

create policy "authenticated read clients"   on public.clients   for select to authenticated using (true);
create policy "authenticated write clients"  on public.clients   for all    to authenticated using (true) with check (true);

create policy "authenticated read employees"  on public.employees for select to authenticated using (true);
create policy "authenticated write employees" on public.employees for all    to authenticated using (true) with check (true);

create policy "authenticated read projects"   on public.projects  for select to authenticated using (true);
create policy "authenticated write projects"  on public.projects  for all    to authenticated using (true) with check (true);

create policy "authenticated read worklogs"   on public.work_logs for select to authenticated using (true);
create policy "authenticated write worklogs"  on public.work_logs for all    to authenticated using (true) with check (true);

create policy "authenticated read notifications"  on public.notifications for select to authenticated using (true);
create policy "authenticated write notifications" on public.notifications for all    to authenticated using (true) with check (true);
