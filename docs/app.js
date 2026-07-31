const UPDATE_API = "https://hamtaloans.com/mldy-update/";
const HIT_API = "https://hamtaloans.com/mldy-hit/";

function formatFaNumber(n) {
  try {
    return new Intl.NumberFormat("fa-IR").format(Number(n) || 0);
  } catch (_) {
    return String(n || 0);
  }
}

async function loadVersion() {
  const line = document.getElementById("version-line");
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no version.json");
    const data = await res.json();
    const mobile = data.mobile || {};
    const tv = data.tv || {};
    const car = data.car || {};
    line.textContent =
      `موبایل ${mobile.versionName || "—"} (code ${mobile.versionCode || "—"})` +
      ` · TV ${tv.versionName || "—"}` +
      ` · Car ${car.versionName || "—"}` +
      (data.updatedAt ? ` · به‌روز ${data.updatedAt}` : "");

    const map = [
      ["btn-mobile", "dl-mobile", mobile.apk, "phone"],
      ["dl-tv", null, tv.apk, "tv"],
      ["dl-car", null, car.apk, "car"],
    ];
    for (const [id, alt, href, channel] of map) {
      if (!href) continue;
      const el = document.getElementById(id);
      if (el) {
        el.href = href;
        wireDownloadHit(el, channel);
      }
      if (alt) {
        const a = document.getElementById(alt);
        if (a) {
          a.href = href;
          wireDownloadHit(a, channel);
        }
      }
    }
  } catch (_) {
    line.textContent =
      "نسخه از GitHub Pages خوانده نشد — از کانال بروزرسانی یا Releases استفاده کنید.";
  }
}

function wireDownloadHit(anchor, channel) {
  if (!anchor || anchor.dataset.hitBound === "1") return;
  anchor.dataset.hitBound = "1";
  anchor.addEventListener("click", () => {
    const url = `${HIT_API}?ch=${encodeURIComponent(channel || "phone")}`;
    // Fire-and-forget; do not block the APK download.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url);
    } else {
      fetch(url, { method: "GET", mode: "cors", keepalive: true }).catch(() => {});
    }
    // Optimistic local bump for immediate feedback.
    const totalEl = document.getElementById("dl-total");
    const msgEl = document.getElementById("dl-message");
    if (totalEl) {
      const cur = parseInt(totalEl.dataset.raw || "0", 10) || 0;
      const next = cur + 1;
      totalEl.dataset.raw = String(next);
      totalEl.textContent = formatFaNumber(next);
      if (msgEl) msgEl.textContent = `این اپ ${formatFaNumber(next)} بار دانلود شده`;
    }
  });
}

async function loadDownloadStats() {
  const totalEl = document.getElementById("dl-total");
  const msgEl = document.getElementById("dl-message");
  const subEl = document.getElementById("dl-sub");
  const taglineEl = document.getElementById("dl-tagline");
  if (!totalEl) return;
  try {
    const res = await fetch(UPDATE_API, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("update api");
    const data = await res.json();
    const total = Number(data.downloadCount || 0);
    const phone = Number(data.downloadCountPhone || 0);
    const tv = Number(data.downloadCountTv || 0);
    totalEl.dataset.raw = String(total);
    totalEl.textContent = formatFaNumber(total);
    if (msgEl) {
      msgEl.textContent =
        data.downloadMessageFa || `این اپ ${formatFaNumber(total)} بار دانلود شده`;
    }
    if (subEl) {
      subEl.textContent =
        `موبایل ${formatFaNumber(phone)} · تلویزیون ${formatFaNumber(tv)} · شمارنده زنده`;
    }
    if (taglineEl && data.taglineFa) {
      taglineEl.textContent = data.taglineFa;
    }
  } catch (_) {
    totalEl.textContent = "—";
    if (msgEl) msgEl.textContent = "شمارنده موقتاً در دسترس نیست";
  }
}

loadVersion();
loadDownloadStats();
