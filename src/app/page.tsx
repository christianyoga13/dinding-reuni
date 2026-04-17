import type { CSSProperties } from "react";
import Link from "next/link";

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
};

type ThreadNote = {
  id: string;
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
const SEGMENT_HEIGHT_PX = 980;
const GRID_COLUMNS = 10;
const GRID_ROWS = 10;
const TOP_GUTTER_PX = 20;
const ROW_GAP_PX = 90;
const LEFT_GUTTER_PERCENT = 2.8;
const CELL_WIDTH_PERCENT = 9.35;
const MIN_LEFT_PERCENT = 1.2;
const MAX_LEFT_PERCENT = 88.8;

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

function shuffledRange(length: number, seed: number): number[] {
  const values = Array.from({ length }, (_, index) => index);
  const random = mulberry32(seed);

  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
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
  return rows.map((row, index) => {
    const segment = Math.floor(index / THREADS_PER_SEGMENT);
    const localIndex = index % THREADS_PER_SEGMENT;
    const gridRow = Math.floor(localIndex / GRID_COLUMNS) % GRID_ROWS;
    const slotInRow = localIndex % GRID_COLUMNS;

    const baseSeed = hashString(`${row.id}:${index}`);
    const random = mulberry32(baseSeed);

    const rowSeed = hashString(`segment:${segment}:row:${gridRow}`);
    const columnOrder = shuffledRange(GRID_COLUMNS, rowSeed);
    const gridCol = columnOrder[slotInRow];

    const jitterX = (random() - 0.5) * 3.8;
    const jitterY = (random() - 0.5) * 20;

    const leftRaw = LEFT_GUTTER_PERCENT + gridCol * CELL_WIDTH_PERCENT + jitterX;
    const left = Math.max(MIN_LEFT_PERCENT, Math.min(MAX_LEFT_PERCENT, leftRaw));

    const top =
      segment * SEGMENT_HEIGHT_PX +
      TOP_GUTTER_PX +
      gridRow * ROW_GAP_PX +
      jitterY;

    const sizeRoll = random();
    const size: ThreadNote["size"] = sizeRoll > 0.84 ? "lg" : sizeRoll > 0.52 ? "md" : "sm";

    const toneRoll = random();
    const tone: ThreadNote["tone"] =
      toneRoll > 0.66 ? "cream" : toneRoll > 0.33 ? "orange" : "purple";

    const rotate = Math.round((random() - 0.5) * 8);
    const delay = `${Math.round(random() * 1200)}ms`;
    const duration = `${(7.4 + random() * 2.9).toFixed(2)}s`;

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

    return {
      id: row.id,
      thread: row.title,
      message: row.message,
      author: row.author_name,
      year: String(row.batch_year),
      chip: row.tag_label,
      left: `${left.toFixed(2)}%`,
      top: `${Math.max(0, Math.round(top))}px`,
      rotate,
      delay,
      duration,
      size,
      tone,
      media,
      zIndex: rows.length - index,
    };
  });
}

async function getThreadNotes(): Promise<ThreadNote[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("threads")
      .select(
        "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_image_url,music_preview_url,music_external_url,music_provider"
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error && error.message.includes("music_image_url")) {
      const legacy = await supabase
        .from("threads")
        .select(
          "id,title,message,author_name,batch_year,tag_label,media_type,image_url,music_track,music_artist,music_preview_url,music_external_url,music_provider"
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
            <header className="board-header" aria-label="Judul mading">
              <h1 className="board-title font-new-romantics">Dinding Reuni</h1>
              <Link
                href="/tulis"
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-lg shadow-black/20 transition hover:scale-[1.02]"
              >
                Tulis Thread
              </Link>
            </header>

            <section
              className="notes-scatter"
              aria-label="Kumpulan thread kesan pesan"
              style={{ minHeight: `${scatterMinHeight}px` }}
            >
              {notes.length === 0 && (
                <article className="thread-note">
                  <div className="thread-note-card thread-note-cream note-md">
                    <div className="note-pin" aria-hidden="true" />
                    <div className="thread-topline">
                      <p>Belum Ada Thread</p>
                      <span>Info</span>
                    </div>
                    <p className="note-message">
                      Data thread dari database belum ada atau koneksi database belum siap.
                    </p>
                    <p className="note-meta">Tambahkan dari tombol Tulis Thread</p>
                    <span className="note-chip">Database</span>
                  </div>
                </article>
              )}

              {notes.map((note, index) => {
                const placementStyle: CSSProperties = {
                  left: note.left,
                  top: note.top,
                  animationDelay: note.delay,
                  animationDuration: note.duration,
                  zIndex: note.zIndex ?? 1,
                };

                const cardStyle: CSSProperties = {
                  transform: `rotate(${note.rotate}deg)`,
                };

                const hasMedia = note.media.kind !== "none";

                return (
                  <article key={note.id} className="thread-note" style={placementStyle}>
                    <div
                      className={`thread-note-card thread-note-${note.tone} note-${note.size} note-tilt-${(index % 6) + 1} ${hasMedia ? "thread-note-with-media" : ""}`}
                      style={cardStyle}
                    >
                      <div className="note-pin" aria-hidden="true" />
                      <div className="thread-topline">
                        <p>{note.thread}</p>
                        <span>{note.year}</span>
                      </div>
                      <p className="note-message">{note.message}</p>

                      {note.media.kind === "image" && (
                        <figure className="note-media note-media-image">
                          <img src={note.media.imageUrl} alt={`Foto untuk ${note.thread}`} loading="lazy" />
                          <figcaption>{note.media.caption}</figcaption>
                        </figure>
                      )}

                      {note.media.kind === "music" && (
                        <div className="note-media note-media-music">
                          <div className="music-mini-layout">
                            {note.media.coverUrl ? (
                              <img
                                src={note.media.coverUrl}
                                alt={`Cover ${note.media.track}`}
                                className="music-mini-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="music-mini-cover music-mini-cover-placeholder" aria-hidden="true" />
                            )}
                            <div className="music-mini-info">
                              <p className="spotify-mini-title">{note.media.track}</p>
                              <p className="spotify-mini-artist">{note.media.artist}</p>
                              <p className="music-provider-label">{note.media.provider}</p>
                            </div>
                          </div>
                          {note.media.previewUrl ? (
                            <audio className="music-audio" controls preload="none" src={note.media.previewUrl} />
                          ) : note.media.externalUrl ? (
                            <a
                              href={note.media.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="music-open-link"
                            >
                              Buka di {note.media.provider}
                            </a>
                          ) : (
                            <p className="mt-2 text-[11px] text-[#31204e]/80">Preview tidak tersedia</p>
                          )}
                        </div>
                      )}

                      <p className="note-meta">{note.author}</p>
                      <span className="note-chip">{note.chip}</span>
                    </div>
                  </article>
                );
              })}
            </section>
            </div>
          </div>
      </section>
    </main>
  );
}
