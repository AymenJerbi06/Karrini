-- Qarrini core schema: accounts, classes, enrolments, materials, questions, live sessions, answers.
-- Every table uses Row Level Security. Grading happens server-side (Next.js route with the
-- secret key), so students can never write their own result or read correct answers.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles (one per auth user) ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'parent', 'teacher')),
  first_name text not null default '',
  last_name text not null default '',
  -- E.164, e.g. +21620123456. Required for every account (lesson reminders, family contact).
  phone text unique check (phone ~ '^\+216[234579][0-9]{7}$'),
  phone_verified boolean not null default false,
  school_level text,
  created_at timestamptz not null default now()
);

create table public.teacher_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  subject text not null default 'math',
  levels text[] not null default '{}',
  years int not null default 0 check (years between 0 and 60),
  bio text not null default '',
  status text not null default 'pending' check (status in ('pending', 'verified'))
);

create table public.parent_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  primary key (parent_id, student_id)
);

-- ───────────────────────── Classes & enrolments ─────────────────────────
create table public.classes (
  id text primary key default gen_random_uuid()::text,
  teacher_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  title text not null default '',
  levels text[] not null default '{}',
  capacity int not null default 30 check (capacity between 1 and 500),
  price_dt int check (price_dt >= 0),
  is_example boolean not null default false,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes (teacher_id);

create table public.enrollments (
  student_id uuid not null references public.profiles (id) on delete cascade,
  class_id text not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, class_id)
);
create index enrollments_class_idx on public.enrollments (class_id);

-- ───────────────────────── Helper predicates (security definer, no RLS recursion) ─────────────────────────
create or replace function public.is_class_teacher(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = cid and teacher_id = auth.uid());
$$;

create or replace function public.is_enrolled(cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where class_id = cid and student_id = auth.uid());
$$;

create or replace function public.teaches_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e join classes c on c.id = e.class_id
    where e.student_id = sid and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_parent_of(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from parent_links where parent_id = auth.uid() and student_id = sid);
$$;

-- ───────────────────────── Materials (files live in the private "materials" bucket) ─────────────────────────
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  note text not null default '',
  kind text not null default 'notes' check (kind in ('notes', 'exercises', 'homework', 'correction', 'other')),
  file_path text not null,
  file_name text not null,
  mime text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes between 0 and 20971520),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index materials_class_idx on public.materials (class_id, created_at desc);

-- ───────────────────────── Question bank ─────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  type text not null check (type in ('choice', 'numeric', 'short', 'written')),
  prompt text not null check (char_length(prompt) between 1 and 2000),
  options text[],
  multiple boolean not null default false,
  explanation text,
  time_limit int check (time_limit is null or time_limit between 5 and 3600),
  position int not null default 0,
  origin text not null default 'prepared' check (origin in ('prepared', 'live')),
  created_at timestamptz not null default now()
);
create index questions_class_idx on public.questions (class_id, position);

-- Correct answers are kept apart so students can never read them.
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct int[],
  accepted text[]
);

-- ───────────────────────── Live sessions ─────────────────────────
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_id text not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index sessions_class_idx on public.sessions (class_id, started_at desc);
-- At most one running session per class.
create unique index sessions_one_live_per_class on public.sessions (class_id) where ended_at is null;

create table public.session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  published_at timestamptz not null default now(),
  closed_at timestamptz,
  released_at timestamptz
);
create index session_questions_session_idx on public.session_questions (session_id, published_at);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null references public.session_questions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answer_text text not null default '' check (char_length(answer_text) <= 4000),
  choice int[],
  photo_path text,
  status text not null check (status in ('correct', 'incorrect', 'review')),
  feedback text,
  created_at timestamptz not null default now(),
  unique (session_question_id, student_id)
);
create index answers_sq_idx on public.answers (session_question_id);

-- ───────────────────────── New-user trigger: profile from sign-up metadata ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(meta ->> 'role', 'student');
begin
  if r not in ('student', 'parent', 'teacher') then r := 'student'; end if; -- never trust "admin" etc.
  insert into profiles (id, role, first_name, last_name, phone, school_level)
  values (new.id, r, coalesce(meta ->> 'first_name', ''), coalesce(meta ->> 'last_name', ''),
          nullif(meta ->> 'phone', ''), meta ->> 'school_level');
  if r = 'teacher' then
    insert into teacher_profiles (id, subject, levels, years)
    values (new.id, coalesce(meta ->> 'subject', 'math'),
            coalesce(array(select jsonb_array_elements_text(meta -> 'levels')), '{}'),
            coalesce((meta ->> 'years')::int, 0));
    insert into classes (teacher_id, subject, title, levels)
    values (new.id, coalesce(meta ->> 'subject', 'math'), '',
            coalesce(array(select jsonb_array_elements_text(meta -> 'levels')), '{}'));
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.parent_links enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.materials enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.answers enable row level security;

-- Profiles: yourself, your students (teacher), your linked child (parent).
create policy "profiles: read own or related" on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches_student(id) or public.is_parent_of(id));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Teacher profiles are public (needed for the directory); only the owner edits, never the status.
create policy "teacher_profiles: public read" on public.teacher_profiles for select using (true);
create policy "teacher_profiles: update own" on public.teacher_profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and status = (select t.status from public.teacher_profiles t where t.id = auth.uid()));

create policy "parent_links: read own" on public.parent_links for select to authenticated
  using (parent_id = auth.uid() or student_id = auth.uid());

-- Classes: public catalogue; teachers manage their own.
create policy "classes: public read" on public.classes for select using (true);
create policy "classes: teacher update" on public.classes for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- Enrolments: students join/leave themselves; teachers and parents can see them.
create policy "enrollments: read related" on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_class_teacher(class_id) or public.is_parent_of(student_id));
create policy "enrollments: student joins" on public.enrollments for insert to authenticated
  with check (student_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'student'));
create policy "enrollments: student leaves" on public.enrollments for delete to authenticated
  using (student_id = auth.uid());

-- Materials: the class teacher manages; enrolled students read.
create policy "materials: read teacher or enrolled" on public.materials for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_enrolled(class_id));
create policy "materials: teacher insert" on public.materials for insert to authenticated
  with check (public.is_class_teacher(class_id) and uploaded_by = auth.uid());
create policy "materials: teacher delete" on public.materials for delete to authenticated
  using (public.is_class_teacher(class_id));

-- Questions: the teacher manages the bank; students see a question only once it is published.
create policy "questions: teacher all" on public.questions for all to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));
create policy "questions: students see published" on public.questions for select to authenticated
  using (public.is_enrolled(class_id) and exists (select 1 from public.session_questions sq where sq.question_id = questions.id));

create policy "question_keys: teacher only" on public.question_keys for all to authenticated
  using (public.is_class_teacher((select q.class_id from public.questions q where q.id = question_id)))
  with check (public.is_class_teacher((select q.class_id from public.questions q where q.id = question_id)));

-- Sessions: teacher runs them; enrolled students can see that a class is live.
create policy "sessions: read teacher or enrolled" on public.sessions for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_enrolled(class_id));
create policy "sessions: teacher insert" on public.sessions for insert to authenticated
  with check (teacher_id = auth.uid() and public.is_class_teacher(class_id));
create policy "sessions: teacher update" on public.sessions for update to authenticated
  using (public.is_class_teacher(class_id)) with check (public.is_class_teacher(class_id));

create policy "session_questions: read teacher or enrolled" on public.session_questions for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id
                 and (public.is_class_teacher(s.class_id) or public.is_enrolled(s.class_id))));
create policy "session_questions: teacher write" on public.session_questions for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.is_class_teacher(s.class_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.is_class_teacher(s.class_id)));

-- Answers: students read only their own; the teacher reads and marks their class's answers.
-- No insert policy: answers are inserted and graded by the server route (secret key).
create policy "answers: student reads own" on public.answers for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy "answers: teacher reads class" on public.answers for select to authenticated
  using (exists (select 1 from public.session_questions sq join public.sessions s on s.id = sq.session_id
                 where sq.id = session_question_id and public.is_class_teacher(s.class_id)));
create policy "answers: teacher marks" on public.answers for update to authenticated
  using (exists (select 1 from public.session_questions sq join public.sessions s on s.id = sq.session_id
                 where sq.id = session_question_id and public.is_class_teacher(s.class_id)));

-- ───────────────────────── Storage: private "materials" bucket, path = <class_id>/<file> ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('materials', 'materials', false, 20971520)
on conflict (id) do nothing;

create policy "materials bucket: teacher upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_class_teacher((storage.foldername(name))[1]));
create policy "materials bucket: teacher delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_class_teacher((storage.foldername(name))[1]));
create policy "materials bucket: read teacher or enrolled" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (public.is_class_teacher((storage.foldername(name))[1])
                                      or public.is_enrolled((storage.foldername(name))[1])));

-- ───────────────────────── Example classes from the public directory (no real teacher) ─────────────────────────
insert into public.classes (id, subject, title, levels, capacity, price_dt, is_example) values
  ('hichem-trabelsi', 'math', 'Mr. Hichem Trabelsi', '{3rd-secondary,bac}', 40, 95, true),
  ('sonia-kammoun', 'physics', 'Ms. Sonia Kammoun', '{2nd-secondary,3rd-secondary,bac}', 35, 85, true),
  ('anis-ellouze', 'sciences', 'Mr. Anis Ellouze', '{bac}', 40, 80, true),
  ('rim-chaabane', 'french', 'Ms. Rim Chaabane', '{2nd-secondary,3rd-secondary,bac}', 8, 70, true),
  ('walid-jarraya', 'computer-science', 'Mr. Walid Jarraya', '{3rd-secondary,bac}', 30, 75, true),
  ('ines-bouaziz', 'english', 'Ms. Ines Bouaziz', '{1st-secondary,2nd-secondary,3rd-secondary,bac}', 35, 55, true),
  ('mourad-fourati', 'philosophy', 'Mr. Mourad Fourati', '{bac}', 40, 60, true),
  ('amel-masmoudi', 'math', 'Ms. Amel Masmoudi', '{basic,1st-secondary}', 8, 50, true),
  ('slim-damak', 'economics', 'Mr. Slim Damak', '{3rd-secondary,bac}', 6, 120, true)
on conflict (id) do nothing;

-- ───────────────────────── Realtime: live answers and question state ─────────────────────────
alter publication supabase_realtime add table public.answers, public.session_questions, public.sessions;
