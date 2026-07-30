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
      ["btn-mobile", "dl-mobile", mobile.apk],
      ["dl-tv", null, tv.apk],
      ["dl-car", null, car.apk],
    ];
    for (const [id, alt, href] of map) {
      if (!href) continue;
      const el = document.getElementById(id);
      if (el) el.href = href;
      if (alt) {
        const a = document.getElementById(alt);
        if (a) a.href = href;
      }
    }
  } catch (_) {
    line.textContent =
      "نسخه از GitHub Pages خوانده نشد — از کانال بروزرسانی یا Releases استفاده کنید.";
  }
}

loadVersion();
