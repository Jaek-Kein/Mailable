import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";


const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ ok: false, error: "파일이 너무 큽니다 (최대 5MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // WebP 변환 (최대 폭 800px, 품질 80)
    const webp = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filename = `posters/${session.user.id}/${Date.now()}.webp`;
    const blob = await put(filename, webp, {
      access: "public",
      contentType: "image/webp",
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
