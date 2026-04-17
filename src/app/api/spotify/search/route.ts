import { NextRequest, NextResponse } from "next/server";

type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  previewUrl: string;
  externalUrl: string;
  provider: string;
};

type ITunesTrack = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
};

type ITunesSearchResponse = {
  resultCount: number;
  results: ITunesTrack[];
};

type DeezerTrack = {
  id: number;
  title: string;
  artist?: {
    name?: string;
  };
  album?: {
    cover_big?: string;
    cover_medium?: string;
  };
  preview?: string;
  link?: string;
};

type DeezerSearchResponse = {
  data?: DeezerTrack[];
};

function upscaleArtwork(url: string | undefined): string {
  if (!url) {
    return "";
  }

  return url.replace("100x100bb.jpg", "600x600bb.jpg");
}

function dedupeTracks(tracks: MusicTrack[]): MusicTrack[] {
  const seen = new Set<string>();
  const unique: MusicTrack[] = [];

  for (const track of tracks) {
    const key = `${track.name.toLowerCase().trim()}::${track.artist.toLowerCase().trim()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(track);
  }

  return unique;
}

async function fetchITunesTracks(query: string, limit: number, country?: string): Promise<MusicTrack[]> {
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("entity", "song");
  url.searchParams.set("media", "music");
  url.searchParams.set("limit", String(limit));

  if (country) {
    url.searchParams.set("country", country);
    url.searchParams.set("lang", "id_id");
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`iTunes ${country ?? "global"} status ${response.status}`);
  }

  const payload = (await response.json()) as ITunesSearchResponse;

  return (payload.results ?? []).map((track) => ({
    id: `itunes-${track.trackId}`,
    name: track.trackName,
    artist: track.artistName,
    imageUrl: upscaleArtwork(track.artworkUrl100),
    previewUrl: track.previewUrl ?? "",
    externalUrl: track.trackViewUrl ?? "",
    provider: country ? "iTunes ID" : "iTunes",
  }));
}

async function fetchDeezerTracks(query: string, limit: number): Promise<MusicTrack[]> {
  const url = new URL("https://api.deezer.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Deezer status ${response.status}`);
  }

  const payload = (await response.json()) as DeezerSearchResponse;

  return (payload.data ?? []).map((track) => ({
    id: `deezer-${track.id}`,
    name: track.title,
    artist: track.artist?.name ?? "Unknown Artist",
    imageUrl: track.album?.cover_big ?? track.album?.cover_medium ?? "",
    previewUrl: track.preview ?? "",
    externalUrl: track.link ?? "",
    provider: "Deezer",
  }));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const settled = await Promise.allSettled([
      fetchITunesTracks(query, 14, "ID"),
      fetchDeezerTracks(query, 14),
      fetchITunesTracks(query, 10),
    ]);

    const successfulResults = settled
      .filter((result): result is PromiseFulfilledResult<MusicTrack[]> => result.status === "fulfilled")
      .map((result) => result.value);

    const tracks = dedupeTracks(successfulResults.flat()).slice(0, 24);

    if (tracks.length > 0) {
      return NextResponse.json({ tracks });
    }

    return NextResponse.json(
      { error: "Belum ada hasil lagu untuk kata kunci ini. Coba judul/artis lain." },
      { status: 404 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: `Music API belum siap: ${detail}` }, { status: 500 });
  }
}
