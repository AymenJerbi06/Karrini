import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 120;
const MAX = 20 * 1024 * 1024;
export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const admin = supabaseAdmin();
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data: teacher } = await admin
      .from("teacher_profiles")
      .select("status")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (teacher?.status !== "verified")
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const url = process.env.BOARD_CONVERTER_URL;
    const secret = process.env.BOARD_CONVERTER_SECRET;
    if (!url || !secret)
      return NextResponse.json(
        { error: "converter-unavailable" },
        { status: 503 },
      );
    // Buffer at most 20 MB (+ multipart overhead), even when content-length is omitted.
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json({ error: "invalid-file" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX + 65536) {
        await reader.cancel();
        return NextResponse.json({ error: "file-too-large" }, { status: 413 });
      }
      chunks.push(value);
    }
    const form = await new Response(new Blob(chunks as BlobPart[]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > MAX ||
      !/\.(pptx?|docx?)$/i.test(file.name)
    )
      return NextResponse.json({ error: "invalid-file" }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = file.name.split(".").pop()!.toLowerCase();
    const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every(
      (b, i) => bytes[i] === b,
    );
    if ((ext.endsWith("x") && !zip) || (!ext.endsWith("x") && !ole))
      return NextResponse.json({ error: "invalid-file" }, { status: 400 });
    const converted = await fetch(new URL("/convert", url), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/octet-stream",
        "X-Document-Extension": ext,
      },
      body: bytes,
      signal: AbortSignal.timeout(85000),
      redirect: "error",
    });
    if (!converted.ok)
      return NextResponse.json({ error: "conversion-failed" }, { status: 422 });
    const output = await converted.arrayBuffer();
    if (
      output.byteLength > 64 * 1024 * 1024 ||
      new TextDecoder().decode(output.slice(0, 5)) !== "%PDF-"
    )
      return NextResponse.json({ error: "conversion-failed" }, { status: 422 });
    return new Response(output, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "conversion-failed" }, { status: 422 });
  }
}
