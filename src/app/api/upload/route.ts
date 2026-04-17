import { randomUUID } from "node:crypto";
import path from "node:path";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;
const DEFAULT_STORAGE_BUCKET = "thread-media";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

type OptimizedImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  optimized: boolean;
};

async function optimizeImage(buffer: Buffer, mimeType: string): Promise<OptimizedImage> {
  const originalExtension = getExtensionFromMime(mimeType);

  if (!originalExtension) {
    throw new Error("Format gambar tidak didukung.");
  }

  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();

  const resized = image.resize({
    width: MAX_IMAGE_DIMENSION,
    height: MAX_IMAGE_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  let optimizedBuffer: Buffer;

  if (mimeType === "image/png") {
    optimizedBuffer = await resized
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        effort: 10,
      })
      .toBuffer();
  } else if (mimeType === "image/webp") {
    optimizedBuffer = await resized
      .webp({
        quality: 90,
        effort: 6,
      })
      .toBuffer();
  } else {
    optimizedBuffer = await resized
      .jpeg({
        quality: 92,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
  }

  const useOptimized =
    optimizedBuffer.length < buffer.length ||
    (metadata.width ?? 0) > MAX_IMAGE_DIMENSION ||
    (metadata.height ?? 0) > MAX_IMAGE_DIMENSION;

  return {
    buffer: useOptimized ? optimizedBuffer : buffer,
    mimeType,
    extension: originalExtension,
    optimized: useOptimized,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Hanya file gambar yang diizinkan." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: "Ukuran maksimal gambar adalah 8MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const optimized = await optimizeImage(buffer, file.type);

    const storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? DEFAULT_STORAGE_BUCKET;
    const filename = `${Date.now()}-${randomUUID()}${optimized.extension}`;
    const objectPath = path.posix.join("threads", filename);

    const supabase = getSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(objectPath, optimized.buffer, {
        contentType: optimized.mimeType,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload storage gagal: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(objectPath);

    if (!publicData.publicUrl) {
      return NextResponse.json(
        { error: "Upload berhasil tapi URL publik tidak ditemukan." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        url: publicData.publicUrl,
        optimized: optimized.optimized,
        originalSize: buffer.length,
        finalSize: optimized.buffer.length,
      },
      { status: 201 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Upload gagal: ${detail}` }, { status: 500 });
  }
}
