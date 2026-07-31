const UPDATE_API = "https://hamtaloans.com/mldy-update/";
const HIT_API = "https://hamtaloans.com/mldy-hit/";

function formatNumber(n) {
  try {
    return new Intl.NumberFormat(window.PM_LANG.locale()).format(Number(n) || 0);
  } catch (_) {
    return String(n || 0);
  }
}

function t(key, vars) {
  return window.PM_LANG.t(key, vars);
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
    line.dataset.mobile = mobile.versionName || "—";
    line.dataset.code = mobile.versionCode || "—";
    line.dataset.tv = tv.versionName || "—";
    line.dataset.car = car.versionName || "—";
    line.dataset.updated = data.updatedAt || "";
    renderVersionLine();

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
    line.textContent = t("hero.versionFail");
  }
}

function renderVersionLine() {
  const line = document.getElementById("version-line");
  if (!line || !line.dataset.mobile) return;
  const updated = line.dataset.updated
    ? (window.PM_LANG.current === "en" ? ` · updated ${line.dataset.updated}`
      : window.PM_LANG.current === "ar" ? ` · محدّث ${line.dataset.updated}`
        : ` · به‌روز ${line.dataset.updated}`)
    : "";
  line.textContent = t("hero.version", {
    mobile: line.dataset.mobile,
    code: line.dataset.code,
    tv: line.dataset.tv,
    car: line.dataset.car,
    updated,
  });
}

function wireDownloadHit(anchor, channel) {
  if (!anchor || anchor.dataset.hitBound === "1") return;
  anchor.dataset.hitBound = "1";
  anchor.addEventListener("click", () => {
    const url = `${HIT_API}?ch=${encodeURIComponent(channel || "phone")}`;
    if (navigator.sendBeacon) navigator.sendBeacon(url);
    else fetch(url, { method: "GET", mode: "cors", keepalive: true }).catch(() => {});

    const totalEl = document.getElementById("dl-total");
    const msgEl = document.getElementById("dl-message");
    if (totalEl) {
      const cur = parseInt(totalEl.dataset.raw || "0", 10) || 0;
      const next = cur + 1;
      totalEl.dataset.raw = String(next);
      totalEl.textContent = formatNumber(next);
      if (msgEl) msgEl.textContent = t("stats.downloaded", { n: formatNumber(next) });
    }
  });
}

function renderStatsFromDataset() {
  const totalEl = document.getElementById("dl-total");
  const msgEl = document.getElementById("dl-message");
  const subEl = document.getElementById("dl-sub");
  const visitEl = document.getElementById("visit-total");
  const visitMsg = document.getElementById("visit-message");
  if (!totalEl) return;
  const total = parseInt(totalEl.dataset.raw || "0", 10) || 0;
  const phone = parseInt(totalEl.dataset.phone || "0", 10) || 0;
  const tv = parseInt(totalEl.dataset.tv || "0", 10) || 0;
  const visits = parseInt((visitEl && visitEl.dataset.raw) || "0", 10) || 0;
  if (totalEl.dataset.loaded === "1") {
    totalEl.textContent = formatNumber(total);
    if (msgEl) msgEl.textContent = t("stats.downloaded", { n: formatNumber(total) });
    if (subEl) subEl.textContent = t("stats.dlBreakdown", { phone: formatNumber(phone), tv: formatNumber(tv) });
  }
  if (visitEl && visitEl.dataset.loaded === "1") {
    visitEl.textContent = formatNumber(visits);
    if (visitMsg) visitMsg.textContent = t("stats.viewed", { n: formatNumber(visits) });
  }
}

async function loadDownloadStats() {
  const totalEl = document.getElementById("dl-total");
  const msgEl = document.getElementById("dl-message");
  const subEl = document.getElementById("dl-sub");
  const taglineEl = document.getElementById("dl-tagline");
  const visitEl = document.getElementById("visit-total");
  const visitMsg = document.getElementById("visit-message");
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
    const visits = Number(data.visitCount || 0);
    totalEl.dataset.raw = String(total);
    totalEl.dataset.phone = String(phone);
    totalEl.dataset.tv = String(tv);
    totalEl.dataset.loaded = "1";
    if (visitEl) {
      visitEl.dataset.raw = String(visits);
      visitEl.dataset.loaded = "1";
    }
    if (taglineEl && window.PM_LANG.current === "en" && data.taglineFa) {
      // keep i18n tagline; English default already set
    }
    renderStatsFromDataset();
  } catch (_) {
    totalEl.textContent = "—";
    if (msgEl) msgEl.textContent = t("stats.unavailable");
    if (visitEl) visitEl.textContent = "—";
    if (visitMsg) visitMsg.textContent = t("stats.unavailable");
  }
}

async function recordPageVisit() {
  const visitEl = document.getElementById("visit-total");
  const visitMsg = document.getElementById("visit-message");
  try {
    const res = await fetch(`${HIT_API}?ch=visit`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      mode: "cors",
      keepalive: true,
    });
    if (!res.ok) return;
    const data = await res.json();
    const visits = Number(data.visits || 0);
    if (visitEl) {
      visitEl.dataset.raw = String(visits);
      visitEl.dataset.loaded = "1";
      visitEl.textContent = formatNumber(visits);
    }
    if (visitMsg) visitMsg.textContent = t("stats.viewed", { n: formatNumber(visits) });
    // Also refresh download numbers if present in same payload.
    const totalEl = document.getElementById("dl-total");
    if (totalEl && typeof data.total === "number") {
      totalEl.dataset.raw = String(data.total);
      totalEl.dataset.phone = String(data.phone || 0);
      totalEl.dataset.tv = String(data.tv || 0);
      totalEl.dataset.loaded = "1";
      renderStatsFromDataset();
    }
  } catch (_) {
    // ignore — visit count is best-effort
  }
}

window.addEventListener("pm:lang", () => {
  renderVersionLine();
  renderStatsFromDataset();
});

window.PM_LANG.init();
loadVersion();
loadDownloadStats();
recordPageVisit();
