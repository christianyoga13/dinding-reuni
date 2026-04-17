import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type MediaType = "none" | "image" | "music";

type ThreadPayload = {
  threadTitle?: string;
  message?: string;
  author?: string;
  year?: string;
  chip?: string;
  mediaType?: MediaType;
  imageUrl?: string;
  musicTrack?: string;
  musicArtist?: string;
  musicImageUrl?: string;
  musicPreviewUrl?: string;
  musicExternalUrl?: string;
  musicProvider?: string;
};

type ThreadListItem = {
  id: string;
  title: string;
  message: string;
  author_name: string;
  batch_year: number;
  tag_label: string;
  media_type: MediaType;
  image_url: string | null;
  music_track: string | null;
  music_artist: string | null;
  music_image_url?: string | null;
  music_preview_url: string | null;
  music_external_url: string | null;
  music_provider: string | null;
  created_at: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "300", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 500)
      : 300;

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("threads")
      .select(
        "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_image_url,music_preview_url,music_external_url,music_provider,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error && error.message.includes("music_image_url")) {
      const legacy = await supabase
        .from("threads")
        .select(
          "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_preview_url,music_external_url,music_provider,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (legacy.error) {
        return NextResponse.json(
          { error: `Gagal ambil thread: ${legacy.error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        threads: ((legacy.data ?? []) as Omit<ThreadListItem, "music_image_url">[]).map((row) => ({
          ...row,
          music_image_url: null,
        })),
      });
    }

    if (error) {
      return NextResponse.json({ error: `Gagal ambil thread: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      threads: (data ?? []) as ThreadListItem[],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Server gagal mengambil thread: ${detail}` },
      { status: 500 }
    );
  }
}

function normalizeMediaType(value: string | undefined): MediaType {
  if (value === "image" || value === "music") {
    return value;
  }

  return "none";
}

function toBatchYear(value: string | undefined): number {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

function hasValidHttpUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ThreadPayload;

    const threadTitle = payload.threadTitle?.trim() ?? "";
    const message = payload.message?.trim() ?? "";
    const author = payload.author?.trim() ?? "";
    const chip = payload.chip?.trim() || "Thread Baru";
    const mediaType = normalizeMediaType(payload.mediaType);
    const batchYear = toBatchYear(payload.year);

    if (threadTitle.length < 3 || threadTitle.length > 140) {
      return NextResponse.json(
        { error: "Judul thread harus 3-140 karakter." },
        { status: 400 }
      );
    }

    if (message.length < 5 || message.length > 2000) {
      return NextResponse.json(
        { error: "Pesan harus 5-2000 karakter." },
        { status: 400 }
      );
    }

    if (author.length < 2 || author.length > 120) {
      return NextResponse.json(
        { error: "Nama/identitas harus 2-120 karakter." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(batchYear) || batchYear < 1950 || batchYear > 2100) {
      return NextResponse.json(
        { error: "Tahun/angkatan harus angka valid (1950-2100)." },
        { status: 400 }
      );
    }

    const imageUrl = payload.imageUrl?.trim() ?? "";
    const musicTrack = payload.musicTrack?.trim() ?? "";
    const musicArtist = payload.musicArtist?.trim() ?? "";
    const musicImageUrl = payload.musicImageUrl?.trim() ?? "";
    const musicPreviewUrl = payload.musicPreviewUrl?.trim() ?? "";
    const musicExternalUrl = payload.musicExternalUrl?.trim() ?? "";
    const musicProvider = payload.musicProvider?.trim() ?? "";

    if (mediaType === "image" && !hasValidHttpUrl(imageUrl)) {
      return NextResponse.json(
        { error: "URL gambar tidak valid untuk media image." },
        { status: 400 }
      );
    }

    if (mediaType === "music") {
      if (!musicTrack || !musicArtist) {
        return NextResponse.json(
          { error: "Data lagu belum lengkap." },
          { status: 400 }
        );
      }

      if (musicImageUrl && !hasValidHttpUrl(musicImageUrl)) {
        return NextResponse.json(
          { error: "URL cover lagu tidak valid." },
          { status: 400 }
        );
      }

      if (musicPreviewUrl && !hasValidHttpUrl(musicPreviewUrl)) {
        return NextResponse.json(
          { error: "URL preview lagu tidak valid." },
          { status: 400 }
        );
      }

      if (musicExternalUrl && !hasValidHttpUrl(musicExternalUrl)) {
        return NextResponse.json(
          { error: "URL eksternal lagu tidak valid." },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdminClient();

    const insertPayload = {
      title: threadTitle,
      message,
      author_name: author,
      batch_year: batchYear,
      tag_label: chip.slice(0, 60),
      media_type: mediaType,
      image_url: mediaType === "image" ? imageUrl : null,
      music_track: mediaType === "music" ? musicTrack.slice(0, 180) : null,
      music_artist: mediaType === "music" ? musicArtist.slice(0, 180) : null,
      music_image_url: mediaType === "music" ? musicImageUrl || null : null,
      music_preview_url: mediaType === "music" ? musicPreviewUrl || null : null,
      music_external_url: mediaType === "music" ? musicExternalUrl || null : null,
      music_provider: mediaType === "music" ? (musicProvider || "Unknown").slice(0, 40) : null,
    };

    const { data, error } = await supabase
      .from("threads")
      .insert(insertPayload)
      .select("id, created_at")
      .single();

    if (error && error.message.includes("music_image_url")) {
      const { music_image_url: _, ...legacyInsertPayload } = insertPayload;

      const legacy = await supabase
        .from("threads")
        .insert(legacyInsertPayload)
        .select("id, created_at")
        .single();

      if (legacy.error) {
        return NextResponse.json(
          { error: `Gagal simpan thread: ${legacy.error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Thread berhasil disimpan.", thread: legacy.data },
        { status: 201 }
      );
    }

    if (error) {
      return NextResponse.json({ error: `Gagal simpan thread: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Thread berhasil disimpan.", thread: data },
      { status: 201 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Server gagal memproses thread: ${detail}` },
      { status: 500 }
    );
  }
}
