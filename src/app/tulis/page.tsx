"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, MouseEvent, TouchEvent, useMemo, useRef, useState } from "react";

type MediaType = "none" | "image" | "music";

type MusicTrack = {
  id: string;
  name: string;
  artist: string;
  imageUrl: string;
  previewUrl: string;
  externalUrl: string;
  provider: string;
};

type DraftThread = {
  threadTitle: string;
  message: string;
  author: string;
  year: string;
  chip: string;
  mediaType: MediaType;
  imageUrl?: string;
  musicTrack?: string;
  musicArtist?: string;
  musicImageUrl?: string;
  musicPreviewUrl?: string;
  musicExternalUrl?: string;
  musicProvider?: string;
};

export default function TulisThreadPage() {
  const router = useRouter();
  const [threadTitle, setThreadTitle] = useState("");
  const [message, setMessage] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("");
  const [chip, setChip] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("none");

  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageUploadStatus, setImageUploadStatus] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState<MusicTrack[]>([]);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<MusicTrack | null>(null);
  const [musicSearchStatus, setMusicSearchStatus] = useState("");
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaPanelRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState("");

  const canSubmit = useMemo(() => {
    const baseValid =
      threadTitle.trim().length > 0 &&
      message.trim().length > 0 &&
      author.trim().length > 0 &&
      year.trim().length > 0;

    if (!baseValid) {
      return false;
    }

    if (mediaType === "none") {
      return true;
    }

    if (mediaType === "image") {
      return uploadedImageUrl.trim().length > 0;
    }

    return selectedMusicTrack !== null;
  }, [author, mediaType, message, selectedMusicTrack, threadTitle, uploadedImageUrl, year]);

  function resetForm() {
    setThreadTitle("");
    setMessage("");
    setAuthor("");
    setYear("");
    setChip("");
    setMediaType("none");

    setUploadedImageUrl("");
    setImageUploadStatus("");
    setIsUploadingImage(false);

    setMusicQuery("");
    setMusicResults([]);
    setSelectedMusicTrack(null);
    setMusicSearchStatus("");
    setIsSearchingMusic(false);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setStatus("");
    setImageUploadStatus("Mengunggah gambar...");
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
        optimized?: boolean;
        originalSize?: number;
        finalSize?: number;
      };

      if (!response.ok || !data.url) {
        setUploadedImageUrl("");
        setImageUploadStatus(data.error ?? "Upload gambar gagal.");
        return;
      }

      setUploadedImageUrl(data.url);

      if (data.optimized && data.originalSize && data.finalSize) {
        const savedPercent = Math.max(
          0,
          Math.round(((data.originalSize - data.finalSize) / data.originalSize) * 100)
        );
        setImageUploadStatus(`Gambar berhasil diunggah. Ukuran dioptimasi ${savedPercent}%.`);
      } else {
        setImageUploadStatus("Gambar berhasil diunggah.");
      }
    } catch {
      setUploadedImageUrl("");
      setImageUploadStatus("Upload gagal, coba lagi.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function searchMusic() {
    const query = musicQuery.trim();
    if (query.length < 2) {
      setMusicSearchStatus("Masukkan minimal 2 karakter untuk mencari lagu.");
      setMusicResults([]);
      return;
    }

    setStatus("");
    setIsSearchingMusic(true);
    setMusicSearchStatus("Mencari lagu...");

    try {
      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, {
        method: "GET",
      });

      const data = (await response.json()) as {
        tracks?: MusicTrack[];
        error?: string;
      };

      if (!response.ok) {
        setMusicResults([]);
        setMusicSearchStatus(data.error ?? "Gagal mencari lagu.");
        return;
      }

      const tracks = data.tracks ?? [];
      setMusicResults(tracks);
      setSelectedMusicTrack(null);

      if (tracks.length === 0) {
        setMusicSearchStatus("Lagu tidak ditemukan.");
      } else {
        setMusicSearchStatus(`Ditemukan ${tracks.length} lagu. Pilih salah satu.`);
      }
    } catch {
      setMusicResults([]);
      setMusicSearchStatus("Gagal terhubung ke music API.");
    } finally {
      setIsSearchingMusic(false);
    }
  }

  function handleMediaTypeChange(type: MediaType) {
    setMediaType(type);
    setStatus("");

    if (type !== "image") {
      setUploadedImageUrl("");
      setImageUploadStatus("");
      setIsUploadingImage(false);
    }

    if (type !== "music") {
      setMusicQuery("");
      setMusicResults([]);
      setSelectedMusicTrack(null);
      setMusicSearchStatus("");
      setIsSearchingMusic(false);
    }

    if (type !== "none") {
      requestAnimationFrame(() => {
        const touchDevice =
          typeof window !== "undefined" &&
          ("ontouchstart" in window || navigator.maxTouchPoints > 0);

        mediaPanelRef.current?.scrollIntoView({
          behavior: touchDevice ? "auto" : "smooth",
          block: "nearest",
        });
      });
    }
  }

  function openImagePicker() {
    imageInputRef.current?.click();
  }

  function handleMediaTypeTap(
    type: MediaType,
    event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();
    handleMediaTypeChange(type);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isSubmitting) {
      setStatus("Mohon lengkapi data dulu sebelum kirim.");
      return;
    }

    const payload: DraftThread = {
      threadTitle: threadTitle.trim(),
      message: message.trim(),
      author: author.trim(),
      year: year.trim(),
      chip: chip.trim() || "Thread Baru",
      mediaType,
      imageUrl: mediaType === "image" ? uploadedImageUrl : undefined,
      musicTrack: mediaType === "music" ? selectedMusicTrack?.name : undefined,
      musicArtist: mediaType === "music" ? selectedMusicTrack?.artist : undefined,
      musicImageUrl: mediaType === "music" ? selectedMusicTrack?.imageUrl : undefined,
      musicPreviewUrl: mediaType === "music" ? selectedMusicTrack?.previewUrl : undefined,
      musicExternalUrl: mediaType === "music" ? selectedMusicTrack?.externalUrl : undefined,
      musicProvider: mediaType === "music" ? selectedMusicTrack?.provider : undefined,
    };

    setIsSubmitting(true);
    setStatus("Menyimpan thread ke database...");

    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
        thread?: {
          id?: string;
        };
      };

      if (!response.ok) {
        setStatus(data.error ?? "Gagal menyimpan thread ke database.");
        return;
      }

      const createdId = data.thread?.id?.trim();
      const redirectTarget = createdId
        ? `/?newThreadId=${encodeURIComponent(createdId)}`
        : `/?newThread=1`;

      router.push(redirectTarget);
      return;
    } catch {
      setStatus("Gagal terhubung ke server database. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4efe5] p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[#674622]/30 bg-gradient-to-b from-[#d8a774] to-[#c7925f] p-4 shadow-2xl shadow-[#5a3b1a]/20 sm:p-5">
          <div className="rounded-xl border border-[#5f3f1e]/30 bg-[#fff8ed]/90 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-new-romantics text-4xl text-[#3a248d] sm:text-5xl">Tulis Thread</h1>
              <Link
                href="/"
                className="rounded-full border border-[#6e4a22]/30 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#52361a] transition hover:bg-white"
              >
                Kembali
              </Link>
            </div>
            <p className="mt-2 text-sm text-[#5c4227]">
              Tamu/alumni bisa menambahkan kesan pesan dengan upload gambar langsung atau pilih lagu dari API gratis.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Judul Thread</span>
                <input
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  placeholder="Contoh: Thread Nostalgia Kantin"
                  className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Kesan / Pesan</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Tulis cerita, kesan, atau ajakan seru di sini..."
                  className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Nama / Identitas</span>
                  <input
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Contoh: Nabila - Kimia 2023"
                    className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Tahun / Angkatan</span>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Contoh: 2020"
                    className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Tag</span>
                  <input
                    value={chip}
                    onChange={(e) => setChip(e.target.value)}
                    placeholder="Contoh: Throwback"
                    className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                  />
                </label>
                <div className="grid gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Sisipan Konten</span>
                  <div className="relative z-20 grid grid-cols-3 gap-2" role="group" aria-label="Pilih sisipan konten">
                    <button
                      type="button"
                      onClick={(event) => handleMediaTypeTap("none", event)}
                      onTouchEnd={(event) => handleMediaTypeTap("none", event)}
                      className={`touch-manipulation select-none rounded-lg border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] transition active:scale-[0.98] ${
                        mediaType === "none"
                          ? "border-[#5b43bf]/70 bg-[#5b43bf]/12 text-[#42259f]"
                          : "border-[#6d4a24]/25 bg-white text-[#5f4327]"
                      }`}
                    >
                      Tanpa
                    </button>

                    <button
                      type="button"
                      onClick={(event) => handleMediaTypeTap("image", event)}
                      onTouchEnd={(event) => handleMediaTypeTap("image", event)}
                      className={`touch-manipulation select-none rounded-lg border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] transition active:scale-[0.98] ${
                        mediaType === "image"
                          ? "border-[#5b43bf]/70 bg-[#5b43bf]/12 text-[#42259f]"
                          : "border-[#6d4a24]/25 bg-white text-[#5f4327]"
                      }`}
                    >
                      Gambar
                    </button>

                    <button
                      type="button"
                      onClick={(event) => handleMediaTypeTap("music", event)}
                      onTouchEnd={(event) => handleMediaTypeTap("music", event)}
                      className={`touch-manipulation select-none rounded-lg border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] transition active:scale-[0.98] ${
                        mediaType === "music"
                          ? "border-[#5b43bf]/70 bg-[#5b43bf]/12 text-[#42259f]"
                          : "border-[#6d4a24]/25 bg-white text-[#5f4327]"
                      }`}
                    >
                      Lagu
                    </button>
                  </div>
                  <p className="text-[11px] text-[#664a2c]">
                    Di HP, ketuk tombol Gambar/Lagu supaya panel pilihannya muncul di bawah.
                  </p>
                </div>
              </div>

              <div ref={mediaPanelRef} />

              {mediaType === "image" && (
                <div className="grid gap-2 rounded-lg border border-[#6b4922]/20 bg-white/70 p-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">Upload Gambar</span>
                  <input
                    id="thread-image-upload"
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={openImagePicker}
                    className="inline-flex w-fit cursor-pointer rounded-full bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white"
                  >
                    Pilih Gambar
                  </button>
                  <p className="text-xs text-[#664a2c]">{isUploadingImage ? "Mengunggah..." : imageUploadStatus}</p>
                  {uploadedImageUrl && (
                    <img
                      src={uploadedImageUrl}
                      alt="Preview upload"
                      className="h-40 w-full rounded-lg border border-[#6d4a24]/20 object-cover"
                    />
                  )}
                </div>
              )}

              {mediaType === "music" && (
                <div className="grid gap-2 rounded-lg border border-[#6b4922]/20 bg-white/70 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={musicQuery}
                      onChange={(e) => setMusicQuery(e.target.value)}
                      placeholder="Cari lagu... contoh: viva la vida"
                      className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={searchMusic}
                      disabled={isSearchingMusic}
                      className="rounded-lg bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
                    >
                      {isSearchingMusic ? "Mencari..." : "Cari"}
                    </button>
                  </div>

                  <p className="text-xs text-[#664a2c]">{musicSearchStatus}</p>

                  {musicResults.length > 0 && (
                    <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
                      {musicResults.map((track) => {
                        const isSelected = selectedMusicTrack?.id === track.id;

                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => setSelectedMusicTrack(track)}
                            className={`grid grid-cols-[40px_1fr] items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
                              isSelected
                                ? "border-[#5b43bf]/60 bg-[#5b43bf]/10"
                                : "border-[#6d4a24]/20 bg-white/80 hover:bg-white"
                            }`}
                          >
                            {track.imageUrl ? (
                              <img
                                src={track.imageUrl}
                                alt={track.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-[#2b1a5f]" />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-[#3b2a16]">{track.name}</span>
                              <span className="block truncate text-[11px] text-[#654a2e]">{track.artist}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="rounded-full bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-5 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#4a2f15]/20 transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Thread"}
                </button>
                <p className="text-xs text-[#664a2c]">{status}</p>
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-[#654421]/30 bg-white/85 p-4 shadow-xl shadow-[#4d3215]/10 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5a3d1f]">Preview Card</h2>

          <article className="mt-3 max-w-md rounded-xl border border-[#6f4b22]/30 bg-gradient-to-b from-[#fff6e8] to-[#ffe8cb] p-4 shadow-md">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#62472a]">
                {threadTitle || "Thread Baru"}
              </p>
              <span className="text-[11px] font-bold text-[#4a2e1a]">{year || "-"}</span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-[#3f2c18]">
              {message || "Kesan/pesan kamu akan muncul di sini sebagai preview card."}
            </p>

            {mediaType === "image" && uploadedImageUrl && (
              <figure className="mt-3 overflow-hidden rounded-lg border border-[#6b4923]/25 bg-white">
                <img src={uploadedImageUrl} alt="Preview sisipan gambar" className="h-40 w-full object-cover" />
              </figure>
            )}

            {mediaType === "music" && selectedMusicTrack && (
              <div className="mt-3 overflow-hidden rounded-lg border border-[#6b4923]/25 bg-[#121212] p-2.5">
                <div className="grid grid-cols-[52px_1fr] items-center gap-2 rounded-md bg-white/5 p-2">
                  {selectedMusicTrack.imageUrl ? (
                    <img
                      src={selectedMusicTrack.imageUrl}
                      alt={selectedMusicTrack.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-white/10" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{selectedMusicTrack.name}</p>
                    <p className="truncate text-[11px] text-white/75">{selectedMusicTrack.artist}</p>
                  </div>
                </div>
                {selectedMusicTrack.previewUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={selectedMusicTrack.previewUrl}
                    className="mt-2 h-[56px] w-full"
                  />
                ) : (
                  <div className="px-2 py-2 text-xs text-white/80">
                    Preview audio tidak tersedia untuk track ini.
                  </div>
                )}
              </div>
            )}

            {mediaType === "music" && selectedMusicTrack?.externalUrl && (
              <a
                href={selectedMusicTrack.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-[#4b321a] underline underline-offset-2"
              >
                Buka di {selectedMusicTrack.provider}
              </a>
            )}

            <p className="mt-3 text-xs text-[#5f452a]">{author || "Nama / identitas"}</p>
            <span className="mt-2 inline-flex rounded-full bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-2.5 py-1 text-[11px] font-semibold text-white">
              {chip || "Thread Baru"}
            </span>
          </article>

        </section>
      </div>
    </main>
  );
}
