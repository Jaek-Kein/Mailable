import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => {
        // 토큰 발급 시점에만 인증 확인
        const session = await auth();
        if (!session?.user?.id) throw new Error("unauthorized");

        return {
          allowedContentTypes: ["image/webp", "image/png", "image/jpeg"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 변환 후 최대 5MB
        };
      },
      onUploadCompleted: async () => {
        // 업로드 완료 콜백 (Vercel 서버 → 여기로 옴, 세션 없음)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
