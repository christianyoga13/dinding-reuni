import Link from "next/link";

import WriteThreadQr from "./components/write-thread-qr";
import ThreadScatter from "@/app/components/thread-scatter";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NoteMedia =
  | {
      kind: "none";
    }
  | {
      kind: "image";
      imageUrl: string;
      caption: string;
    }
  | {
      kind: "music";
      track: string;
      artist: string;
      coverUrl: string;
      previewUrl: string;
      externalUrl: string;
      provider: string;
    };

type ThreadRow = {
  id: string;
  title: string;
  message: string;
  author_name: string;
  batch_year: number;
  tag_label: string;
  media_type: "none" | "image" | "music";
  image_url: string | null;
  music_track: string | null;
  music_artist: string | null;
  music_image_url?: string | null;
  music_preview_url: string | null;
  music_external_url: string | null;
  music_provider: string | null;
  created_at: string;
};

type ThreadNote = {
  id: string;
  createdAt?: string;
  thread: string;
  message: string;
  author: string;
  year: string;
  chip: string;
  left: string;
  top: string;
  rotate: number;
  delay: string;
  duration: string;
  size: "sm" | "md" | "lg";
  tone: "orange" | "purple" | "cream";
  media: NoteMedia;
  zIndex?: number;
};

const fallbackNotes: ThreadNote[] = [
  {
    id: "note-01",
    thread: "Thread 01",
    message: "Masih inget momen hujan pas malam perpisahan?",
    author: "Rani - XII IPS 2",
    year: "2016",
    chip: "Cerita Klasik",
    left: "6%",
    top: "8%",
    rotate: -6,
    delay: "0ms",
    duration: "8.4s",
    size: "md",
    tone: "cream",
    media: {
      kind: "none",
    },
  },
  {
    id: "note-02",
    thread: "Thread 02",
    message: "Foto kelas 2016 ketemu! Nanti aku upload full.",
    author: "Fikri - XII IPA 1",
    year: "2016",
    chip: "Arsip Reuni",
    left: "28%",
    top: "14%",
    rotate: 5,
    delay: "120ms",
    duration: "9.1s",
    size: "lg",
    tone: "orange",
    media: {
      kind: "image",
      imageUrl:
        "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=960&q=80",
      caption: "Arsip foto kelas - halaman depan",
    },
  },
  {
    id: "note-03",
    thread: "Thread 03",
    message: "Siapa yang dulu paling sering telat upacara?",
    author: "Nadia - XII IPA 3",
    year: "2018",
    chip: "Throwback",
    left: "57%",
    top: "8%",
    rotate: -4,
    delay: "240ms",
    duration: "8.8s",
    size: "sm",
    tone: "purple",
    media: {
      kind: "none",
    },
  },
  {
    id: "note-04",
    thread: "Thread 04",
    message: "Kangen kantin belakang, es tehnya juara.",
    author: "Dimas - XII IPS 1",
    year: "2017",
    chip: "Kuliner Kampus",
    left: "74%",
    top: "24%",
    rotate: 6,
    delay: "360ms",
    duration: "9.5s",
    size: "md",
    tone: "cream",
    media: {
      kind: "music",
      track: "A Sky Full of Stars",
      artist: "Coldplay",
      coverUrl: "https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?auto=format&fit=crop&w=640&q=80",
      previewUrl: "",
      externalUrl: "",
      provider: "Music",
    },
  },
  {
    id: "note-05",
    thread: "Thread 05",
    message: "Aku bawa buku tahunan asli pas hari H reunian.",
    author: "Tika - XII Bahasa",
    year: "2015",
    chip: "Nostalgia",
    left: "12%",
    top: "44%",
    rotate: -5,
    delay: "480ms",
    duration: "8.2s",
    size: "sm",
    tone: "orange",
    media: {
      kind: "image",
      imageUrl:
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=960&q=80",
      caption: "Buku tahunan angkatan 2015",
    },
  },
  {
    id: "note-06",
    thread: "Thread 06",
    message: "Setuju dresscode nuansa krem-coklat vintage?",
    author: "Aqil - XII IPA 2",
    year: "2020",
    chip: "Voting Outfit",
    left: "38%",
    top: "40%",
    rotate: 4,
    delay: "600ms",
    duration: "8.9s",
    size: "lg",
    tone: "purple",
    media: {
      kind: "none",
    },
  },
  {
    id: "note-07",
    thread: "Thread 07",
    message: "Boleh bikin sesi speed-friendship antar angkatan ga?",
    author: "Nabila - Kimia 2023",
    year: "2023",
    chip: "Mahasiswa Aktif",
    left: "68%",
    top: "52%",
    rotate: -4,
    delay: "720ms",
    duration: "8.6s",
    size: "md",
    tone: "orange",
    media: {
      kind: "music",
      track: "Can I Call You Tonight?",
      artist: "Dayglow",
      coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=640&q=80",
      previewUrl: "",
      externalUrl: "",
      provider: "Music",
    },
  },
  {
    id: "note-08",
    thread: "Thread 08",
    message: "Mau ada booth career corner dari alumni industri juga.",
    author: "Yoga - Alumni 2012",
    year: "2012",
    chip: "Career Talk",
    left: "24%",
    top: "67%",
    rotate: 5,
    delay: "840ms",
    duration: "9.3s",
    size: "md",
    tone: "cream",
    media: {
      kind: "none",
    },
  },
];

const THREADS_PER_SEGMENT = 100;
const SEGMENT_HEIGHT_PX = 1080;
const TOP_GUTTER_PX = 12;
const BOTTOM_GUTTER_PX = 22;
const CANVAS_WIDTH_PX = 1920;
const SIDE_GUTTER_PX = 22;
const COLLISION_PADDING_PX = 10;
const MAX_PLACEMENT_TRIES = 140;
const MAX_SINGLE_OVERLAP_RATIO = 0.09;
const MAX_TOTAL_OVERLAP_RATIO = 0.18;

function hashString(input: string): number {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;

  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type PlacementRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type OverlapMetrics = {
  maxSingleRatio: number;
  totalRatio: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function estimateCardWidthPx(size: ThreadNote["size"], hasMedia: boolean): number {
  if (hasMedia) {
    if (size === "lg") {
      return 182;
    }

    if (size === "md") {
      return 168;
    }

    return 154;
  }

  if (size === "lg") {
    return 166;
  }

  if (size === "md") {
    return 150;
  }

  return 138;
}

function estimateCardHeightPx(size: ThreadNote["size"], mediaType: ThreadRow["media_type"]): number {
  if (mediaType === "music") {
    if (size === "lg") {
      return 176;
    }

    if (size === "md") {
      return 160;
    }

    return 146;
  }

  if (mediaType === "image") {
    if (size === "lg") {
      return 170;
    }

    if (size === "md") {
      return 154;
    }

    return 140;
  }

  if (size === "lg") {
    return 118;
  }

  if (size === "md") {
    return 106;
  }

  return 96;
}

function overlapArea(a: PlacementRect, b: PlacementRect): number {
  const xOverlap = Math.max(
    0,
    Math.min(a.x + a.width + COLLISION_PADDING_PX, b.x + b.width + COLLISION_PADDING_PX) -
      Math.max(a.x - COLLISION_PADDING_PX, b.x - COLLISION_PADDING_PX)
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.y + a.height + COLLISION_PADDING_PX, b.y + b.height + COLLISION_PADDING_PX) -
      Math.max(a.y - COLLISION_PADDING_PX, b.y - COLLISION_PADDING_PX)
  );

  return xOverlap * yOverlap;
}

function getOverlapMetrics(candidate: PlacementRect, placedRects: PlacementRect[]): OverlapMetrics {
  const candidateArea = candidate.width * candidate.height;
  let totalOverlapArea = 0;
  let maxSingleRatio = 0;

  for (const existing of placedRects) {
    const overlap = overlapArea(candidate, existing);

    if (overlap === 0) {
      continue;
    }

    const singleRatio = overlap / Math.min(candidateArea, existing.width * existing.height);
    if (singleRatio > maxSingleRatio) {
      maxSingleRatio = singleRatio;
    }

    totalOverlapArea += overlap;
  }

  return {
    maxSingleRatio,
    totalRatio: totalOverlapArea / candidateArea,
  };
}

function isAcceptableOverlap(metrics: OverlapMetrics, relaxFactor = 1): boolean {
  return (
    metrics.maxSingleRatio <= MAX_SINGLE_OVERLAP_RATIO * relaxFactor &&
    metrics.totalRatio <= MAX_TOTAL_OVERLAP_RATIO * relaxFactor
  );
}

type ITunesLookupResult = {
  artworkUrl100?: string;
};

type ITunesLookupResponse = {
  results?: ITunesLookupResult[];
};

function upscaleArtwork(url: string | undefined): string {
  if (!url) {
    return "";
  }

  return url.replace("100x100bb.jpg", "600x600bb.jpg");
}

function extractAppleTrackId(urlValue: string | null): string {
  if (!urlValue) {
    return "";
  }

  try {
    const url = new URL(urlValue);
    return url.searchParams.get("i") ?? "";
  } catch {
    return "";
  }
}

function extractDeezerTrackId(urlValue: string | null): string {
  if (!urlValue) {
    return "";
  }

  const match = urlValue.match(/\/track\/(\d+)/i);
  return match?.[1] ?? "";
}

async function resolveITunesCoverByTrackId(trackId: string): Promise<string> {
  if (!trackId) {
    return "";
  }

  try {
    const url = new URL("https://itunes.apple.com/lookup");
    url.searchParams.set("id", trackId);
    url.searchParams.set("entity", "song");
    url.searchParams.set("country", "ID");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as ITunesLookupResponse;
    return upscaleArtwork(payload.results?.[0]?.artworkUrl100);
  } catch {
    return "";
  }
}

async function resolveDeezerCoverByTrackId(trackId: string): Promise<string> {
  if (!trackId) {
    return "";
  }

  try {
    const response = await fetch(`https://api.deezer.com/track/${trackId}`, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as {
      album?: { cover_xl?: string; cover_big?: string; cover_medium?: string };
    };

    return payload.album?.cover_xl ?? payload.album?.cover_big ?? payload.album?.cover_medium ?? "";
  } catch {
    return "";
  }
}

async function resolveCoverFallback(track: string, artist: string): Promise<string> {
  try {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", `${track} ${artist}`);
    url.searchParams.set("entity", "song");
    url.searchParams.set("media", "music");
    url.searchParams.set("country", "ID");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as ITunesLookupResponse;
    return upscaleArtwork(payload.results?.[0]?.artworkUrl100);
  } catch {
    return "";
  }
}

async function hydrateMissingMusicCover(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  row: ThreadRow
): Promise<ThreadRow> {
  if (row.media_type !== "music" || row.music_image_url || !row.music_track || !row.music_artist) {
    return row;
  }

  let coverUrl = "";

  if ((row.music_provider ?? "").toLowerCase().includes("itunes")) {
    const appleTrackId = extractAppleTrackId(row.music_external_url ?? null);
    coverUrl = await resolveITunesCoverByTrackId(appleTrackId);
  }

  if (!coverUrl && (row.music_provider ?? "").toLowerCase().includes("deezer")) {
    const deezerTrackId = extractDeezerTrackId(row.music_external_url ?? null);
    coverUrl = await resolveDeezerCoverByTrackId(deezerTrackId);
  }

  if (!coverUrl) {
    coverUrl = await resolveCoverFallback(row.music_track, row.music_artist);
  }

  if (!coverUrl) {
    return row;
  }

  await supabase.from("threads").update({ music_image_url: coverUrl }).eq("id", row.id);

  return {
    ...row,
    music_image_url: coverUrl,
  };
}

async function hydrateMissingMusicCovers(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  rows: ThreadRow[]
): Promise<ThreadRow[]> {
  return Promise.all(rows.map((row) => hydrateMissingMusicCover(supabase, row)));
}

function mapRowsToNotes(rows: ThreadRow[]): ThreadNote[] {
  const notes: ThreadNote[] = [];
  const placedBySegment = new Map<number, PlacementRect[]>();
  const randomBySegment = new Map<number, () => number>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const segment = Math.floor(index / THREADS_PER_SEGMENT);
    const localIndex = index % THREADS_PER_SEGMENT;

    let random = randomBySegment.get(segment);
    if (!random) {
      random = mulberry32(hashString(`segment-layout:${segment}`));
      randomBySegment.set(segment, random);
    }

    const hasRichMedia = row.media_type !== "none";
    const sizeRoll = random();
    const size: ThreadNote["size"] = hasRichMedia
      ? sizeRoll > 0.9
        ? "lg"
        : sizeRoll > 0.44
          ? "md"
          : "sm"
      : sizeRoll > 0.95
        ? "lg"
        : sizeRoll > 0.5
          ? "md"
          : "sm";

    const widthPx = estimateCardWidthPx(size, hasRichMedia);
    const heightPx = estimateCardHeightPx(size, row.media_type);

    const placedRects = placedBySegment.get(segment) ?? [];
    if (!placedBySegment.has(segment)) {
      placedBySegment.set(segment, placedRects);
    }

    const minX = SIDE_GUTTER_PX;
    const maxX = CANVAS_WIDTH_PX - SIDE_GUTTER_PX - widthPx;
    const minY = TOP_GUTTER_PX;
    const maxY = SEGMENT_HEIGHT_PX - BOTTOM_GUTTER_PX - heightPx;

    const driftY = Math.min(localIndex * 2.05, (SEGMENT_HEIGHT_PX - heightPx) * 0.45);

    let chosenX = minX + random() * Math.max(1, maxX - minX);
    let chosenY = minY + random() * Math.max(1, maxY - minY);
    let placementLocked = false;
    let bestCandidate: PlacementRect | null = null;
    let bestCandidateScore = Number.POSITIVE_INFINITY;

    for (let attempt = 0; attempt < MAX_PLACEMENT_TRIES; attempt += 1) {
      const x = minX + random() * Math.max(1, maxX - minX);

      const yBandMax = Math.max(minY + 1, maxY - driftY * 0.4);
      const yBase = minY + random() * Math.max(1, yBandMax - minY);
      const y = clamp(yBase + driftY * random(), minY, maxY);

      const wave = Math.sin((x / CANVAS_WIDTH_PX) * Math.PI * 2 + segment * 0.67) * 7;
      const yAdjusted = clamp(y + wave, minY, maxY);

      const candidate: PlacementRect = {
        x,
        y: yAdjusted,
        width: widthPx,
        height: heightPx,
      };

      const metrics = getOverlapMetrics(candidate, placedRects);
      const score =
        metrics.maxSingleRatio * 2.8 +
        metrics.totalRatio * 1.8 +
        Math.max(0, metrics.maxSingleRatio - MAX_SINGLE_OVERLAP_RATIO) * 4 +
        Math.max(0, metrics.totalRatio - MAX_TOTAL_OVERLAP_RATIO) * 2.2;

      if (score < bestCandidateScore) {
        bestCandidateScore = score;
        bestCandidate = candidate;
      }

      const relax = attempt > MAX_PLACEMENT_TRIES * 0.8 ? 1.08 : 1;
      if (isAcceptableOverlap(metrics, relax)) {
        chosenX = candidate.x;
        chosenY = candidate.y;
        placedRects.push(candidate);
        placementLocked = true;
        break;
      }
    }

    if (!placementLocked && bestCandidate) {
      chosenX = bestCandidate.x;
      chosenY = bestCandidate.y;
      placedRects.push(bestCandidate);
    }

    const toneRoll = random();
    const tone: ThreadNote["tone"] =
      toneRoll > 0.66 ? "cream" : toneRoll > 0.33 ? "orange" : "purple";

    const rotate = Math.round((random() - 0.5) * (hasRichMedia ? 7 : 9));
    const delay = `${Math.round(random() * 1400)}ms`;
    const duration = `${(8.1 + random() * 2.8).toFixed(2)}s`;

    let media: NoteMedia = { kind: "none" };

    if (row.media_type === "image" && row.image_url) {
      media = {
        kind: "image",
        imageUrl: row.image_url,
        caption: `Foto untuk ${row.title}`,
      };
    } else if (row.media_type === "music" && row.music_track && row.music_artist) {
      media = {
        kind: "music",
        track: row.music_track,
        artist: row.music_artist,
        coverUrl: row.music_image_url ?? "",
        previewUrl: row.music_preview_url ?? "",
        externalUrl: row.music_external_url ?? "",
        provider: row.music_provider ?? "Music",
      };
    }

    notes.push({
      id: row.id,
      createdAt: row.created_at,
      thread: row.title,
      message: row.message,
      author: row.author_name,
      year: String(row.batch_year),
      chip: row.tag_label,
      left: `${((chosenX / CANVAS_WIDTH_PX) * 100).toFixed(2)}%`,
      top: `${Math.max(0, Math.round(segment * SEGMENT_HEIGHT_PX + chosenY))}px`,
      rotate,
      delay,
      duration,
      size,
      tone,
      media,
      zIndex: 1000 - localIndex,
    });
  }

  return notes;
}

async function getThreadNotes(): Promise<ThreadNote[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("threads")
      .select(
        "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_image_url,music_preview_url,music_external_url,music_provider,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error && error.message.includes("music_image_url")) {
      const legacy = await supabase
        .from("threads")
        .select(
          "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_preview_url,music_external_url,music_provider,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (legacy.error || !legacy.data) {
        return [];
      }

      const legacyRows = legacy.data.map((row) => ({
          ...(row as Omit<ThreadRow, "music_image_url">),
          music_image_url: null,
        }));

      const hydratedLegacyRows = await hydrateMissingMusicCovers(supabase, legacyRows);
      return mapRowsToNotes(hydratedLegacyRows);
    }

    if (error || !data) {
      return [];
    }

    const hydratedRows = await hydrateMissingMusicCovers(supabase, data as ThreadRow[]);
    return mapRowsToNotes(hydratedRows);
  } catch {
    return [];
  }
}

export default async function Home() {
  const threadNotes = await getThreadNotes();
  const notes = threadNotes;
  const segmentCount = Math.max(1, Math.ceil(notes.length / THREADS_PER_SEGMENT));
  const scatterMinHeight = segmentCount * SEGMENT_HEIGHT_PX;

  return (
    <main className="board-page">
      <div className="wall-glow" aria-hidden="true">
        <span className="wall-blob wall-blob-purple" />
        <span className="wall-blob wall-blob-orange" />
      </div>

      <section className="board-wrap">
        <div className="board-frame">
          <div className="board-surface">
            <header className="board-header flex-col items-center gap-2 sm:flex-row sm:gap-0" aria-label="Judul mading">
              <h1 className="board-title font-new-romantics">Dinding Reuni</h1>
              <Link
                href="/tulis"
                className="inline-flex w-full max-w-[13rem] items-center justify-center rounded-full border border-white/50 bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-lg shadow-black/20 transition hover:scale-[1.02] sm:absolute sm:right-0 sm:top-1/2 sm:w-auto sm:max-w-none sm:-translate-y-1/2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.12em]"
              >
                Tulis Thread
              </Link>
            </header>

            <ThreadScatter notes={notes} scatterMinHeight={scatterMinHeight} />
            </div>
          </div>
      </section>

      <WriteThreadQr />
    </main>
  );
}
