"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

type ThreadScatterProps = {
  notes: ThreadNote[];
  scatterMinHeight: number;
};

type HighlightKind = "long" | "short";

type ThreadApiItem = {
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

type PlacementRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const THREADS_PER_SEGMENT = 100;
const SEGMENT_HEIGHT_PX = 1020;
const CANVAS_WIDTH_PX = 1920;
const SIDE_GUTTER_PX = 22;
const TOP_GUTTER_PX = 12;
const BOTTOM_GUTTER_PX = 22;
const POLL_INTERVAL_MS = 7000;
const MAX_PLACEMENT_TRIES = 84;
const MAX_SINGLE_OVERLAP_RATIO = 0.16;
const MAX_TOTAL_OVERLAP_RATIO = 0.3;

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseTopPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLeftPercent(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function estimateCardHeightPx(size: ThreadNote["size"], mediaType: ThreadApiItem["media_type"]): number {
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
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

  return xOverlap * yOverlap;
}

function buildRectFromNote(note: ThreadNote): PlacementRect {
  const hasMedia = note.media.kind !== "none";
  const width = estimateCardWidthPx(note.size, hasMedia);
  const height = estimateCardHeightPx(note.size, note.media.kind === "none" ? "none" : note.media.kind);

  const x = (parseLeftPercent(note.left) / 100) * CANVAS_WIDTH_PX;
  const y = parseTopPx(note.top);

  return { x, y, width, height };
}

function calcOverlapScore(candidate: PlacementRect, placed: PlacementRect[]): number {
  const area = candidate.width * candidate.height;
  let totalRatio = 0;
  let maxSingle = 0;

  for (const rect of placed) {
    const overlap = overlapArea(candidate, rect);
    if (overlap === 0) {
      continue;
    }

    const ratioToCandidate = overlap / area;
    totalRatio += ratioToCandidate;

    const single = overlap / Math.min(area, rect.width * rect.height);
    if (single > maxSingle) {
      maxSingle = single;
    }
  }

  const penalty =
    Math.max(0, maxSingle - MAX_SINGLE_OVERLAP_RATIO) * 5 +
    Math.max(0, totalRatio - MAX_TOTAL_OVERLAP_RATIO) * 3;

  return maxSingle * 3 + totalRatio * 2 + penalty;
}

function chooseSize(mediaType: ThreadApiItem["media_type"], random: () => number): ThreadNote["size"] {
  const hasMedia = mediaType !== "none";
  const roll = random();

  if (hasMedia) {
    if (roll > 0.9) {
      return "lg";
    }

    if (roll > 0.44) {
      return "md";
    }

    return "sm";
  }

  if (roll > 0.95) {
    return "lg";
  }

  if (roll > 0.5) {
    return "md";
  }

  return "sm";
}

function createNoteFromApiItem(item: ThreadApiItem, existingNotes: ThreadNote[], order: number): ThreadNote {
  const random = mulberry32(hashString(`${item.id}:${item.created_at}`));
  const toneRoll = random();
  const tone: ThreadNote["tone"] = toneRoll > 0.66 ? "cream" : toneRoll > 0.33 ? "orange" : "purple";
  const size = chooseSize(item.media_type, random);
  const hasMedia = item.media_type !== "none";
  const width = estimateCardWidthPx(size, hasMedia);
  const height = estimateCardHeightPx(size, item.media_type);

  const placedRects = existingNotes
    .filter((note) => parseTopPx(note.top) < SEGMENT_HEIGHT_PX)
    .map((note) => buildRectFromNote(note));

  const minX = SIDE_GUTTER_PX;
  const maxX = CANVAS_WIDTH_PX - SIDE_GUTTER_PX - width;
  const minY = TOP_GUTTER_PX;
  const maxY = SEGMENT_HEIGHT_PX - BOTTOM_GUTTER_PX - height;

  let bestCandidate: PlacementRect = {
    x: minX + random() * Math.max(1, maxX - minX),
    y: minY + random() * Math.max(1, maxY - minY),
    width,
    height,
  };
  let bestScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < MAX_PLACEMENT_TRIES; attempt += 1) {
    const x = minX + random() * Math.max(1, maxX - minX);
    const yWeighted = minY + Math.pow(random(), 1.6) * Math.max(1, maxY - minY);

    const candidate: PlacementRect = {
      x,
      y: clamp(yWeighted + Math.sin((x / CANVAS_WIDTH_PX) * Math.PI * 2) * 8, minY, maxY),
      width,
      height,
    };

    const score = calcOverlapScore(candidate, placedRects);
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }

    if (score < 0.03) {
      break;
    }
  }

  const media: NoteMedia =
    item.media_type === "image" && item.image_url
      ? {
          kind: "image",
          imageUrl: item.image_url,
          caption: `Foto untuk ${item.title}`,
        }
      : item.media_type === "music" && item.music_track && item.music_artist
        ? {
            kind: "music",
            track: item.music_track,
            artist: item.music_artist,
            coverUrl: item.music_image_url ?? "",
            previewUrl: item.music_preview_url ?? "",
            externalUrl: item.music_external_url ?? "",
            provider: item.music_provider ?? "Music",
          }
        : { kind: "none" };

  return {
    id: item.id,
    thread: item.title,
    message: item.message,
    author: item.author_name,
    year: String(item.batch_year),
    chip: item.tag_label,
    left: `${((bestCandidate.x / CANVAS_WIDTH_PX) * 100).toFixed(2)}%`,
    top: `${Math.round(bestCandidate.y)}px`,
    rotate: Math.round((random() - 0.5) * (hasMedia ? 7 : 9)),
    delay: `${Math.round(random() * 1400)}ms`,
    duration: `${(8.1 + random() * 2.8).toFixed(2)}s`,
    size,
    tone,
    media,
    zIndex: 1000 + order,
  };
}

export default function ThreadScatter({ notes, scatterMinHeight }: ThreadScatterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayNotes, setDisplayNotes] = useState<ThreadNote[]>(notes);
  const [frontOrderMap, setFrontOrderMap] = useState<Record<string, number>>({});
  const [highlightMap, setHighlightMap] = useState<Record<string, HighlightKind>>({});

  const frontCounterRef = useRef(0);
  const notesRef = useRef<ThreadNote[]>(notes);
  const highlightTimersRef = useRef<Record<string, number>>({});
  const pollingBusyRef = useRef(false);
  const handledInitialHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    setDisplayNotes(notes);
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(highlightTimersRef.current)) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  function bringCardToFront(id: string) {
    frontCounterRef.current += 1;
    const order = frontCounterRef.current;

    setFrontOrderMap((previous) => ({
      ...previous,
      [id]: order,
    }));
  }

  function setTemporaryHighlight(id: string, kind: HighlightKind, durationMs: number) {
    const existingTimer = highlightTimersRef.current[id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setHighlightMap((previous) => ({
      ...previous,
      [id]: kind,
    }));

    highlightTimersRef.current[id] = window.setTimeout(() => {
      setHighlightMap((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      delete highlightTimersRef.current[id];
    }, durationMs);
  }

  useEffect(() => {
    const highlightThreadId = searchParams.get("newThreadId") ?? searchParams.get("newThread");

    if (!highlightThreadId || handledInitialHighlightRef.current === highlightThreadId) {
      return;
    }

    handledInitialHighlightRef.current = highlightThreadId;
    bringCardToFront(highlightThreadId);
    setTemporaryHighlight(highlightThreadId, "long", 10000);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("newThreadId");
    params.delete("newThread");

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    async function pollThreads() {
      if (pollingBusyRef.current) {
        return;
      }

      pollingBusyRef.current = true;

      try {
        const response = await fetch("/api/threads?limit=500", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          threads?: ThreadApiItem[];
        };

        const incomingRows = payload.threads ?? [];
        if (incomingRows.length === 0) {
          return;
        }

        const currentNotes = notesRef.current;
        const existingIds = new Set(currentNotes.map((note) => note.id));
        const unseenRows = incomingRows.filter((row) => !existingIds.has(row.id));

        if (unseenRows.length === 0) {
          return;
        }

        const rowsForPlacement = [...unseenRows].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const working = [...currentNotes];
        const createdById = new Map<string, ThreadNote>();

        for (const row of rowsForPlacement) {
          const note = createNoteFromApiItem(row, working, working.length + createdById.size + 1);
          working.unshift(note);
          createdById.set(row.id, note);
        }

        const orderedNew = unseenRows
          .map((row) => createdById.get(row.id))
          .filter((note): note is ThreadNote => Boolean(note));

        if (orderedNew.length === 0) {
          return;
        }

        const next = [...orderedNew, ...currentNotes].slice(0, 500);
        notesRef.current = next;
        setDisplayNotes(next);

        for (const note of orderedNew) {
          setTemporaryHighlight(note.id, "short", 3600);
          bringCardToFront(note.id);
        }
      } catch {
        // Keep UI stable when polling fails.
      } finally {
        pollingBusyRef.current = false;
      }
    }

    const intervalId = window.setInterval(pollThreads, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      bringCardToFront(id);
    }
  }

  return (
    <section
      className="notes-scatter"
      aria-label="Kumpulan thread kesan pesan"
      style={{
        minHeight: `${Math.max(
          scatterMinHeight,
          Math.max(1, Math.ceil(displayNotes.length / THREADS_PER_SEGMENT)) * SEGMENT_HEIGHT_PX
        )}px`,
      }}
    >
      {displayNotes.length === 0 && (
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

      {displayNotes.map((note, index) => {
        const frontOrder = frontOrderMap[note.id] ?? 0;
        const highlightKind = highlightMap[note.id];

        const placementStyle: CSSProperties = {
          left: note.left,
          top: note.top,
          animationDelay: note.delay,
          animationDuration: note.duration,
          zIndex: frontOrder > 0 ? 10000 + frontOrder : note.zIndex ?? 1,
        };

        const cardStyle: CSSProperties = {
          transform: `rotate(${note.rotate}deg)`,
        };

        const hasMedia = note.media.kind !== "none";

        return (
          <article
            key={note.id}
            className="thread-note cursor-pointer"
            style={placementStyle}
            onClick={() => bringCardToFront(note.id)}
            onTouchStart={() => bringCardToFront(note.id)}
            onPointerDown={() => bringCardToFront(note.id)}
            onKeyDown={(event) => handleCardKeyDown(event, note.id)}
            tabIndex={0}
            aria-label={`Buka thread ${note.thread}`}
          >
            <div
              className={`thread-note-card thread-note-${note.tone} note-${note.size} note-tilt-${(index % 6) + 1} ${hasMedia ? "thread-note-with-media" : ""} ${
                highlightKind === "long"
                  ? "thread-note-highlight-long"
                  : highlightKind === "short"
                    ? "thread-note-highlight-short"
                    : ""
              }`}
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
  );
}
