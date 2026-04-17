"use client";

import { useState } from "react";

import type { ThreadsPerSegment } from "@/lib/thread-layout";

type DevControlPanelProps = {
  initialThreadsPerSegment: ThreadsPerSegment;
};

type ApiResult = {
  message?: string;
  error?: string;
  threadsPerSegment?: ThreadsPerSegment;
};

const DELETE_CONFIRM_TEXT = "HAPUS SEMUA";

export default function DevControlPanel({
  initialThreadsPerSegment,
}: DevControlPanelProps) {
  const [devKey, setDevKey] = useState("");
  const [threadsPerSegment, setThreadsPerSegment] =
    useState<ThreadsPerSegment>(initialThreadsPerSegment);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);

  async function callDevApi(payload: Record<string, unknown>): Promise<ApiResult> {
    const response = await fetch("/api/dev/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dev-key": devKey,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ApiResult;
    if (!response.ok) {
      throw new Error(data.error ?? "Aksi gagal dijalankan.");
    }

    return data;
  }

  async function handleSaveLayout() {
    if (!devKey.trim()) {
      setStatus("Masukkan DEV key dulu.");
      return;
    }

    setIsSavingLayout(true);
    setStatus("Menyimpan pengaturan thread per screen...");

    try {
      const result = await callDevApi({
        action: "set-thread-per-screen",
        threadsPerSegment,
      });

      if (result.threadsPerSegment === 75 || result.threadsPerSegment === 100) {
        setThreadsPerSegment(result.threadsPerSegment);
      }

      setStatus(`${result.message ?? "Pengaturan berhasil disimpan."} Klik Kembali untuk lihat hasil terbaru.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan.";
      setStatus(message);
    } finally {
      setIsSavingLayout(false);
    }
  }

  async function handleDeleteAllThreads() {
    if (!devKey.trim()) {
      setStatus("Masukkan DEV key dulu.");
      return;
    }

    if (deleteConfirm.trim().toUpperCase() !== DELETE_CONFIRM_TEXT) {
      setStatus(`Ketik ${DELETE_CONFIRM_TEXT} untuk konfirmasi hapus data.`);
      return;
    }

    setIsDeletingData(true);
    setStatus("Menghapus seluruh data thread...");

    try {
      const result = await callDevApi({
        action: "delete-all-threads",
      });

      setStatus(result.message ?? "Seluruh data thread berhasil dihapus.");
      setDeleteConfirm("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus data.";
      setStatus(message);
    } finally {
      setIsDeletingData(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4efe5] p-4 sm:p-6">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-[#654421]/30 bg-white/90 p-4 shadow-xl shadow-[#4d3215]/10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-new-romantics text-4xl text-[#3a248d] sm:text-5xl">Ruang Dev</h1>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="rounded-full border border-[#6e4a22]/30 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#52361a] transition hover:bg-white"
          >
            Kembali
          </button>
        </div>

        <p className="mt-2 text-sm text-[#5c4227]">
          Halaman internal untuk pengaturan mading. Simpan akses ini secara privat.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">DEV Key</span>
            <input
              type="password"
              value={devKey}
              onChange={(event) => setDevKey(event.target.value)}
              placeholder="Masukkan DEV_ADMIN_KEY"
              className="rounded-lg border border-[#6d4a24]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#6b49c7]/40 focus:ring-2"
            />
          </label>

          <div className="rounded-xl border border-[#6b4922]/20 bg-[#fff8ef] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5e3e20]">
              Thread Per Screen
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setThreadsPerSegment(75)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  threadsPerSegment === 75
                    ? "border-[#5b43bf]/70 bg-[#5b43bf]/12 text-[#42259f]"
                    : "border-[#6d4a24]/25 bg-white text-[#5f4327]"
                }`}
              >
                75 / screen
              </button>
              <button
                type="button"
                onClick={() => setThreadsPerSegment(100)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  threadsPerSegment === 100
                    ? "border-[#5b43bf]/70 bg-[#5b43bf]/12 text-[#42259f]"
                    : "border-[#6d4a24]/25 bg-white text-[#5f4327]"
                }`}
              >
                100 / screen
              </button>
            </div>
            <button
              type="button"
              onClick={handleSaveLayout}
              disabled={isSavingLayout}
              className="mt-3 rounded-full bg-gradient-to-r from-[#5b43bf] to-[#f08b3f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              {isSavingLayout ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>

          <div className="rounded-xl border border-[#a23333]/25 bg-[#fff2f2] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7b2424]">Danger Zone</p>
            <p className="mt-1 text-xs text-[#7f2d2d]">
              Hapus semua data thread di database Supabase secara permanen.
            </p>

            <label className="mt-3 grid gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b2424]">
                Konfirmasi Hapus
              </span>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder={`Ketik ${DELETE_CONFIRM_TEXT}`}
                className="rounded-lg border border-[#a23333]/25 bg-white px-3 py-2 text-sm text-[#3b2a16] outline-none ring-[#c04b4b]/35 focus:ring-2"
              />
            </label>

            <button
              type="button"
              onClick={handleDeleteAllThreads}
              disabled={isDeletingData}
              className="mt-3 rounded-full bg-[#a02b2b] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              {isDeletingData ? "Menghapus..." : "Hapus Semua Thread"}
            </button>
          </div>

          <p className="min-h-5 text-xs text-[#61452a]">{status}</p>
        </div>
      </section>
    </main>
  );
}
