import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { put } from "@vercel/blob";

const MAX_SIZE = 5 * 1024 * 1024; // 변환 후 최대 5MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ ok: false, error: "파일이 너무 큽니다 (최대 5MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/webp" ? "webp" : "png";
    const filename = `posters/${session.user.id}/${Date.now()}.${ext}`;

    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
