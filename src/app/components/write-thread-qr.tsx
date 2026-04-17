/* eslint-disable @next/next/no-img-element */

const WRITE_THREAD_PATH = "/tulis";
const PRODUCTION_WRITE_THREAD_URL = "https://dinding-reuni.vercel.app/tulis";
const QR_SERVICE_URL = "https://api.qrserver.com/v1/create-qr-code/";

function resolveQrTarget(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) {
    return PRODUCTION_WRITE_THREAD_URL;
  }

  try {
    return new URL(WRITE_THREAD_PATH, siteUrl).toString();
  } catch {
    return PRODUCTION_WRITE_THREAD_URL;
  }
}

export default function WriteThreadQr() {
  const qrTarget = resolveQrTarget();
  const params = new URLSearchParams({
    size: "320x320",
    margin: "0",
    data: qrTarget,
  });

  const qrImageUrl = `${QR_SERVICE_URL}?${params.toString()}`;

  return (
    <aside className="write-thread-qr" aria-label="Akses cepat untuk menulis thread">
      <div className="write-thread-qr-code-wrap">
        <img
          src={qrImageUrl}
          alt="QR code menuju halaman tulis thread"
          className="write-thread-qr-code"
          loading="lazy"
        />
      </div>

      <p className="write-thread-qr-title">Scan Buat Nulis Thread</p>
      <p className="write-thread-qr-subtitle">
        Cukup scan barcode ini buat nambah thread baru.
      </p>
    </aside>
  );
}
