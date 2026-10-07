# fayln keep-alive

Menjaga API **https://fayln-api.marky.blitz.cloud/** tetap bangun (tidak tidur)
dengan mengunjunginya pakai **browser headless sungguhan** (Playwright/Chromium)
secara berkala lewat GitHub Actions.

## Kenapa harus browser?

Aplikasi ini jalan di **blitz.cloud** plan Free:

- App **tidur setelah 30 menit** tidak ada kunjungan.
- **Request dari program** (uptime monitor, script, webhook, curl, fetch)
  **TIDAK membangunkan** app di plan Free — cuma dapat jawaban "app tidur" dan
  app tetap tidur.
- Yang membangunkan cuma **kunjungan browser** (halaman di-render).

Karena itu cron biasa yang nembak pakai `curl` **tidak akan jalan**. Workflow ini
memakai Chromium headless yang benar-benar membuka halaman, sehingga terhitung
sebagai kunjungan.

## Cara kerja

- `keepalive.mjs` — buka URL dengan Chromium headless, tunggu sampai header
  `x-blitz-gate` bukan `waking` (artinya app bangun).
- `.github/workflows/keepalive.yml` — jalan **tiap 15 menit** (cron
  `7,22,37,52`), menjalankan script di atas.
- `.github/workflows/heartbeat.yml` — commit kecil **tiap bulan** supaya jadwal
  tidak dimatikan otomatis oleh GitHub (repo publik dimatikan setelah 60 hari
  tanpa aktivitas).

## Setup

Repo ini sudah siap pakai begitu di-push ke GitHub. **Tidak ada secret** yang
diperlukan (URL-nya publik).

Tes manual: **Actions → fayln keep-alive → Run workflow**.

## Catatan / batasan

- **GitHub cron tidak presisi.** Bisa delay 5–30 menit, dan kadang di-skip saat
  beban tinggi. Interval 15 menit masih ada margin terhadap batas tidur 30 menit,
  tapi bukan jaminan 100%.
- **Risiko deteksi bot.** blitz.cloud bilang "hanya kunjungan browser (orang)"
  yang membangunkan. Chromium headless kemungkinan besar dihitung sebagai
  kunjungan, tapi kalau ternyata blitz mendeteksinya sebagai bot, cara ini tidak
  akan membangunkan app.
- **Repo publik** dipakai supaya menit GitHub Actions gratis (unlimited). Kalau
  dijadikan privat, kuota 2.000 menit/bulan cepat habis (cron 15 menit ≈ 2.800
  menit/bulan).

## Alternatif yang lebih andal

1. **blitz.cloud Pro (€7/bln)** — fitur native "Keep it awake". Paling andal,
   tanpa hack.
2. **Cloudflare Worker + Cron Trigger + Browser Run** — cron bisa sampai 1 menit,
   pakai Browser Run (headless Chrome) yang sudah disetup. Lebih presisi daripada
   GitHub.

## Troubleshooting

Lihat log job di tab Actions. Kalau muncul:

```
[keepalive] OK - app AWAKE (status=200, gate=null)
```

berarti berhasil. Kalau `FAIL - app masih tidur ...`, berarti headless browser
tidak membangunkan app → pakai alternatif di atas.
