"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ThreadsPerSegment } from "@/lib/thread-layout";

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

type ThreadScatterProps = {
  notes: ThreadNote[];
  scatterMinHeight: number;
  threadsPerSegment: ThreadsPerSegment;
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

const BASE_SEGMENT_HEIGHT_PX = 1080;
const SEGMENT_VIEWPORT_OFFSET_PX = 220;
const CANVAS_WIDTH_PX = 1920;
const SIDE_GUTTER_PX = 22;
const TOP_GUTTER_PX = 12;
const BOTTOM_GUTTER_PX = 22;
const COLLISION_PADDING_PX = 10;
const POLL_MIN_INTERVAL_MS = 3500;
const POLL_MAX_INTERVAL_MS = 16000;
const POLL_IDLE_INCREMENT_MS = 1500;
const POLL_FETCH_LIMIT = 120;
const MAX_PLACEMENT_TRIES = 120;
const MAX_SINGLE_OVERLAP_RATIO = 0.11;
const MAX_TOTAL_OVERLAP_RATIO = 0.22;

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

function calculateResponsiveSegmentHeight(): number {
  if (typeof window === "undefined") {
    return BASE_SEGMENT_HEIGHT_PX;
  }

  return Math.max(BASE_SEGMENT_HEIGHT_PX, Math.round(window.innerHeight - SEGMENT_VIEWPORT_OFFSET_PX));
}

function remapTopToSegmentHeight(topValue: string, targetSegmentHeight: number): string {
  const topPx = parseTopPx(topValue);
  if (targetSegmentHeight === BASE_SEGMENT_HEIGHT_PX) {
    return `${Math.max(0, Math.round(topPx))}px`;
  }

  const segmentIndex = Math.floor(topPx / BASE_SEGMENT_HEIGHT_PX);
  const segmentStart = segmentIndex * BASE_SEGMENT_HEIGHT_PX;
  const localTop = topPx - segmentStart;
  const scaledLocalTop = localTop * (targetSegmentHeight / BASE_SEGMENT_HEIGHT_PX);

  return `${Math.max(0, Math.round(segmentIndex * targetSegmentHeight + scaledLocalTop))}px`;
}

function getLatestCreatedAtFromNotes(notes: ThreadNote[]): string {
  let latest = "";

  for (const note of notes) {
    if (note.createdAt && note.createdAt > latest) {
      latest = note.createdAt;
    }
  }

  return latest;
}

function getLatestCreatedAtFromRows(rows: ThreadApiItem[]): string {
  let latest = "";

  for (const row of rows) {
    if (row.created_at > latest) {
      latest = row.created_at;
    }
  }

  return latest;
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
    .filter((note) => parseTopPx(note.top) < BASE_SEGMENT_HEIGHT_PX)
    .map((note) => buildRectFromNote(note));

  const minX = SIDE_GUTTER_PX;
  const maxX = CANVAS_WIDTH_PX - SIDE_GUTTER_PX - width;
  const minY = TOP_GUTTER_PX;
  const maxY = BASE_SEGMENT_HEIGHT_PX - BOTTOM_GUTTER_PX - height;

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
    createdAt: item.created_at,
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

export default function ThreadScatter({
  notes,
  scatterMinHeight,
  threadsPerSegment,
}: ThreadScatterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayNotes, setDisplayNotes] = useState<ThreadNote[]>(notes);
  const [responsiveSegmentHeight, setResponsiveSegmentHeight] = useState(BASE_SEGMENT_HEIGHT_PX);
  const [frontOrderMap, setFrontOrderMap] = useState<Record<string, number>>({});
  const [highlightMap, setHighlightMap] = useState<Record<string, HighlightKind>>({});
  const [freshMap, setFreshMap] = useState<Record<string, true>>({});

  const frontCounterRef = useRef(0);
  const notesRef = useRef<ThreadNote[]>(notes);
  const noteElementsRef = useRef<Record<string, HTMLElement | null>>({});
  const latestSeenCreatedAtRef = useRef(getLatestCreatedAtFromNotes(notes));
  const highlightTimersRef = useRef<Record<string, number>>({});
  const freshTimersRef = useRef<Record<string, number>>({});
  const pollingBusyRef = useRef(false);
  const handledInitialHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    setDisplayNotes(notes);
    notesRef.current = notes;
    latestSeenCreatedAtRef.current = getLatestCreatedAtFromNotes(notes);
  }, [notes]);

  useEffect(() => {
    const updateResponsiveSegmentHeight = () => {
      setResponsiveSegmentHeight(calculateResponsiveSegmentHeight());
    };

    updateResponsiveSegmentHeight();
    window.addEventListener("resize", updateResponsiveSegmentHeight);

    return () => window.removeEventListener("resize", updateResponsiveSegmentHeight);
  }, []);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(highlightTimersRef.current)) {
        window.clearTimeout(timerId);
      }

      for (const timerId of Object.values(freshTimersRef.current)) {
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

  function markFresh(id: string, durationMs: number) {
    const existingTimer = freshTimersRef.current[id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    setFreshMap((previous) => ({
      ...previous,
      [id]: true,
    }));

    freshTimersRef.current[id] = window.setTimeout(() => {
      setFreshMap((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });

      delete freshTimersRef.current[id];
    }, durationMs);
  }

  function revealThread(id: string, highlightDurationMs: number) {
    const reducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    bringCardToFront(id);
    markFresh(id, 1300);
    setTemporaryHighlight(id, "long", highlightDurationMs);

    const targetElement = noteElementsRef.current[id];
    if (!targetElement) {
      return;
    }

    requestAnimationFrame(() => {
      targetElement.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
        inline: "nearest",
      });
    });
  }

  useEffect(() => {
    const highlightThreadId = searchParams.get("newThreadId");
    const highlightNewestFlag = searchParams.get("newThread");

    const token = highlightThreadId
      ? `id:${highlightThreadId}`
      : highlightNewestFlag
        ? `flag:${highlightNewestFlag}`
        : "";

    if (!token || handledInitialHighlightRef.current === token) {
      return;
    }

    let targetId = "";

    if (highlightThreadId) {
      const exists = displayNotes.some((note) => note.id === highlightThreadId);
      if (!exists) {
        return;
      }

      targetId = highlightThreadId;
    } else if (highlightNewestFlag === "1") {
      targetId = displayNotes[0]?.id ?? "";
      if (!targetId) {
        return;
      }
    } else if (highlightNewestFlag) {
      const exists = displayNotes.some((note) => note.id === highlightNewestFlag);
      if (!exists) {
        return;
      }

      targetId = highlightNewestFlag;
    }

    if (!targetId) {
      return;
    }

    handledInitialHighlightRef.current = token;
    revealThread(targetId, 10000);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("newThreadId");
    params.delete("newThread");

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
  }, [displayNotes, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let nextDelay = POLL_MIN_INTERVAL_MS;

    const scheduleNext = (delayMs: number) => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(pollThreads, delayMs);
    };

    async function pollThreads() {
      if (cancelled) {
        return;
      }

      if (pollingBusyRef.current) {
        scheduleNext(nextDelay);
        return;
      }

      pollingBusyRef.current = true;
      let foundNewRows = false;

      try {
        const params = new URLSearchParams({
          limit: String(POLL_FETCH_LIMIT),
        });

        if (latestSeenCreatedAtRef.current) {
          params.set("since", latestSeenCreatedAtRef.current);
        }

        const response = await fetch(`/api/threads?${params.toString()}`, {
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

        const latestFromRows = getLatestCreatedAtFromRows(incomingRows);
        if (latestFromRows > latestSeenCreatedAtRef.current) {
          latestSeenCreatedAtRef.current = latestFromRows;
        }

        const currentNotes = notesRef.current;
        const existingIds = new Set(currentNotes.map((note) => note.id));
        const unseenRows = incomingRows.filter((row) => !existingIds.has(row.id));

        if (unseenRows.length === 0) {
          return;
        }

        foundNewRows = true;

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
        latestSeenCreatedAtRef.current = getLatestCreatedAtFromNotes(next);
        setDisplayNotes(next);

        for (const note of orderedNew) {
          markFresh(note.id, 900);
          setTemporaryHighlight(note.id, "short", 3600);
          bringCardToFront(note.id);
        }
      } catch {
        // Keep UI stable when polling fails.
      } finally {
        pollingBusyRef.current = false;

        if (foundNewRows) {
          nextDelay = POLL_MIN_INTERVAL_MS;
        } else {
          nextDelay = Math.min(POLL_MAX_INTERVAL_MS, nextDelay + POLL_IDLE_INCREMENT_MS);
        }

        if (document.visibilityState === "hidden") {
          nextDelay = POLL_MAX_INTERVAL_MS;
        }

        scheduleNext(nextDelay);
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || cancelled) {
        return;
      }

      nextDelay = POLL_MIN_INTERVAL_MS;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      void pollThreads();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNext(1000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      bringCardToFront(id);
    }
  }

  const segmentCount = Math.max(1, Math.ceil(displayNotes.length / threadsPerSegment));
  const resolvedScatterMinHeight = Math.max(scatterMinHeight, segmentCount * responsiveSegmentHeight);

  return (
    <section
      className="notes-scatter"
      aria-label="Kumpulan thread kesan pesan"
      style={{
        minHeight: `${resolvedScatterMinHeight}px`,
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
        const isFresh = freshMap[note.id];

        const placementStyle: CSSProperties = {
          left: note.left,
          top: remapTopToSegmentHeight(note.top, responsiveSegmentHeight),
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
            ref={(element) => {
              noteElementsRef.current[note.id] = element;
            }}
            className="thread-note cursor-pointer"
            style={placementStyle}
            onClick={() => bringCardToFront(note.id)}
            onTouchStart={() => bringCardToFront(note.id)}
            onPointerDown={() => bringCardToFront(note.id)}
            onKeyDown={(event) => handleCardKeyDown(event, note.id)}
            tabIndex={0}
            aria-label={`Buka thread ${note.thread}`}
          >
            <div className={`thread-note-shell ${isFresh ? "thread-note-shell-fresh" : ""}`}>
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
            </div>
          </article>
        );
      })}
    </section>
  );
}
