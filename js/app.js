/* ============================================================
   Al Manara Academy & Mosque — shared app.js
   Navbar / mobile menu / active states / prayer times / countdown
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------------- Mobile menu ---------------- */
  const menuBtn = $("#menuBtn");
  const mobileMenu = $("#mobileMenu");
  const menuOpenIcon = $("#menuOpenIcon");
  const menuCloseIcon = $("#menuCloseIcon");

  function toggleMenu(open) {
    if (!mobileMenu) return;
    const willOpen = open === undefined ? !mobileMenu.classList.contains("open") : open;
    mobileMenu.classList.toggle("open", willOpen);
    document.body.classList.toggle("overflow-hidden", willOpen);
    if (menuOpenIcon) menuOpenIcon.classList.toggle("hidden", willOpen);
    if (menuCloseIcon) menuCloseIcon.classList.toggle("hidden", !willOpen);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(willOpen));
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", (e) => {
      if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) toggleMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleMenu(false);
    });
  }

  /* ---------------- Active nav highlighting ---------------- */
  (function highlightActive() {
    const current = location.pathname.split("/").pop() || "index.html";
    const map = {
      "index.html": ["index.html", "home.html"],
      "our-school.html": ["our-school.html"],
      "mission-vision.html": ["our-school.html", "mission-vision.html"],
      "history.html": ["our-school.html", "history.html"],
      "faculty-and-staff.html": ["our-school.html", "faculty-and-staff.html"],
      "quran-program.html": ["our-school.html", "quran-program.html"],
      "admissions.html": ["our-school.html", "admissions.html"],
      "apply-now.html": ["our-school.html", "apply-now.html"],
      "parents.html": ["our-school.html", "parents.html"],
      "our-masjid.html": ["our-masjid.html"],
      "scholar.html": ["our-masjid.html", "scholar.html"],
      "lectures.html": ["our-masjid.html", "lectures.html"],
      "contact-main.html": ["contact-main.html"],
      "contact.html": ["contact-main.html", "contact.html"],
      "privacy-policy.html": ["contact-main.html", "privacy-policy.html"],
    };
    const targets = map[current] || [current];
    $$("[data-nav]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const name = href.split("/").pop();
      if (targets.indexOf(name) !== -1) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      }
    });
    // open the mobile <details> group that contains the active page
    $$(".mobile-menu details").forEach((d) => {
      if (d.querySelector("a.is-active")) d.open = true;
    });
  })();

  /* ============================================================
     LIVE PRAYER TIMES
     Two sources, both from the masjid's Firebase Realtime
     Database — the same ones the official prayer portal app
     (masjid-almanara.web.app) uses:

       • ADHAN  — computed astronomically from prayerConfig
                  (coordinates + calculation method/angles), the
                  same way the official app calculates it.
       • IQAMA  — taken from the published prayerTimings entries
                  (Fixed = clock time, Variable = offset applied
                  to the computed time).

     Ballwin, Missouri uses America/Chicago (CST/CDT).
     ============================================================ */
  (function initPrayerWidget() {
    const root = $("#prayerWidget");
    const live = root && root.querySelector("[data-prayer-live]");
    if (!live) return;

    const grid = live.querySelector("[data-prayer-grid]");
    const loader = live.querySelector("[data-prayer-loader]");
    const fallback = live.querySelector("[data-prayer-fallback]");
    const DB_URL =
      "https://masjid-almanara-default-rtdb.firebaseio.com/conf_web.json";

    const PRAYERS = [
      { key: "fajr", label: "Fajr" },
      { key: "sunrise", label: "Sunrise" },
      { key: "duha", label: "Dhuha" },
      { key: "dhuhr", label: "Dhuhr" },
      { key: "asr", label: "Asr" },
      { key: "maghrib", label: "Maghrib" },
      { key: "isha", label: "Isha" },
      { key: "jumuah", label: "Jumu\u2019ah" },
    ];

    /* ---- PrayTimes v2.5 (praytimes.org) — the same algorithm used by the
           reference Al Manara app and aladhan.com, so the site matches to the
           minute. ---- */
    const DR = Math.PI / 180;
    const dsin = (d) => Math.sin(d * DR);
    const dcos = (d) => Math.cos(d * DR);
    const dtan = (d) => Math.tan(d * DR);
    const darcsin = (x) => Math.asin(Math.max(-1, Math.min(1, x))) / DR;
    const darccos = (x) => Math.acos(Math.max(-1, Math.min(1, x))) / DR;
    const darctan = (x) => Math.atan(x) / DR;
    const darccot = (x) => Math.atan(1 / x) / DR;
    const darctan2 = (y, x) => Math.atan2(y, x) / DR;
    const dfix = (a, b) => {
      a -= b * Math.floor(a / b);
      return a < 0 ? a + b : a;
    };
    const dfixAngle = (a) => dfix(a, 360);
    const dfixHour = (a) => dfix(a, 24);

    function dJulian(year, month, day) {
      if (month <= 2) {
        year -= 1;
        month += 12;
      }
      const A = Math.floor(year / 100);
      const B = 2 - A + Math.floor(A / 4);
      return (
        Math.floor(365.25 * (year + 4716)) +
        Math.floor(30.6001 * (month + 1)) + day + B - 1524.5
      );
    }

    function dSunPosition(jd) {
      const D = jd - 2451545.0;
      const g = dfixAngle(357.529 + 0.98560028 * D);
      const q = dfixAngle(280.459 + 0.98564736 * D);
      const L = dfixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
      const e = 23.439 - 0.00000036 * D;
      const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15; // hours
      const eq = q / 15 - dfixHour(RA); // equation of time, hours
      const decl = darcsin(dsin(e) * dsin(L)); // degrees
      return { declination: decl, equation: eq };
    }

    /* Ported PrayTimes v2.5 computeTimes — prayer times in hours (local). */
    function prayTimesDay(y, mo, d, lat, lng, elv, timeZone, params) {
      const jDate = dJulian(y, mo, d) - lng / 360;
      const numIterations = 2;
      const riseSetAngle = () => 0.833 + 0.0347 * Math.sqrt(elv);
      const sunPosAt = (time) => dSunPosition(jDate + time);
      const midDay = (time) => dfixHour(12 - sunPosAt(time).equation);
      const sunAngleTime = (angle, time, direction) => {
        const decl = sunPosAt(time).declination;
        const noon = midDay(time);
        const t =
          (1 / 15) *
          darccos(
            (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat))
          );
        return noon + (direction === "ccw" ? -t : t);
      };
      const asrTime = (factor, time) => {
        const decl = sunPosAt(time).declination;
        const angle = -darccot(factor + dtan(Math.abs(lat - decl)));
        return sunAngleTime(angle, time);
      };
      const dayPortion = (times) => {
        const r = {};
        for (const k in times) r[k] = times[k] / 24;
        return r;
      };
      const value = (p) => (typeof p === "number" ? p : parseFloat(String(p)));
      const isMin = (p) => typeof p === "string" && /min/i.test(p);
      const computeIter = (times) => ({
        imsak: sunAngleTime(value(params.imsak), times.imsak, "ccw"),
        fajr: sunAngleTime(value(params.fajr), times.fajr, "ccw"),
        sunrise: sunAngleTime(riseSetAngle(), times.sunrise, "ccw"),
        dhuhr: midDay(times.dhuhr),
        asr: asrTime(params.asr === "Hanafi" ? 2 : 1, times.asr),
        sunset: sunAngleTime(riseSetAngle(), times.sunset),
        maghrib: sunAngleTime(value(params.maghrib), times.maghrib),
        isha: sunAngleTime(value(params.isha), times.isha),
      });
      const adjustTimes = (times) => {
        for (const k in times) times[k] += timeZone - lng / 15;
        if (isMin(params.maghrib))
          times.maghrib = times.sunset + value(params.maghrib) / 60;
        if (isMin(params.isha))
          times.isha = times.maghrib + value(params.isha) / 60;
        times.dhuhr += value(params.dhuhr) / 60;
        return times;
      };
      let times = {
        imsak: 5,
        fajr: 5,
        sunrise: 6,
        dhuhr: 12,
        asr: 13,
        sunset: 18,
        maghrib: 18,
        isha: 18,
      };
      for (let i = 1; i <= numIterations; i++) {
        times = computeIter(dayPortion(times));
      }
      return adjustTimes(times);
    }

    /* Calculation methods — mirror adhan-dart's presets. Methods selected by
       the masjid via prayerConfig.params. */
    const METHOD_PARAMS = {
      muslim_world_league: { fajr: 18, isha: 17, dhuhrMin: 1 },
      muslim: { fajr: 18, isha: 17, dhuhrMin: 1 },
      egyptian: { fajr: 19.5, isha: 17.5, dhuhrMin: 1 },
      karachi: { fajr: 18, isha: 18, dhuhrMin: 1 },
      umm_al_qura: { fajr: 18.5, ishaInterval: 90 },
      dubai: {
        fajr: 18.2,
        isha: 18.2,
        dhuhrMin: 1,
        adj: { fajr: -3, sunrise: 3, dhuhr: 3, asr: 3, maghrib: 3 },
      },
      moon_sighting_committee: { fajr: 18, isha: 18, maghribMin: 3 },
      mslc: { fajr: 18, isha: 18, maghribMin: 3 },
      north_america: { fajr: 15, isha: 15, dhuhrMin: 1 },
      north_america_isna: { fajr: 15, isha: 15, dhuhrMin: 1 },
      isna: { fajr: 15, isha: 15, dhuhrMin: 1 },
      kuwait: { fajr: 18, isha: 17.5 },
      qatar: { fajr: 18, ishaInterval: 90 },
      singapore: { fajr: 20, isha: 18, dhuhrMin: 1 },
      turkey: {
        fajr: 18,
        isha: 17,
        adj: { fajr: -7, sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 },
      },
      tehran: { fajr: 17.7, isha: 14, maghribMin: 4.5 },
      other: { other: true },
    };

    function resolveMethod(cfg) {
      const fajrAngle = Number(cfg.fajrAngle);
      const ishaAngle = Number(cfg.ishaAngle);
      const custom = {
        fajr: fajrAngle || 15,
        isha: ishaAngle || 15,
        ishaInterval: Number(cfg.ishaInterval) || 0,
      };
      /* Explicit per-prayer angles in the config take precedence over a
         named preset (e.g. prayerConfig.fajrAngle/ishaAngle = 15/15 → ISNA). */
      if (fajrAngle || ishaAngle) return custom;
      const name = String(cfg.params || "").trim().toLowerCase();
      const m = METHOD_PARAMS[name] || METHOD_PARAMS.umm_al_qura;
      return m.other ? custom : m;
    }

    /* Computed adhan times (hours, decimal) for the given Chicago date. */
    function computeAdhan(y, mo, d, cfg) {
      const lat = Number(cfg.coordinatesN);
      const lng = Number(cfg.coordinatesW);
      const tzName = String(cfg.timeZone || "America/Chicago");
      let off = 0;
      if (/^-?\d/.test(tzName)) {
        off = parseFloat(tzName);
      } else {
        // Offset in hours east of UTC for this calendar date (handles CST/CDT).
        const probe = new Date(Date.UTC(y, mo - 1, d, 12));
        const p = Object.fromEntries(
          new Intl.DateTimeFormat("en-US", {
            timeZone: tzName,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).formatToParts(probe).map((x) => [x.type, x.value])
        );
        let hh = +p.hour;
        if (hh === 24) hh = 0;
        const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, hh, +p.minute, +p.second);
        off = (asUtc - probe.getTime()) / 3600000;
      }
      const m = resolveMethod(cfg);
      const shadow = String(cfg.madhab || "shafi").toLowerCase() === "hanafi" ? 2 : 1;
      const params = {
        imsak: "10 min",
        fajr: m.fajr,
        isha: m.ishaInterval > 0 ? String(m.ishaInterval) + " min" : m.isha,
        maghrib: m.maghribMin ? String(m.maghribMin) + " min" : "0 min",
        dhuhr: m.dhuhrMin ? String(m.dhuhrMin) + " min" : "0 min",
        asr: shadow === 2 ? "Hanafi" : "Standard",
      };
      const t = prayTimesDay(y, mo, d, lat, lng, 0, off, params);
      const adj = m.adj || {};
      const min = (v) => (v || 0) / 60;
      return {
        fajr: dfixHour(t.fajr + min(adj.fajr)),
        sunrise: dfixHour(t.sunrise),
        dhuhr: dfixHour(t.dhuhr + min(adj.dhuhr)),
        asr: dfixHour(t.asr + min(adj.asr)),
        maghrib: dfixHour(t.maghrib + min(adj.maghrib)),
        isha: dfixHour(t.isha + min(adj.isha)),
      };
    }

    function fmtClock(hours) {
      const total = Math.floor(hours * 60) % (24 * 60);
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      const ap = hh >= 12 ? "PM" : "AM";
      return ((hh % 12) || 12) + ":" + String(mm).padStart(2, "0") + " " + ap;
    }

    function hoursToMinutes(hours) {
      return Math.floor(hours * 60) % (24 * 60);
    }

    function clockToMinutes(timeStr) {
      const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) return null;
      let h = parseInt(m[1], 10) % 12;
      if (/pm/i.test(m[3])) h += 12;
      return (h * 60 + parseInt(m[2], 10)) % (24 * 60);
    }

    function minutesToClock(min) {
      const total = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      const ap = hh >= 12 ? "PM" : "AM";
      return ((hh % 12) || 12) + ":" + String(mm).padStart(2, "0") + " " + ap;
    }

    function renderTile(prayer, entry, adhanHours) {
      /* Jumu'ah has no astronomical adhan — show the published khutbah/salah. */
      if (prayer.key === "jumuah") {
        const khutbah =
          Array.isArray(entry) && entry[0] === true
            ? String(entry[1] ?? "").trim()
            : "";
        const khutbahTxt =
          khutbah && clockToMinutes(khutbah) != null ? khutbah : "1:10 PM";
        return (
          '<div class="prayer-tile prayer-tile--jumuah">' +
          '<p class="prayer-tile-name">' +
          prayer.label +
          '</p><div class="prayer-tile-rows">' +
          '<p class="prayer-tile-row"><span>Khutbah</span><span>' +
          khutbahTxt +
          "</span></p>" +
          "</div></div>"
        );
      }

      /* Sunrise & Dhuha have no adhan/iqama — show the single computed time. */
      if (prayer.key === "sunrise" || prayer.key === "duha") {
        const val = fmtClock(adhanHours[prayer.key]);
        return (
          '<div class="prayer-tile">' +
          '<p class="prayer-tile-name">' +
          prayer.label +
          '</p><p class="prayer-tile-time">' +
          val +
          "</p></div>"
        );
      }

      const adhanMin = hoursToMinutes(adhanHours[prayer.key]);
      const adhanTxt = fmtClock(adhanHours[prayer.key]);

      /* Iqama: Fixed → published clock string; Variable → computed + offset. */
      let iqamaTxt = adhanTxt;
      if (Array.isArray(entry) && entry.length >= 2) {
        const fixed = entry[0] === true;
        const raw = String(entry[1] ?? "").trim();
        if (fixed) {
          if (clockToMinutes(raw) != null) iqamaTxt = raw;
        } else if (/^\d+(\.\d+)?$/.test(raw)) {
          iqamaTxt = minutesToClock(adhanMin + Math.round(parseFloat(raw)));
        }
      }

      return (
        '<div class="prayer-tile"><p class="prayer-tile-name">' +
        prayer.label +
        '</p><div class="prayer-tile-rows">' +
        '<p class="prayer-tile-row"><span>Adhan</span><span>' +
        adhanTxt +
        "</span></p>" +
        '<p class="prayer-tile-row"><span>Iqama</span><span>' +
        iqamaTxt +
        "</span></p>" +
        "</div></div>"
      );
    }

    function showFallback() {
      if (loader) loader.classList.add("is-hidden");
      if (fallback) fallback.removeAttribute("hidden");
    }

    fetch(DB_URL)
      .then((r) => r.json())
      .then((data) => {
        if (!data) throw new Error("empty");
        const config = data.prayerConfig || {};
        const timings = data.prayerTimings || {};

        const now = new Date();
        const wall = Object.fromEntries(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Chicago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(now).map((x) => [x.type, x.value])
        );
        const adhan = computeAdhan(
          +wall.year,
          +wall.month,
          +wall.day,
          Object.assign({}, config, {
            timeZone: String(config.timeZone || "America/Chicago"),
          })
        );
        /* Dhuha = Sunrise + published offset (default 10 min) — matches the app. */
        const duhaEntry = Array.isArray(timings.duha) ? timings.duha : null;
        const duhaOffset =
          duhaEntry && /^\d+(\.\d+)?$/.test(String(duhaEntry[1] ?? ""))
            ? parseFloat(duhaEntry[1])
            : 10;
        adhan.duha = dfixHour(adhan.sunrise + duhaOffset / 60);

        grid.innerHTML = PRAYERS.map((p) =>
          renderTile(p, timings[p.key], adhan)
        ).join("");
        if (loader) loader.classList.add("is-hidden");
        grid.removeAttribute("hidden");
      })
      .catch(showFallback);
  })();
})();
