-- Classroom v2: several classes per teacher, groups (distinct schedules and students), course modules,
-- attendance, announcements (emailed to students) and teacher payout details.

-- ───────────────────────── Classes: a name, created and edited by their (approved) teacher ─────────────────────────
alter table public.classes add column if not exists name text not null default '' check (char_length(name) <= 120);

create or replace function public.create_class(p_subject text, p_levels text[], p_name text, p_price int)
returns text language plpgsql security definer set search_path = public as $$
declare
  cid text;
  t teacher_profiles;
  base classes;
  full_name text;
begin
  select * into t from teacher_profiles where id = auth.uid();
  if not found or t.status <> 'verified' then raise exception 'not allowed'; end if;
  if p_price is not null and (p_price < 0 or p_price > 5000) then raise exception 'invalid price'; end if;
  select trim(first_name || ' ' || last_name) into full_name from profiles where id = auth.uid();
  select * into base from classes where teacher_id = auth.uid() order by created_at limit 1;
  insert into classes (teacher_id, subject, title, name, levels, price_dt, published, location, years, bio, methods,
                       sessions_per_week, session_minutes, capacity)
  values (auth.uid(), p_subject, full_name, left(trim(coalesce(p_name, '')), 120), coalesce(p_levels, '{}'), p_price, true,
          coalesce(base.location, ''), t.years, t.bio, coalesce(base.methods, '{online}'),
          base.sessions_per_week, base.session_minutes, coalesce(base.capacity, 30))
  returning id into cid;
  return cid;
end;
$$;

create or replace function public.update_class(p_id text, p_name text, p_levels text[], p_price int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_class_teacher(p_id) then raise exception 'not allowed'; end if;
  if p_price is not null and (p_price < 0 or p_price > 5000) then raise exception 'invalid price'; end if;
  update classes set name = left(trim(coalesce(p_name, '')), 120), levels = coalesce(p_levels, '{}'), price_dt = p_price
    where id = p_id;
end;
$$;

-- Applications describe the teacher's first class only; approval lists all their classes again.
create or replace function public.on_application_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    update teacher_profiles
      set status = 'pending', subject = new.subject, levels = new.levels, years = new.years, bio = new.bio
      where id = new.teacher_id;
    update classes
      set subject = new.subject, levels = new.levels, headline = new.headline, bio = new.bio, location = new.location,
          methods = new.methods, sessions_per_week = new.sessions_per_week, session_minutes = new.session_minutes,
          schedule = new.schedule, price_dt = new.monthly_price_dt, capacity = new.capacity, years = new.years,
          published = true
      where id = (select id from classes where teacher_id = new.teacher_id order by created_at limit 1);
  end if;
  return new;
end;
$$;

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
          schedule = a.schedule, price_dt = a.monthly_price_dt, capacity = a.capacity, years = a.years
      where id = (select id from classes where teacher_id = a.teacher_id order by created_at limit 1);
    update classes set published = true where teacher_id = a.teacher_id;
  else
    update teacher_profiles set status = 'rejected' where id = a.teacher_id;
    update classes set published = false where teacher_id = a.teacher_id;
  end if;
end;
$$;

-- ───────────────────────── Groups: one class, several timetables with distinct students ─────────────────────────
-- slots = [{"day": 0-6 (0 = Monday), "start": "08:00", "end": "10:00"}, …]
create table if not exists public.class_groups (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  slots jsonb not null default '[]'::jsonb check (jsonb_typeof(slots) = 'array'),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists class_groups_class_idx on public.class_groups (class_id, position);
alter table public.class_groups enable row level security;

-- Anyone who can see the class can see its timetable (classes RLS applies inside the subquery).
create policy "class_groups: read with class" on public.class_groups for select
  using (exists (select 1 from public.classes c where c.id = class_id));
create policy "class_groups: teacher manages" on public.class_groups for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

alter table public.enrollments add column if not exists group_id uuid references public.class_groups (id) on delete set null;

create or replace function public.group_in_class(gid uuid, cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select gid is null or exists (select 1 from class_groups where id = gid and class_id = cid);
$$;

create or replace function public.my_group(cid text)
returns uuid language sql stable security definer set search_path = public as $$
  select group_id from enrollments where class_id = cid and student_id = auth.uid();
$$;

drop policy if exists "enrollments: student joins" on public.enrollments;
create policy "enrollments: student joins" on public.enrollments for insert to authenticated
  with check (student_id = auth.uid()
              and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
              and exists (select 1 from public.classes where id = class_id and published)
              and public.group_in_class(group_id, class_id));
create policy "enrollments: student changes group" on public.enrollments for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and public.group_in_class(group_id, class_id));
create policy "enrollments: teacher moves students" on public.enrollments for update to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id) and public.group_in_class(group_id, class_id));

-- A live session belongs to one group (null = the whole class). notified_at prevents repeated emails.
alter table public.sessions add column if not exists group_id uuid references public.class_groups (id) on delete set null;
alter table public.sessions add column if not exists notified_at timestamptz;

-- ───────────────────────── Attendance (the student records joining a running session) ─────────────────────────
create table if not exists public.attendance (
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.attendance enable row level security;

create policy "attendance: read related" on public.attendance for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id)
         or exists (select 1 from public.sessions s where s.id = session_id and public.is_class_teacher(s.class_id)));
create policy "attendance: student joins live session" on public.attendance for insert to authenticated
  with check (student_id = auth.uid()
              and exists (select 1 from public.sessions s
                          where s.id = session_id and s.ended_at is null and public.is_enrolled(s.class_id)
                            and (s.group_id is null or s.group_id = public.my_group(s.class_id))));

-- ───────────────────────── Course modules (chapters) organising the class materials ─────────────────────────
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists modules_class_idx on public.modules (class_id, position);
alter table public.modules enable row level security;

create policy "modules: read teacher or enrolled" on public.modules for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_enrolled(class_id));
create policy "modules: teacher manages" on public.modules for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

alter table public.materials add column if not exists module_id uuid references public.modules (id) on delete set null;
create policy "materials: teacher update" on public.materials for update to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

-- ───────────────────────── Announcements (shown on the class page and emailed) ─────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  group_id uuid references public.class_groups (id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'schedule')),
  subject text not null check (char_length(subject) between 1 and 160),
  body text not null default '' check (char_length(body) <= 4000),
  created_by uuid not null references public.profiles (id) on delete cascade,
  emailed int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists announcements_class_idx on public.announcements (class_id, created_at desc);
alter table public.announcements enable row level security;

create policy "announcements: read teacher or group" on public.announcements for select to authenticated
  using (public.is_class_teacher(class_id)
         or (public.is_enrolled(class_id) and (group_id is null or group_id = public.my_group(class_id))));
create policy "announcements: teacher posts" on public.announcements for insert to authenticated
  with check (created_by = auth.uid() and public.is_class_teacher(class_id) and public.group_in_class(group_id, class_id));
create policy "announcements: teacher deletes" on public.announcements for delete to authenticated
  using (public.is_class_teacher(class_id));

-- ───────────────────────── Teacher payout details (bank account for the monthly transfer) ─────────────────────────
create table if not exists public.teacher_payouts (
  teacher_id uuid primary key references public.profiles (id) on delete cascade,
  holder text not null default '' check (char_length(holder) <= 120),
  rib text check (rib ~ '^[0-9]{20}$'),
  updated_at timestamptz not null default now()
);
alter table public.teacher_payouts enable row level security;
create policy "teacher_payouts: own or admin" on public.teacher_payouts for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
