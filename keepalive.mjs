// keepalive.mjs
// Kunjungi aplikasi blitz.cloud pakai browser headless SUNGGUHAN supaya
// terhitung sebagai "kunjungan" dan mencegah app tidur (sleep after 30 min).
//
// Penting: request program biasa (curl/fetch/uptime monitor) TIDAK membangunkan
// app di plan Free blitz.cloud. Hanya kunjungan browser yang membangunkan.
// Karena itu kita pakai Playwright (Chromium headless) yang benar-benar
// merender halaman.

import { chromium } from 'playwright';

const URL = process.env.TARGET_URL ?? 'https://fayln-api.marky.blitz.cloud/';
const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS ?? 90000);
const POLL_MS = Number(process.env.POLL_MS ?? 5000);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS ?? 45000);

const t0 = Date.now();
const elapsed = () => ((Date.now() - t0) / 1000).toFixed(1);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
});
const page = await context.newPage();

let awake = false;
let lastStatus = null;
let lastGate = null;
let lastStep = null;

try {
  while (Date.now() - t0 < MAX_WAIT_MS) {
    let resp = null;
    try {
      resp = await page.goto(URL, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT_MS,
      });
    } catch (err) {
      console.log(`[keepalive] t=${elapsed()}s goto error: ${err.message}`);
      await page.waitForTimeout(POLL_MS);
      continue;
    }

    lastStatus = resp ? resp.status() : null;
    lastGate = resp ? resp.headers()['x-blitz-gate'] ?? null : null;
    lastStep = resp ? resp.headers()['x-blitz-gate-step'] ?? null : null;

    console.log(
      `[keepalive] t=${elapsed()}s status=${lastStatus} gate=${lastGate} step=${lastStep}`
    );

    // App bangun kalau gate bukan "waking" dan status bukan 503.
    if (lastGate !== 'waking' && lastStatus !== 503) {
      awake = true;
      break;
    }

    await page.waitForTimeout(POLL_MS);
  }
} finally {
  await context.close();
  await browser.close();
}

if (awake) {
  console.log(`[keepalive] OK - app AWAKE (status=${lastStatus}, gate=${lastGate})`);
  process.exit(0);
} else {
  console.error(
    `[keepalive] FAIL - app masih tidur setelah ${MAX_WAIT_MS}ms (status=${lastStatus}, gate=${lastGate})`
  );
  process.exit(1);
}
