// Run the actual migration against an isolated PostgreSQL database. Never touches Supabase.
const { PGlite } = require("@electric-sql/pglite");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const teacher = "10000000-0000-4000-8000-000000000001";
const student = "20000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
const stranger = "20000000-0000-4000-8000-000000000003";
const group = "30000000-0000-4000-8000-000000000001";
const session = "40000000-0000-4000-8000-000000000001";
const document = {
  version: 1,
  title: "Test",
  presenting: true,
  pages: [{}],
  revision: 20,
};
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create schema auth; create schema storage; create schema realtime;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      create table profiles(id uuid primary key); create table classes(id text primary key, teacher_id uuid); create table class_groups(id uuid primary key, class_id text);
      create table sessions(id uuid primary key, class_id text, teacher_id uuid, group_id uuid references class_groups on delete set null);
      create table enrollments(class_id text, student_id uuid, group_id uuid);
      create table materials(id uuid primary key default gen_random_uuid(), class_id text, uploaded_by uuid, file_path text);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      create table realtime.messages(id bigint, topic text);
      alter table materials enable row level security; alter table storage.objects enable row level security; alter table realtime.messages enable row level security;
      create policy "materials: read teacher or enrolled" on materials for select using(true);
      create policy "materials: teacher insert" on materials for insert with check(true);
      create policy "materials bucket: read teacher or enrolled" on storage.objects for select using(true);
      create function is_class_teacher(cid text) returns boolean language sql stable security definer as $$ select exists(select 1 from classes where id=cid and teacher_id=auth.uid()) $$;
      create function is_enrolled(cid text) returns boolean language sql stable security definer as $$ select exists(select 1 from enrollments where class_id=cid and student_id=auth.uid()) $$;
      create function my_group(cid text) returns uuid language sql stable security definer as $$ select group_id from enrollments where class_id=cid and student_id=auth.uid() $$;
      create function group_in_class(gid uuid,cid text) returns boolean language sql stable security definer as $$ select gid is null or exists(select 1 from class_groups where id=gid and class_id=cid) $$;`);
    await db.exec(
      fs.readFileSync(
        "supabase/migrations/20261017010000_lesson_boards.sql",
        "utf8",
      ),
    );
    await db.exec(`grant usage on schema public,auth,storage,realtime to authenticated; grant select,insert,update,delete on all tables in schema public,storage,realtime to authenticated;
      insert into profiles values('${teacher}'); insert into classes values('class-a','${teacher}'); insert into class_groups values('${group}','class-a');
      insert into sessions values('${session}','class-a','${teacher}','${group}');
      insert into enrollments values('class-a','${student}','${group}'),('class-a','${other}',null);`);
    const as = async (id) => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
      );
    };
    const save = (revision) =>
      db.query("select save_lesson_board($1,$2::jsonb) as id", [
        session,
        JSON.stringify({ ...document, revision }),
      ]);
    const count = async (table) =>
      (await db.query(`select count(*)::int as n from ${table}`)).rows[0].n;
    await as(teacher);
    assert.equal((await save(20)).rows[0].id, session);
    await db.query(
      "insert into materials(class_id,uploaded_by,file_path,group_id) values('class-a',$1,'class-a/group.pdf',$2),('class-a',$1,'class-a/all.pdf',null)",
      [teacher, group],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('board-assets',$1)",
      [`${session}/page.png`],
    );
    await db.exec(
      "reset role; insert into storage.objects(bucket_id,name) values('materials','class-a/group.pdf'),('materials','class-a/all.pdf'),('unrelated','not-a-uuid/file');",
    );
    await as(student);
    assert.equal(await count("lesson_boards"), 1);
    assert.equal(await count("materials"), 2);
    assert.equal(await count("storage.objects"), 3);
    await assert.rejects(
      db
        .query("update lesson_boards set group_id=null where session_id=$1", [
          session,
        ])
        .then((r) => {
          if (r.affectedRows === 0) throw new Error("no write access");
        }),
    );
    assert.equal((await save(90)).rows[0].id, null);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('board-assets',$1)",
        [`${session}/spoof.png`],
      ),
    );
    await db.query("select set_config('realtime.topic',$1,false)", [
      `board:${session}`,
    ]);
    await assert.rejects(
      db.exec("insert into realtime.messages values(1,'spoof')"),
    );
    await as(other);
    assert.equal(await count("lesson_boards"), 0);
    assert.equal(await count("materials"), 1);
    assert.equal(await count("storage.objects"), 1);
    await as(stranger);
    assert.equal(await count("lesson_boards"), 0);
    assert.equal(await count("materials"), 0);
    await as(teacher);
    await db.query("select set_config('realtime.topic',$1,false)", [
      `board:${session}`,
    ]);
    await db.exec("insert into realtime.messages values(2,'teacher')");
    await save(10);
    assert.equal(
      (await db.query("select revision::int from lesson_boards")).rows[0]
        .revision,
      20,
    );
    await assert.rejects(db.exec("update lesson_boards set group_id=null"));
    await db.exec(`reset role; delete from class_groups where id='${group}';`);
    await as(teacher);
    await save(30);
    assert.equal(
      (await db.query("select group_id,revision::int from lesson_boards"))
        .rows[0].group_id,
      group,
    );
    await as(other);
    assert.equal(await count("lesson_boards"), 0);
    assert.equal(await count("materials"), 1);
    await db.exec("select set_config('realtime.topic','class:class-a',false)");
    await count("realtime.messages");
    await count("storage.objects");
    console.log(
      "Passed actual migration: teacher edits, student read-only, group isolation, private assets/materials, broadcast permissions, stale revisions, immutable audience and deleted-group privacy.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
