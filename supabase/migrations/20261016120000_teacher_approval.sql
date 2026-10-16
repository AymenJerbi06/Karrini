-- Teacher applications reviewed by an admin. Only approved teachers can use the teacher portal
-- and appear to students. Removes the illustrative directory classes.

-- ───────────────────────── Admins ─────────────────────────
create table if not exists public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security; -- no policies: not readable through the API
insert into public.admin_emails (email) values ('jerbiaymen6@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u join public.admin_emails a on lower(a.email) = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;

-- ───────────────────────── Teacher status: pending → verified / rejected ─────────────────────────
alter table public.teacher_profiles drop constraint if exists teacher_profiles_status_check;
alter table public.teacher_profiles add constraint teacher_profiles_status_check
  check (status in ('pending', 'verified', 'rejected'));

-- Public class details, copied from the approved application.
alter table public.classes
  add column if not exists headline text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists methods text[] not null default '{}',
  add column if not exists sessions_per_week int,
  add column if not exists session_minutes int,
  add column if not exists schedule text not null default '',
  add column if not exists years int not null default 0,
  add column if not exists published boolean not null default false;

-- ───────────────────────── Applications ─────────────────────────
create table if not exists public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references public.profiles (id) on delete cascade,
  subject text not null,
  levels text[] not null default '{}',
  sessions_per_week int not null check (sessions_per_week between 1 and 30),
  session_minutes int not null check (session_minutes between 30 and 240),
  methods text[] not null check (cardinality(methods) > 0),
  schedule text not null default '' check (char_length(schedule) <= 300),
  monthly_price_dt int check (monthly_price_dt between 0 and 5000),
  capacity int not null default 30 check (capacity between 1 and 200),
  location text not null default '' check (char_length(location) <= 120),
  headline text not null default '' check (char_length(headline) <= 160),
  bio text not null default '' check (char_length(bio) <= 2000),
  years int not null default 0 check (years between 0 and 60),
  accepted_terms boolean not null check (accepted_terms),
  accepted_commission boolean not null check (accepted_commission),
  commission_pct int not null default 15 check (commission_pct = 15),
  terms_version text not null default '2026-10',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);
alter table public.teacher_applications enable row level security;

create policy "applications: teacher reads own" on public.teacher_applications for select to authenticated
  using (teacher_id = auth.uid() or public.is_admin());
create policy "applications: teacher submits" on public.teacher_applications for insert to authenticated
  with check (teacher_id = auth.uid() and status = 'pending'
              and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
-- A teacher may edit and resubmit while not approved; the row goes back to "pending".
create policy "applications: teacher resubmits" on public.teacher_applications for update to authenticated
  using (teacher_id = auth.uid() and status <> 'approved')
  with check (teacher_id = auth.uid() and status = 'pending' and reviewed_by is null);

-- Submitting (or resubmitting) puts the teacher back to "pending".
create or replace function public.on_application_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    update teacher_profiles set status = 'pending' where id = new.teacher_id;
    update classes set published = false where teacher_id = new.teacher_id;
  end if;
  return new;
end;
$$;
drop trigger if exists application_submitted on public.teacher_applications;
create trigger application_submitted after insert or update of status, submitted_at on public.teacher_applications
  for each row when (new.status = 'pending') execute function public.on_application_submitted();

-- Admin decision: approve (publish the class) or reject (with a note).
create or replace function public.review_application(application_id uuid, decision text, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a teacher_applications;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'invalid decision'; end if;
  select * into a from teacher_applications where id = application_id for update;
  if not found then raise exception 'application not found'; end if;
  update teacher_applications
    set status = decision, admin_note = nullif(trim(note), ''), reviewed_at = now(), reviewed_by = auth.uid()
    where id = application_id;
  if decision = 'approved' then
    update teacher_profiles
      set status = 'verified', subject = a.subject, levels = a.levels, years = a.years, bio = a.bio
      where id = a.teacher_id;
    update classes
      set subject = a.subject, levels = a.levels, headline = a.headline, bio = a.bio, location = a.location,
          methods = a.methods, sessions_per_week = a.sessions_per_week, session_minutes = a.session_minutes,
          schedule = a.schedule, price_dt = a.monthly_price_dt, capacity = a.capacity, years = a.years,
          published = true
      where teacher_id = a.teacher_id;
  else
    update teacher_profiles set status = 'rejected' where id = a.teacher_id;
    update classes set published = false where teacher_id = a.teacher_id;
  end if;
end;
$$;

-- Admin list with the applicant's name, phone and email (emails live in auth.users).
create or replace function public.admin_applications()
returns table (
  id uuid, teacher_id uuid, first_name text, last_name text, email text, phone text,
  subject text, levels text[], sessions_per_week int, session_minutes int, methods text[], schedule text,
  monthly_price_dt int, capacity int, location text, headline text, bio text, years int,
  accepted_terms boolean, accepted_commission boolean, commission_pct int,
  status text, admin_note text, submitted_at timestamptz, reviewed_at timestamptz
) language sql stable security definer set search_path = public, auth as $$
  select a.id, a.teacher_id, p.first_name, p.last_name, u.email::text, p.phone,
         a.subject, a.levels, a.sessions_per_week, a.session_minutes, a.methods, a.schedule,
         a.monthly_price_dt, a.capacity, a.location, a.headline, a.bio, a.years,
         a.accepted_terms, a.accepted_commission, a.commission_pct,
         a.status, a.admin_note, a.submitted_at, a.reviewed_at
  from teacher_applications a
  join profiles p on p.id = a.teacher_id
  join auth.users u on u.id = a.teacher_id
  where public.is_admin()
  order by (a.status = 'pending') desc, a.submitted_at desc;
$$;

-- ───────────────────────── Only verified teachers can teach ─────────────────────────
-- Every teacher-side policy (materials, questions, sessions, answers, storage, realtime) goes through
-- is_class_teacher, so this single change locks the whole teacher portal until approval.
create or replace function public.is_class_teacher(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes c join teacher_profiles t on t.id = c.teacher_id
    where c.id = cid and c.teacher_id = auth.uid() and t.status = 'verified'
  );
$$;

-- Students see published classes (plus their own enrolments); teachers their own; admins all.
drop policy if exists "classes: public read" on public.classes;
create policy "classes: read published, own or enrolled" on public.classes for select
  using (published or teacher_id = auth.uid() or public.is_enrolled(id) or public.is_admin());
-- Class details are written only by review_application (no direct teacher edits).
drop policy if exists "classes: teacher update" on public.classes;

drop policy if exists "teacher_profiles: public read" on public.teacher_profiles;
create policy "teacher_profiles: read verified, own or admin" on public.teacher_profiles for select
  using (status = 'verified' or id = auth.uid() or public.is_admin());

create policy "profiles: admin reads" on public.profiles for select to authenticated using (public.is_admin());

-- Students can only join published classes.
drop policy if exists "enrollments: student joins" on public.enrollments;
create policy "enrollments: student joins" on public.enrollments for insert to authenticated
  with check (student_id = auth.uid()
              and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
              and exists (select 1 from public.classes where id = class_id and published));

-- ───────────────────────── Remove the illustrative directory classes ─────────────────────────
delete from public.classes where is_example;
