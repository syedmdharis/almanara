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
     PRAYER TIMES ENGINE (ISNA method) + live countdown widget
     Location: Ballwin, Missouri — lat 38.5862, lon -90.5323
     ============================================================ */
  const PRAYER_CONFIG = {
    lat: 38.5862,
    lng: -90.5323,
    method: "ISNA", // Fajr 15° / Isha 15° / standard Asr
    names: ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Jumuah"],
    // Iqama in minutes after each Athan — adjust to Al Manara's actual schedule
    iqama: { Fajr: 20, Dhuhr: 20, Jumuah: 5, Asr: 20, Maghrib: 10, Isha: 25 },
    // Friday Jumuah fixed schedule (Chicago time) — adjust as needed
    jumuah: { time: "13:15", day: 5 }, // day 5 = Friday (Sun=0)
    city: "Ballwin",
    state: "Missouri",
    country: "US",
  };

  const PrayerMath = (function () {
    const DR = Math.PI / 180;
    const fixAngle = (a) => ((a % 360) + 360) % 360;
    const fixHour = (h) => ((h % 24) + 24) % 24;
    const dsin = (d) => Math.sin(d * DR);
    const dcos = (d) => Math.cos(d * DR);
    const dtan = (d) => Math.tan(d * DR);
    const dasin = (x) => (Math.asin(Math.max(-1, Math.min(1, x))) / DR);
    const dacos = (x) => (Math.acos(Math.max(-1, Math.min(1, x))) / DR);
    const datan = (x) => (Math.atan(x) / DR);
    const datan2 = (y, x) => (Math.atan2(y, x) / DR);

    function sunPosition(jd) {
      const D = jd - 2451545.0;
      const g = fixAngle(357.529 + 0.98560028 * D);
      const q = fixAngle(280.459 + 0.98564736 * D);
      const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
      const e = 23.439 - 0.00000036 * D;
      const RA = datan2(dcos(e) * dsin(L), dcos(L));
      const decl = dasin(dsin(e) * dsin(L));
      const eqTime = q / 15 - RA / 15;
      return { declination: decl, equation: eqTime };
    }

    function julian(y, m, d) {
      if (m <= 2) { y -= 1; m += 12; }
      const A = Math.floor(y / 100);
      const B = 2 - A + Math.floor(A / 4);
      return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    }

    function compute(date, lat, lng, timeZone) {
      const jd0 = julian(date.getFullYear(), date.getMonth() + 1, date.getDate());
      const sp = sunPosition(jd0);
      const decl = sp.declination;

      const noon = fixHour(12 - sp.equation + (timeZone - lng / 15));

      const hourAngle = (angle) => {
        const num = -dsin(angle) - dsin(decl) * dsin(lat);
        const den = dcos(decl) * dcos(lat);
        return dacos(num / den) / 15;
      };

      const fajrAngle = 15;      // ISNA
      const ishaAngle = 15;      // ISNA
      const sunriseAngle = 0.833;

      const tFajr = hourAngle(fajrAngle);
      const tSunrise = hourAngle(sunriseAngle);
      const tSunset = hourAngle(sunriseAngle);

      // Asr (standard / Shafi'i): factor = 1
      const asrFactor = 1 + dtan(Math.abs(lat - decl));
      const tAsr = datan(1 / asrFactor) / 15;

      const dhuhrMin = 5 / 60;    // 5 min after solar noon
      const maghribMin = 0;

      const tIsha = hourAngle(ishaAngle);

      const h = (v) => fixHour(noon + v);

      return {
        Fajr: h(-tFajr),
        Sunrise: h(-tSunrise),
        Dhuhr: h(dhuhrMin),
        Asr: h(tAsr),
        Maghrib: h(tSunset + maghribMin / 60),
        Isha: h(tIsha),
      };
    }

    return { compute: compute };
  })();

  /* Chicago (America/Chicago) offset in hours east of UTC */
  function chicagoOffsetHours(date) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    let h = parseInt(parts.hour, 10);
    if (h === 24) h = 0;
    const wallUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, h, +parts.minute, +parts.second);
    return (wallUtc - date.getTime()) / 3600000;
  }

  /* Chicago wall-clock reading of "now" as fractional hours */
  function chicagoNowHours(date) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", hour12: false,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    const h = parseInt(parts.hour, 10) === 24 ? 0 : parseInt(parts.hour, 10);
    return h + (+parts.minute) / 60 + (+parts.second) / 3600;
  }

  function prayerDatesForToday(times) {
    const now = new Date();
    const offset = chicagoOffsetHours(now);
    const chicagoNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
    const utcMid = Date.UTC(
      chicagoNow.getUTCFullYear(),
      chicagoNow.getUTCMonth(),
      chicagoNow.getUTCDate()
    );
    const chicagoMidnight = utcMid + -offset * 3600000;
    const out = {};
    Object.keys(times).forEach((k) => {
      out[k] = new Date(chicagoMidnight + times[k] * 3600000);
    });
    return out;
  }

  function fmtTime(date) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date);
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function renderCountdown(ms, el) {
    if (!el) return;
    const total = Math.max(0, Math.floor(ms / 1000));
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    const hEl = el.querySelector("[data-cd=hours]");
    const mEl = el.querySelector("[data-cd=minutes]");
    const sEl = el.querySelector("[data-cd=seconds]");
    if (hEl) hEl.textContent = pad(hh);
    if (mEl) mEl.textContent = pad(mm);
    if (sEl) sEl.textContent = pad(ss);
  }

  function initPrayerWidget() {
    const root = $("#prayerWidget");
    if (!root) return;

    // Static Gregorian + Hijri dates
    const now = new Date();
    const gregEl = root.querySelector("[data-gregorian]");
    const hijriEl = root.querySelector("[data-hijri]");
    if (gregEl) {
      gregEl.textContent = new Intl.DateTimeFormat("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }).format(now);
    }
    if (hijriEl) {
      try {
        hijriEl.textContent = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
          day: "numeric", month: "long", year: "numeric",
        }).format(now);
      } catch (e) {
        hijriEl.textContent = "";
      }
    }

    const tilesWrap = root.querySelector("[data-prayer-tiles]");
    const nextNameEl = root.querySelector("[data-next-name]");
    const nextTimeEl = root.querySelector("[data-next-time]");

    let schedule = null;

    function buildTimes(date) {
      const tz = chicagoOffsetHours(date);
      return PrayerMath.compute(date, PRAYER_CONFIG.lat, PRAYER_CONFIG.lng, tz);
    }

    function isJumuahDay(date) {
      const d = new Date(date.toLocaleString("en-US", { timeZone: "America/Chicago" }));
      return d.getDay() === PRAYER_CONFIG.jumuah.day;
    }

    function jumuahHours(date) {
      const parts = String(PRAYER_CONFIG.jumuah.time).split(":");
      return (+parts[0] % 24) + (+parts[1] || 0) / 60;
    }

    function getTimes(date) {
      const base = schedule ? { ...schedule } : buildTimes(date);
      base.Jumuah = jumuahHours(date); // fixed time, shown daily
      base._isFriday = isJumuahDay(date);
      return base;
    }

    function tick() {
      const date = new Date();
      const times = getTimes(date);
      const dates = prayerDatesForToday(times);
      const nowH = chicagoNowHours(date);
      const isFriday = times._isFriday === true;

      // determine next prayer
      let next = null;
      let nextDate = null;
      PRAYER_CONFIG.names.forEach((name) => {
        if (name === "Dhuhr" && isFriday) return;   // Dhuhr congregation is Jumuah on Friday
        if (name === "Jumuah" && !isFriday) return; // Jumuah counts only on Friday
        const tH = times[name];
        if (tH > nowH + 0.0005 && !next) { next = name; nextDate = dates[name]; }
      });

      // render tiles
      if (tilesWrap) {
        PRAYER_CONFIG.names.forEach((name, i) => {
          let tile = tilesWrap.children[i];
          if (!tile) return;
          const isJumu = name === "Jumuah";
          const tH = times[name];
          const isPast = !isFriday && isJumu ? false : tH < nowH;
          tile.className = "pray-tile glass-soft" +
            (next === name ? " is-next" : (isPast ? " is-past" : "")) +
            (isJumu ? " is-jumuah" : "");
          const tTime = tile.querySelector("[data-ath]");
          const tIqa = tile.querySelector("[data-iqa]");
          const tState = tile.querySelector(".t-state");
          const labels = tile.querySelectorAll(".t-label");
          if (isJumu) {
            if (labels.length >= 2) {
              labels[0].textContent = "Jumuah";
              labels[1].textContent = "Salah";
            }
          }
          const iqMin = PRAYER_CONFIG.iqama[name] || 0;
          if (tTime) tTime.textContent = fmtTime(dates[name]);
          if (tIqa) tIqa.textContent = fmtTime(new Date(dates[name].getTime() + iqMin * 60000));
          if (tState) {
            if (!isFriday && isJumu) tState.textContent = "Friday only";
            else if (next === name) tState.textContent = "Next";
            else if (isPast) tState.textContent = "Passed";
            else tState.textContent = "Upcoming";
          }
        });
      }

      if (next && nextDate) {
        if (nextNameEl) nextNameEl.textContent = next;
        if (nextTimeEl) nextTimeEl.textContent = fmtTime(nextDate);
        const nextIqamaEl = root.querySelector("[data-next-iqama]");
        if (nextIqamaEl) {
          const iqMin = PRAYER_CONFIG.iqama[next] || 0;
          nextIqamaEl.textContent = fmtTime(new Date(nextDate.getTime() + iqMin * 60000));
        }
        const countdownEl = root.querySelector("[data-countdown]");
        renderCountdown(nextDate.getTime() - Date.now(), countdownEl);
      }
    }

    // Try to enhance with live API (Aladhan) when online; always fall back to local calc.
    fetch(
      "https://api.aladhan.com/v1/timingsByCity?city=" +
        encodeURIComponent(PRAYER_CONFIG.city) +
        "&state=" + encodeURIComponent(PRAYER_CONFIG.state) +
        "&country=" + encodeURIComponent(PRAYER_CONFIG.country) +
        "&method=2"
    )
      .then((r) => r.json())
      .then((json) => {
        const t = json && json.data && json.data.timings;
        if (t) {
          schedule = {};
          PRAYER_CONFIG.names.forEach((n) => {
            if (n === "Jumuah") return;            // Jumuah uses its own fixed schedule
            const raw = t[n] || "";
            const parts = raw.split(":");
            const v = +parts[0] + (+parts[1] || 0) / 60;
            if (!isNaN(v)) schedule[n] = v;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        tick();
        setInterval(tick, 1000);
      });
  }

  initPrayerWidget();
})();
