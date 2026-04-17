import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  parseThreadsPerSegment,
  THREADS_PER_SEGMENT_COOKIE,
} from "@/lib/thread-layout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DevAction = "set-thread-per-screen" | "delete-all-threads";

type DevPayload = {
  action?: DevAction;
  threadsPerSegment?: number;
};

function isAuthorized(request: NextRequest): boolean {
  const requestKey = request.headers.get("x-dev-key")?.trim() ?? "";
  const expectedKey = process.env.DEV_ADMIN_KEY?.trim() ?? "";

  return Boolean(expectedKey) && requestKey.length > 0 && requestKey === expectedKey;
}

function responseUnauthorized() {
  return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return responseUnauthorized();
  }

  let payload: DevPayload;
  try {
    payload = (await request.json()) as DevPayload;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  if (payload.action === "set-thread-per-screen") {
    const rawValue = payload.threadsPerSegment;

    if (rawValue !== 75 && rawValue !== 100) {
      return NextResponse.json(
        { error: "Pilihan thread per screen hanya boleh 75 atau 100." },
        { status: 400 }
      );
    }

    const value = parseThreadsPerSegment(String(rawValue));
    const response = NextResponse.json({
      message: "Pengaturan thread per screen berhasil disimpan.",
      threadsPerSegment: value,
    });

    response.cookies.set(THREADS_PER_SEGMENT_COOKIE, String(value), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  if (payload.action === "delete-all-threads") {
    try {
      const supabase = getSupabaseAdminClient();
      const { error } = await supabase.from("threads").delete().not("id", "is", null);

      if (error) {
        return NextResponse.json(
          { error: `Gagal menghapus data thread: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: "Seluruh data thread berhasil dihapus." });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Server gagal menghapus data: ${detail}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
}
