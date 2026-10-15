import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Tells the sign-up form whether a phone number is already used, before the account is created.
// Only answers yes/no; never returns who owns the number.
export async function POST(request: Request) {
  let phone = "";
  try {
    phone = String((await request.json())?.phone ?? "");
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  if (!/^\+216[234579]\d{7}$/.test(phone)) return NextResponse.json({ error: "invalid-phone" }, { status: 400 });
  try {
    const { count, error } = await supabaseAdmin()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone);
    if (error) throw error;
    return NextResponse.json({ taken: (count ?? 0) > 0 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
