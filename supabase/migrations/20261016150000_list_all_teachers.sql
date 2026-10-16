-- Every teacher with an account is listed for students and visitors as soon as they sign up.
-- Admin approval now only unlocks the teacher portal (is_class_teacher); a rejection hides the class.

alter table public.classes alter column published set default true;

update public.classes c set published = true
  from public.teacher_profiles t
  where t.id = c.teacher_id and t.status <> 'rejected' and not c.is_example;

-- Submitting an application fills in the public class details right away and keeps the class listed.
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
      where teacher_id = new.teacher_id;
  end if;
  return new;
end;
$$;
