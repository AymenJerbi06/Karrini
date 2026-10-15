-- Live classroom on Supabase Realtime, plus fixes found while wiring the app.

-- 1. Explanations often give the answer away: keep them with the teacher-only answer key.
alter table public.question_keys add column if not exists explanation text;
update public.question_keys k set explanation = q.explanation
  from public.questions q where q.id = k.question_id and q.explanation is not null and k.explanation is null;
update public.questions set explanation = null where explanation is not null;

-- Highest number of connected students during a session (for participation %).
alter table public.sessions add column if not exists peak_connected int not null default 0;

-- 2. The teacher's classroom records the answers it receives during a live session.
create or replace function public.is_enrolled_student(sid uuid, cid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from enrollments where class_id = cid and student_id = sid);
$$;

create policy "answers: teacher records" on public.answers for insert to authenticated
  with check (exists (select 1 from public.session_questions sq join public.sessions s on s.id = sq.session_id
                      where sq.id = session_question_id and public.is_class_teacher(s.class_id)
                        and public.is_enrolled_student(student_id, s.class_id)));

-- Teachers may delete an answer from their own class (e.g. a duplicate).
create policy "answers: teacher deletes" on public.answers for delete to authenticated
  using (exists (select 1 from public.session_questions sq join public.sessions s on s.id = sq.session_id
                 where sq.id = session_question_id and public.is_class_teacher(s.class_id)));

-- 3. Class title = teacher's name, so students can see who teaches a class they joined.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(meta ->> 'role', 'student');
  full_name text := trim(coalesce(meta ->> 'first_name', '') || ' ' || coalesce(meta ->> 'last_name', ''));
  lvls text[] := coalesce(array(select jsonb_array_elements_text(meta -> 'levels')), '{}');
begin
  if r not in ('student', 'parent', 'teacher') then r := 'student'; end if;
  insert into profiles (id, role, first_name, last_name, phone, school_level)
  values (new.id, r, coalesce(meta ->> 'first_name', ''), coalesce(meta ->> 'last_name', ''),
          nullif(meta ->> 'phone', ''), meta ->> 'school_level');
  if r = 'teacher' then
    insert into teacher_profiles (id, subject, levels, years)
    values (new.id, coalesce(meta ->> 'subject', 'math'), lvls, coalesce((meta ->> 'years')::int, 0));
    insert into classes (teacher_id, subject, title, levels)
    values (new.id, coalesce(meta ->> 'subject', 'math'), full_name, lvls);
  end if;
  return new;
end;
$$;

update public.classes c set title = trim(p.first_name || ' ' || p.last_name)
  from public.profiles p where p.id = c.teacher_id and coalesce(c.title, '') = '';

-- 4. Private Realtime channels "class:<class_id>": only the class teacher and enrolled students
--    can listen (select) or send (insert) broadcast and presence messages.
create policy "realtime: class members read" on realtime.messages for select to authenticated
  using (
    realtime.topic() like 'class:%'
    and (public.is_class_teacher(split_part(realtime.topic(), ':', 2))
         or public.is_enrolled(split_part(realtime.topic(), ':', 2)))
  );
create policy "realtime: class members send" on realtime.messages for insert to authenticated
  with check (
    realtime.topic() like 'class:%'
    and (public.is_class_teacher(split_part(realtime.topic(), ':', 2))
         or public.is_enrolled(split_part(realtime.topic(), ':', 2)))
  );
