import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Emails students through Resend:
//  - { type: "live", id: sessionId }       → "your class has started" (once per session)
//  - { type: "announcement", id }          → a teacher's message or timetable change
// The caller must be the class teacher (checked from their Supabase access token).
// Until a sending domain (karrini.tn) is verified in Resend, Resend only delivers to the
// account owner's address; other recipients are counted as failed.

export const maxDuration = 60;

const FROM = process.env.EMAIL_FROM || "Karrini <onboarding@resend.dev>";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Mail = { to: string; subject: string; html: string };

function layout(lines: { ar: string; fr: string }[], cta: { href: string; ar: string; fr: string }) {
  const block = (dir: "rtl" | "ltr", key: "ar" | "fr") =>
    `<div dir="${dir}" style="text-align:${dir === "rtl" ? "right" : "left"};margin:0 0 20px">${lines
      .map((l) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.6;color:#1f2937">${l[key]}</p>`)
      .join("")}<a href="${cta.href}" style="display:inline-block;margin-top:6px;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px">${cta[key]}</a></div>`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:20px;font-weight:800;color:#102f29;margin:0 0 20px">Karrini · قرّيني</p>${block("rtl", "ar")}<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>${block("ltr", "fr")}</div>`;
}

async function send(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !mails.length) return { sent: 0, failed: mails.length };
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const payload = mails.map((m) => ({ from: FROM, to: [m.to], subject: m.subject, html: m.html }));
  const batch = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers, body: JSON.stringify(payload.slice(0, 100)) });
  if (batch.ok && mails.length <= 100) return { sent: mails.length, failed: 0 };
  // The batch is refused as a whole (e.g. Resend test mode): send one by one, within the rate limit.
  let sent = 0;
  for (const p of payload) {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify(p) });
    if (res.ok) sent++;
    await new Promise((r) => setTimeout(r, 550));
  }
  return { sent, failed: payload.length - sent };
}

async function recipients(classId: string, groupId: string | null) {
  const admin = supabaseAdmin();
  let q = admin.from("enrollments").select("student_id").eq("class_id", classId);
  if (groupId) q = q.eq("group_id", groupId);
  const { data } = await q;
  const users = await Promise.all((data ?? []).map((r) => admin.auth.admin.getUserById(r.student_id)));
  return users.map((u) => u.data.user?.email).filter((e): e is string => !!e);
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let body: { type?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!token || !body.id || (body.type !== "live" && body.type !== "announcement"))
    return NextResponse.json({ error: "bad-request" }, { status: 400 });

  try {
    const admin = supabaseAdmin();
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth.user;
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const origin = new URL(request.url).origin;

    if (body.type === "live") {
      // Claim the notification atomically so a refresh never emails twice.
      const { data: session } = await admin
        .from("sessions")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", body.id)
        .eq("teacher_id", user.id)
        .is("ended_at", null)
        .is("notified_at", null)
        .select("class_id, group_id, classes(name, title)")
        .maybeSingle();
      if (!session) return NextResponse.json({ sent: 0, failed: 0, recipients: 0 });
      const cls = session.classes as unknown as { name: string; title: string } | null;
      const to = await recipients(session.class_id, session.group_id);
      const name = esc(cls?.name || "");
      const teacher = esc(cls?.title || "");
      const href = `${origin}/ar/classroom?class=${encodeURIComponent(session.class_id)}`;
      const html = layout(
        [
          { ar: `بدا الدرس المباشر${name ? ` «${name}»` : ""} مع ${teacher}.`, fr: `Le cours en direct${name ? ` « ${name} »` : ""} avec ${teacher} a commencé.` },
          { ar: "ادخل توّا باش ما يفوتك شي.", fr: "Rejoignez-le maintenant pour ne rien manquer." },
        ],
        { href, ar: "ادخل للدرس", fr: "Rejoindre le cours" },
      );
      const result = await send(to.map((email) => ({ to: email, subject: `Karrini · ${teacher} — درسك بدا / Votre cours a commencé`, html })));
      return NextResponse.json({ ...result, recipients: to.length });
    }

    const { data: a } = await admin
      .from("announcements")
      .select("id, class_id, group_id, kind, subject, body, created_by, emailed, classes(name, title)")
      .eq("id", body.id)
      .maybeSingle();
    if (!a || a.created_by !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (a.emailed > 0) return NextResponse.json({ sent: 0, failed: 0, recipients: 0 });
    const cls = a.classes as unknown as { name: string; title: string } | null;
    const to = await recipients(a.class_id, a.group_id);
    const teacher = esc(cls?.title || "");
    const text = esc(a.body).replace(/\n/g, "<br/>");
    const href = `${origin}/ar/dashboard/class?id=${encodeURIComponent(a.class_id)}`;
    const html = layout(
      [
        { ar: `رسالة من ${teacher}:`, fr: `Message de ${teacher} :` },
        { ar: `<strong>${esc(a.subject)}</strong><br/>${text}`, fr: `<strong>${esc(a.subject)}</strong><br/>${text}` },
      ],
      { href, ar: "حلّ صفحة القسم", fr: "Ouvrir la page de la classe" },
    );
    const result = await send(to.map((email) => ({ to: email, subject: `Karrini · ${a.subject}`, html })));
    await admin.from("announcements").update({ emailed: result.sent }).eq("id", a.id);
    return NextResponse.json({ ...result, recipients: to.length });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
