/*
  MAROATA — shared engine for all three design options.
  Reads window.MAROATA (assets/content.js) and fills every [data-m] slot.
  Each design only decides where the slots go and how they look.
*/
(function () {
  "use strict";

  const D = window.MAROATA || {};
  const root = document.documentElement;
  const BASE = root.dataset.base || "";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // data-embeds="link" on <html> swaps the SoundCloud/YouTube players for plain links
  // (for hosts that block third-party iframes).
  const linkOnly = root.dataset.embeds === "link";
  const finePointer = matchMedia("(pointer: fine)").matches;
  const desktopQuery = matchMedia("(min-width: 1000px) and (min-height: 600px) and (min-aspect-ratio: 6/5)");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const asset = (p) => (!p ? "" : /^(https?:|data:|\/\/)/.test(p) ? p : BASE + p);
  const pad = (n) => String(n).padStart(2, "0");
  const ext = (url, label, cls) =>
    `<a class="${cls || "m-ext"}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;

  /* ---------- dates ---------- */
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  function toDate(iso, time) {
    const [y, m, d] = String(iso).split("-").map(Number);
    const [hh, mm] = String(time || "00:00").split(":").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
  }
  function parts(iso, time) {
    const dt = toDate(iso, time);
    return {
      dt,
      d: pad(dt.getDate()),
      m: MONTHS[dt.getMonth()],
      month: MONTHS_LONG[dt.getMonth()],
      y: String(dt.getFullYear()),
      yy: String(dt.getFullYear()).slice(2),
      dow: DAYS[dt.getDay()],
      num: `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${String(dt.getFullYear()).slice(2)}`,
    };
  }

  // Start of a gig in ms. A gig may carry its own IANA `timezone` (the venue's);
  // without one its date/time are read in the visitor's zone.
  function gigStart(g) {
    if (g && g.timezone) {
      const [y, m, d] = String(g.date).split("-").map(Number);
      const [hh, mm] = String(g.time || "00:00").split(":").map(Number);
      return zoned(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, g.timezone);
    }
    return toDate(g.date, g.time).getTime();
  }

  function upcomingGigs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (D.gigs || [])
      .filter((g) => g && g.date && toDate(g.date) >= today)
      .sort((a, b) => gigStart(a) - gigStart(b));
  }

  const sets = () => (D.soundcloud && D.soundcloud.sets) || [];
  // A pick may give `id` (the 11-character video id) or any YouTube `url`
  // (watch?v=…, youtu.be/…, /shorts/…, /embed/…).
  function ytId(v) {
    const raw = String((v && (v.id || v.url)) || "").trim();
    if (/^[\w-]{11}$/.test(raw)) return raw;
    try {
      const u = new URL(raw);
      if (/(^|\.)youtu\.be$/.test(u.hostname)) return u.pathname.slice(1, 12);
      if (u.searchParams.get("v")) return u.searchParams.get("v").slice(0, 11);
      const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
      if (m) return m[2];
    } catch (e) { /* not a URL */ }
    return "";
  }
  const videos = () => (D.youtube || []).map((v) => Object.assign({}, v, { id: ytId(v) }));
  const posts = () => (D.blog || []).slice().sort((a, b) => toDate(b.date) - toDate(a.date));
  const quotes = () => (D.quotes || []).filter((q) => q && q.text);
  const radio = () => D.radio || {};
  const hasDate = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String((x && x.date) || ""));
  // Newest first. When every episode has a date they are sorted by it; otherwise the
  // order in content.js is kept as written.
  const episodes = () => {
    const list = (radio().episodes || []).slice();
    return list.every(hasDate) ? list.sort((a, b) => toDate(b.date) - toDate(a.date)) : list;
  };
  // With no separate soundcloud.sets, the UNKNOWN episodes are the sets.
  const setsFromRadio = () => !((D.soundcloud && D.soundcloud.sets) || []).length && episodes().length > 0;
  // "25.09.26 · Guest" — date and guest only when known; otherwise the host.
  const epMeta = (e) => {
    const bits = [hasDate(e) ? parts(e.date).num : "", e.guest ? esc(e.guest) : ""].filter(Boolean);
    if (!bits.length && radio().host) bits.push("Hosted by " + esc(radio().host));
    return bits.join(" · ");
  };

  /* ---------- radio schedule (show time zone → visitor's local time) ---------- */
  const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const DAY_PLURAL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

  // Wall-clock time in `tz` minus UTC, in ms. Falls back to the visitor's zone.
  function tzOffset(utcMs, tz) {
    if (tz) {
      try {
        const f = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        const p = {};
        f.formatToParts(new Date(utcMs)).forEach((x) => (p[x.type] = x.value));
        return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(utcMs / 1000) * 1000;
      } catch (e) { /* unknown zone: use the visitor's */ }
    }
    return -new Date(utcMs).getTimezoneOffset() * 60000;
  }
  // UTC ms for a wall-clock time in `tz`.
  function zoned(y, mo, d, hh, mm, tz) {
    const guess = Date.UTC(y, mo, d, hh, mm);
    let t = guess - tzOffset(guess, tz);
    t = guess - tzOffset(t, tz); // second pass settles daylight-saving edges
    return t;
  }
  // { live, start, end, next } for the weekly slot around `nowMs`, or null without a schedule.
  function broadcast(nowMs) {
    const sc = radio().schedule;
    if (!sc || !sc.day || !sc.time) return null;
    const target = DAY_INDEX[String(sc.day).slice(0, 3).toLowerCase()];
    if (target == null) return null;
    const [hh, mm] = String(sc.time).split(":").map(Number);
    const dur = (Number(sc.durationMin) || 60) * 60000;
    const wall = new Date(nowMs + tzOffset(nowMs, sc.timezone));
    const starts = [];
    for (let k = -7; k <= 8; k++) {
      const day = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + k));
      if (day.getUTCDay() === target) starts.push(zoned(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hh || 0, mm || 0, sc.timezone));
    }
    const current = starts.find((t) => t <= nowMs && nowMs < t + dur);
    const next = starts.find((t) => t > nowMs);
    return { live: current != null, start: current != null ? current : next, end: current != null ? current + dur : null, next, dur };
  }

  /* ---------- renderers ---------- */
  const R = {};

  R.sets = function (limit) {
    if (setsFromRadio()) return R.episodes(limit);
    const list = sets().slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">No sets yet.</p>`;
    return `<ol class="m-sets">${list
      .map((s, i) => {
        const code = esc(s.code || `MRT-${pad(i)}`);
        // Empty slot (url: "" in content.js): shown as a quiet "coming soon" row.
        // To fill it, add the SoundCloud link to the set in assets/content.js.
        if (!s.url) {
          return `<li class="m-set is-open-slot"><div class="m-set__btn" aria-disabled="true">
            <span class="m-set__code">${code}</span>
            <span class="m-set__title">Coming soon</span>
            <span class="m-set__meta">Next recording</span>
            <span class="m-set__state" aria-hidden="true"></span></div></li>`;
        }
        return `<li class="m-set" data-set="${i}"><button type="button" class="m-set__btn" data-play="${i}" aria-label="Play ${esc(s.title || code)}">
          <span class="m-set__code">${code}</span>
          <span class="m-set__title">${esc(s.title || "Untitled set")}</span>
          <span class="m-set__meta">${esc(s.meta || "SoundCloud")}</span>
          <span class="m-set__state" aria-hidden="true"></span></button></li>`;
      })
      .join("")}</ol>`;
  };

  const thumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

  /* YouTube titles. A pick's `title` in content.js wins; otherwise the page asks
     YouTube's oEmbed endpoint (then noembed.com as a fallback) for the real title
     and channel, caches them for a week, and fills every element marked
     data-yt-title / data-yt-note / data-yt-label. */
  const ytMeta = {}; // id -> { title, author }
  const YT_FALLBACK = "Recommended transmission";
  const vTitle = (v) => (v.title || (ytMeta[v.id] && ytMeta[v.id].title) || YT_FALLBACK);
  const vNote = (v) => [(!v.title || v.showChannel) && ytMeta[v.id] && ytMeta[v.id].author, v.note].filter(Boolean).join(" · ");
  const tAttr = (v) => (v.title ? "" : ` data-yt-title="${esc(v.id)}"`);
  const nAttr = (v) => ` data-yt-note="${esc(v.id)}"`;

  function cachedMeta(id) {
    try {
      const c = JSON.parse(localStorage.getItem("mrt-yt-" + id) || "null");
      if (c && c.title && Date.now() - c.at < 7 * 86400000) return c;
    } catch (e) { /* storage blocked */ }
    return null;
  }
  async function fetchMeta(id) {
    const watch = `https://www.youtube.com/watch?v=${id}`;
    const sources = [
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
      `https://noembed.com/embed?url=${encodeURIComponent(watch)}`,
    ];
    for (const url of sources) {
      try {
        const ctrl = typeof AbortController === "function" ? new AbortController() : null;
        const t = ctrl && setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
        if (t) clearTimeout(t);
        if (!r.ok) continue;
        const j = await r.json();
        if (j && j.title && !j.error) return { title: String(j.title), author: String(j.author_name || ""), at: Date.now() };
      } catch (e) { /* blocked, offline or no CORS: try the next source */ }
    }
    return null;
  }
  function paintMeta(id) {
    const v = videos().find((x) => x.id === id);
    if (!v) return;
    const title = vTitle(v);
    const note = vNote(v);
    $$(`[data-yt-title="${id}"]`).forEach((el) => { if (el.textContent !== title) el.textContent = title; });
    $$(`[data-yt-note="${id}"]`).forEach((el) => { el.textContent = note; el.hidden = !note; });
    $$(`[data-yt-label="${id}"]`).forEach((el) => el.setAttribute("aria-label", `${el.dataset.ytVerb || "Play"} ${title}`));
    $$(`iframe[data-yt-frame="${id}"]`).forEach((el) => (el.title = title));
  }
  function loadVideoMeta() {
    if (linkOnly) return; // sandboxed previews cannot reach YouTube
    const ids = [...new Set(videos().filter((v) => v.id && !v.title).map((v) => v.id))];
    ids.forEach((id) => {
      const c = cachedMeta(id);
      if (c) { ytMeta[id] = c; paintMeta(id); }
      fetchMeta(id).then((m) => {
        if (!m) return;
        ytMeta[id] = m;
        try { localStorage.setItem("mrt-yt-" + id, JSON.stringify(m)); } catch (e) { /* storage blocked */ }
        paintMeta(id);
      });
    });
  }

  R.videos = function (limit, exclude) {
    const list = videos()
      .map((v, i) => ({ v, i }))
      .filter((x) => x.i !== exclude)
      .slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">No videos yet.</p>`;
    return `<ul class="m-videos">${list
      .map(({ v, i }) => {
        if (!v.id) {
          // Empty slot: add a YouTube id to this pick in assets/content.js.
          return `<li class="m-video is-open-slot"><div class="m-video__btn" aria-disabled="true">
            <span class="m-video__thumb"><span class="m-video__slot">Open slot</span></span>
            <span class="m-video__title">Next pick soon</span></div></li>`;
        }
        const note = vNote(v);
        return `<li class="m-video"><button type="button" class="m-video__btn" data-video="${i}" data-yt-label="${esc(v.id)}" data-yt-verb="Watch" aria-label="Watch ${esc(vTitle(v))}">
          <span class="m-video__thumb"><img src="${thumb(v.id)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-broken');this.remove()"><span class="m-video__play" aria-hidden="true"></span></span>
          <span class="m-video__title"${tAttr(v)}>${esc(vTitle(v))}</span>
          <span class="m-video__note"${nAttr(v)}${note ? "" : " hidden"}>${esc(note)}</span></button></li>`;
      })
      .join("")}</ul>`;
  };

  R.insta = function (limit) {
    const ig = D.instagram || {};
    const imgs = (ig.images || []).slice(0, limit || undefined);
    return `<div class="m-ig">${imgs
      .map(
        (im) =>
          `<a class="m-ig__item" href="${esc(im.url || (ig.accounts && ig.accounts[0] && ig.accounts[0].url) || "#")}" target="_blank" rel="noopener"><img src="${esc(asset(im.src))}" alt="${esc(im.alt || "")}" loading="lazy"></a>`
      )
      .join("")}</div>`;
  };

  R.handles = function () {
    const acc = (D.instagram && D.instagram.accounts) || [];
    return acc.map((a) => ext(a.url, `@${esc(a.handle)}`, "m-handle")).join(" ");
  };

  R.gigs = function (limit) {
    const list = upcomingGigs().slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">Dates to be announced.</p>`;
    return `<ol class="m-gigs">${list
      .map((g) => {
        const p = parts(g.date, g.time);
        const tag = g.sample
          ? `<span class="m-flag">Sample</span>`
          : g.link
            ? ext(g.link, "Tickets", "m-gig__link")
            : "";
        return `<li class="m-gig${g.sample ? " is-sample" : ""}">
          <time class="m-gig__date" datetime="${esc(g.date)}"><span class="m-gig__d">${p.d}</span><span class="m-gig__m">${p.m}</span><span class="m-gig__y">${p.y}</span></time>
          <span class="m-gig__where"><span class="m-gig__city">${esc(g.city)}</span><span class="m-gig__venue">${esc(g.venue || "")}</span></span>
          <span class="m-gig__meta">${p.dow}${g.time ? " · " + esc(g.time) : ""}</span>
          ${tag}</li>`;
      })
      .join("")}</ol>`;
  };

  R.posts = function (limit) {
    const list = posts().slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">First transmission soon.</p>`;
    const total = posts().length;
    return `<ol class="m-posts">${list
      .map((p, i) => {
        const pp = parts(p.date);
        const no = pad(total - i).padStart(3, "0");
        return `<li class="m-post"><button type="button" class="m-post__btn" data-post="${esc(p.slug)}">
          <span class="m-post__no">${no}</span>
          <span class="m-post__title">${esc(p.title)}</span>
          <span class="m-post__meta">${esc(p.tag || "")}${p.tag ? " · " : ""}${pp.num}${p.sample ? ` <span class="m-flag">Sample</span>` : ""}</span></button></li>`;
      })
      .join("")}</ol>`;
  };

  R.juliet = function () {
    const j = D.juliet || {};
    return `<div class="m-juliet">
      <div class="m-juliet__file">
        <span class="m-juliet__code">${esc(j.code || "")} · v${esc(j.version || "")}</span>
        <p class="m-juliet__lines">${(j.lines || []).map(esc).join("<br>")}</p>
      </div>
      <div class="m-juliet__gallery">${(j.gallery || [])
        .map((g) => `<figure class="m-juliet__img"><img src="${esc(asset(g.src))}" alt="${esc(j.name || "Juliet")}, ${esc(g.caption || "")}" loading="lazy"><figcaption>${esc(g.caption || "")}</figcaption></figure>`)
        .join("")}</div></div>`;
  };

  /* UNKNOWN radio */
  R.onair = function (live) {
    return `<span class="m-onair" data-live="${live ? "true" : "false"}"><i class="m-onair__dot" aria-hidden="true"></i><b class="m-onair__text">${live ? "On air" : "Off air"}</b></span>`;
  };

  R.schedule = function () {
    const sc = radio().schedule;
    if (!sc || !sc.day) return `<span class="m-tba">Schedule to be announced</span>`;
    const di = DAY_INDEX[String(sc.day).slice(0, 3).toLowerCase()];
    return `${DAY_PLURAL[di] || esc(sc.day)} · ${esc(sc.time || "")}${sc.city ? " " + esc(sc.city) : ""}${sc.sample ? ` <span class="m-flag">Sample</span>` : ""}`;
  };

  R.episodes = function (limit) {
    const all = episodes();
    const list = all.slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">First episode soon.</p>`;
    return `<ol class="m-episodes">${list
      .map((e, i) => {
        const code = esc(e.code || `UNK-${pad(all.length - i).padStart(3, "0")}`);
        const play = e.url
          ? `<button type="button" class="m-episode__play" data-play-episode="${i}" aria-label="Play ${code}"><span aria-hidden="true"></span></button>`
          : `<span class="m-episode__soon">Soon</span>`;
        return `<li class="m-episode${e.sample ? " is-sample" : ""}${e.url ? "" : " is-unreleased"}" data-episode="${i}">
          <button type="button" class="m-episode__btn" data-show-episode="${code}">
            <span class="m-episode__code">${code}</span>
            <span class="m-episode__title">${esc(e.title || "Untitled")}</span>
            <span class="m-episode__meta">${epMeta(e)}${e.sample ? ` <span class="m-flag">Sample</span>` : ""}</span>
          </button>${play}</li>`;
      })
      .join("")}</ol>`;
  };

  R.radioLatest = function () {
    const all = episodes();
    const i = Math.max(0, all.findIndex((e) => e.url));
    const e = all[i];
    if (!e) return `<p class="m-empty">First episode soon.</p>`;
    return `<div class="m-radio-latest" data-episode="${i}">
      <span class="m-radio-latest__label">Latest episode</span>
      <button type="button" class="m-radio-latest__open" data-show-episode="${esc(e.code)}">
        <span class="m-radio-latest__code">${esc(e.code)}</span>
        <span class="m-radio-latest__title">${esc(e.title || "")}</span>
        <span class="m-radio-latest__meta">${epMeta(e)}${e.sample ? ` <span class="m-flag">Sample</span>` : ""}</span>
      </button>
      ${e.url ? `<button type="button" class="m-radio-latest__play" data-play-episode="${i}"><span class="m-radio-latest__icon" aria-hidden="true"></span><span class="m-play-text">Play episode</span></button>` : ""}
    </div>`;
  };

  R.tracklist = function (e) {
    const t = (e && e.tracklist) || [];
    if (!t.length) return `<p class="m-empty">Tracklist coming soon.</p>`;
    return `<ol class="m-tracklist">${t.map((line, k) => `<li><span class="m-tracklist__no">${pad(k + 1)}</span><span class="m-tracklist__track">${esc(line)}</span></li>`).join("")}</ol>`;
  };

  R.radioStatusBlock = function () {
    const r = radio();
    const b = broadcast(Date.now());
    const where = [r.station, r.frequency].filter(Boolean).map(esc).join(" · ");
    return `<div class="m-radio__status">
      <div class="m-radio__row"><span data-m="radio-status" data-live="${b && b.live ? "true" : "false"}">${R.onair(b && b.live)}</span><span class="m-radio__schedule">${R.schedule()}</span></div>
      <div class="m-radio__row"><span class="m-radio__label" data-m="radio-countdown-label">${b && b.live ? "On air · ends in" : "Next broadcast in"}</span><span class="m-radio__cd" data-m="radio-countdown"></span></div>
      <div class="m-radio__row"><span class="m-radio__label">Your time</span><span class="m-radio__next" data-m="radio-next"></span></div>
      ${where ? `<div class="m-radio__row"><span class="m-radio__label">On</span><span>${where}</span></div>` : ""}
      ${r.live && r.live.url ? `<div class="m-radio__row">${ext(r.live.url, "Listen live ↗")}</div>` : ""}
    </div>`;
  };

  R.radio = function () {
    const r = radio();
    return `<div class="m-radio">
      <header class="m-radio__head">
        <p class="m-radio__logo m-unknown">${esc(r.name || "UNKNOWN")}</p>
        <p class="m-radio__desc">${esc(r.descriptor || "Radio show")}${r.host ? " · Hosted by " + esc(r.host) : ""}</p>
        ${r.tagline ? `<p class="m-radio__tagline">${esc(r.tagline)}</p>` : ""}
      </header>
      ${R.radioStatusBlock()}
      <h3 class="m-radio__sub">Episodes</h3>
      ${R.episodes()}
    </div>`;
  };

  // "2:00:00" -> <time datetime="PT2H0M">120 min</time>, so a duration never reads as a clock time.
  function lengthTag(len) {
    const n = String(len).trim().split(":").map(Number);
    if (n.length >= 2 && n.length <= 3 && n.every((x) => Number.isFinite(x) && x >= 0)) {
      const [h, m, sec] = n.length === 3 ? n : [0, n[0], n[1]];
      const min = Math.round(h * 60 + m + sec / 60);
      if (min > 0) return `<span class="m-ep__len" title="Duration"><time datetime="PT${Math.floor(min / 60)}H${min % 60}M">${min} min</time></span>`;
    }
    return `<span class="m-ep__len" title="Duration">${esc(len)}</span>`;
  }

  R.episode = function (code) {
    const all = episodes();
    const i = all.findIndex((e) => e.code === code);
    const e = all[i];
    if (!e) return `<p class="m-empty">Episode not found.</p>`;
    const p = hasDate(e) ? parts(e.date) : null;
    const older = all[i + 1];
    const newer = all[i - 1];
    return `<article class="m-ep" data-episode="${i}">
      <p class="m-ep__meta"><span class="m-unknown m-ep__show">${esc(radio().name || "UNKNOWN")}</span><span>${esc(e.code)}</span>${p ? `<time datetime="${esc(e.date)}">${p.d} ${p.m} ${p.y}</time>` : ""}${e.length ? lengthTag(e.length) : ""}${e.sample ? `<span class="m-flag">Sample</span>` : ""}</p>
      <h2 class="m-ep__title">${esc(e.title || "Untitled")}</h2>
      <p class="m-ep__guest">${e.guest ? esc(e.guest) : radio().host ? "Hosted by " + esc(radio().host) : ""}</p>
      <div class="m-ep__actions">
        ${e.url ? `<button type="button" class="m-ep__play" data-play-episode="${i}"><span class="m-ep__icon" aria-hidden="true"></span><span class="m-play-text">Play episode</span></button>${ext(e.url, "Open on SoundCloud ↗")}` : `<span class="m-ep__soon">Recording not uploaded yet</span>`}
      </div>
      <h3 class="m-ep__sub">Tracklist</h3>
      ${R.tracklist(e)}
      <nav class="m-reader__nav">
        ${older ? `<button type="button" data-show-episode="${esc(older.code)}">← ${esc(older.code)} ${esc(older.title || "")}</button>` : "<span></span>"}
        ${newer ? `<button type="button" data-show-episode="${esc(newer.code)}">${esc(newer.code)} ${esc(newer.title || "")} →</button>` : "<span></span>"}
      </nav></article>`;
  };

  R.post = function (slug) {
    const all = posts();
    const i = all.findIndex((p) => p.slug === slug);
    const p = all[i];
    if (!p) return `<p class="m-empty">Transmission not found.</p>`;
    const pp = parts(p.date);
    const prev = all[i + 1];
    const next = all[i - 1];
    return `<article class="m-reader">
      <p class="m-reader__meta"><span>Transmission ${pad(all.length - i).padStart(3, "0")}</span><span>${esc(p.tag || "")}</span><time datetime="${esc(p.date)}">${pp.d} ${pp.m} ${pp.y}</time>${p.sample ? `<span class="m-flag">Sample</span>` : ""}</p>
      <h2 class="m-reader__title">${esc(p.title)}</h2>
      ${p.excerpt ? `<p class="m-reader__lede">${esc(p.excerpt)}</p>` : ""}
      <div class="m-reader__body">${(p.body || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div>
      <nav class="m-reader__nav">
        ${prev ? `<button type="button" data-post="${esc(prev.slug)}">← ${esc(prev.title)}</button>` : "<span></span>"}
        ${next ? `<button type="button" data-post="${esc(next.slug)}">${esc(next.title)} →</button>` : "<span></span>"}
      </nav></article>`;
  };

  R.videoPlayer = function (i) {
    const list = videos();
    let idx = Number(i) || 0;
    if (!list[idx] || !list[idx].id) idx = list.findIndex((v) => v.id);
    const v = list[idx];
    if (!v) return `<p class="m-empty">No videos yet.</p>`;
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    const others = list.map((o, k) => ({ o, k })).filter((x) => x.k !== idx);
    return `<div class="m-player">
      <div class="m-player__frame">${linkOnly
        ? `<a class="m-player__link" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener"><img src="${thumb(v.id)}" alt="" onerror="this.remove()"><span>Watch on YouTube ↗</span></a>`
        : `<iframe src="${src}" title="${esc(vTitle(v))}" data-yt-frame="${esc(v.id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`}</div>
      <div class="m-player__info"><h2 class="m-player__title"${tAttr(v)}>${esc(vTitle(v))}</h2>
        <p class="m-player__note"${nAttr(v)}${vNote(v) ? "" : " hidden"}>${esc(vNote(v))}</p>
        ${linkOnly ? ext(`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`, "Open on YouTube ↗") : ""}</div>
      ${others.length ? `<div class="m-player__more">${R.videos(0, idx)}</div>` : ""}
    </div>`;
  };

  /* ---------- inline YouTube player ("Recommended transmission" module) ----------
     Shows the video's poster with a play button; pressing it loads the YouTube
     player in place. Only one source plays at a time: starting a video stops the
     SoundCloud deck, and starting the deck (or opening the video sheet) resets it. */
  const ytWatch = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  const ytEmbed = (id) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  function videoIndex(i) {
    const list = videos();
    let idx = Number(i) || 0;
    if (!list[idx] || !list[idx].id) idx = list.findIndex((v) => v.id);
    return idx;
  }

  R.videoPoster = function (v, idx) {
    return `<button type="button" class="m-vplayer__start" data-play-video="${idx}" data-yt-label="${esc(v.id)}" aria-label="Play ${esc(vTitle(v))}"><img src="${thumb(v.id)}" alt="" loading="lazy" onerror="this.remove()"><span class="m-vplayer__play" aria-hidden="true"></span></button>`;
  };

  R.videoInline = function (i) {
    const list = videos();
    const idx = videoIndex(i);
    const v = list[idx];
    if (!v) return `<p class="m-empty">Next pick soon.</p>`;
    const picks = list.filter((x) => x.id).length;
    return `<div class="m-vplayer" data-vplayer="${idx}" data-state="idle">
      <div class="m-vplayer__frame">${R.videoPoster(v, idx)}</div>
      <div class="m-vplayer__bar">
        <span class="m-vplayer__text"><span class="m-vplayer__title"${tAttr(v)}>${esc(vTitle(v))}</span><span class="m-vplayer__note"${nAttr(v)}${vNote(v) ? "" : " hidden"}>${esc(vNote(v))}</span></span>
        ${picks > 1 ? `<span class="m-vplayer__actions"><button type="button" class="m-vplayer__more" data-open="videos">All picks</button></span>` : ""}
      </div>
    </div>`;
  };

  function playVideo(idx, el) {
    const box = el && el.closest("[data-vplayer]");
    const v = videos()[idx];
    if (!box || !v || !v.id) return;
    if (playing.kind) stop();
    resetVideos(box);
    $(".m-vplayer__frame", box).innerHTML = linkOnly
      ? `<a class="m-player__link" href="${esc(ytWatch(v.id))}" target="_blank" rel="noopener"><span>Watch on YouTube ↗</span></a>`
      : `<iframe src="${ytEmbed(v.id)}" title="${esc(vTitle(v))}" data-yt-frame="${esc(v.id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    box.dataset.state = "playing";
    root.classList.add("is-video-playing");
    // The pressed poster is gone; keep keyboard and screen-reader users on the player.
    if (document.activeElement === document.body || !document.activeElement) {
      const f = $(".m-vplayer__frame iframe, .m-vplayer__frame a", box);
      if (f) f.focus({ preventScroll: true });
    }
  }

  function resetVideos(except) {
    $$("[data-vplayer]").forEach((box) => {
      if (box === except || box.dataset.state !== "playing") return;
      const idx = Number(box.dataset.vplayer);
      const v = videos()[idx];
      $(".m-vplayer__frame", box).innerHTML = v && v.id ? R.videoPoster(v, idx) : "";
      box.dataset.state = "idle";
    });
    if (!$$("[data-vplayer][data-state='playing']").length) root.classList.remove("is-video-playing");
  }

  /* ---------- SoundCloud deck (one player for the whole page) ---------- */
  let deck = null;
  let playing = { kind: "", i: -1 };

  function buildDeck(el) {
    deck = el;
    deck.dataset.state = "idle";
    deck.innerHTML = `
      <div class="m-deck__idle">
        <button type="button" class="m-deck__go" data-play="first"><span class="m-deck__icon" aria-hidden="true"></span><span>${esc(el.dataset.label || (setsFromRadio() ? "Play latest episode" : "Play latest set"))}</span></button>
      </div>
      <div class="m-deck__live">
        <div class="m-deck__now"><span class="m-deck__label">Now playing</span><span class="m-deck__title"></span>
          <button type="button" class="m-deck__stop" aria-label="Stop the set">Stop</button></div>
        <div class="m-deck__frame"></div>
      </div>`;
    $(".m-deck__stop", deck).addEventListener("click", stop);
  }

  function scColor() {
    const c = deck ? getComputedStyle(deck).getPropertyValue("--sc-color").trim() : "";
    return (c || "#ffffff").replace("#", "");
  }

  function play(i) {
    if (setsFromRadio()) {
      // Sets are the UNKNOWN episodes: play the episode (keeps every list in sync).
      const eps = episodes();
      const k = i === "first" ? eps.findIndex((e) => e.url) : Number(i);
      if (k >= 0) playEpisode(k);
      return;
    }
    const list = sets();
    if (i === "first") i = list.findIndex((s) => s.url);
    i = Number(i);
    playItem(list[i], "set", i);
  }

  function playEpisode(i) {
    i = Number(i);
    const e = episodes()[i];
    if (!e) return;
    playItem({ url: e.url, embed: e.embed, code: `${radio().name || "UNKNOWN"} ${e.code || ""}`.trim(), title: e.title }, "episode", i);
  }

  // What the SoundCloud widget should load. `embed` may be the src of SoundCloud's own
  // embed code (w.soundcloud.com/player/?url=…) or an api.soundcloud.com/tracks/… URL;
  // it is needed for private or unlisted tracks. Otherwise the public page URL works.
  function widgetTarget(s) {
    const e = String(s.embed || "").trim();
    if (e) {
      try {
        const u = new URL(e);
        if (/(^|\.)w\.soundcloud\.com$/.test(u.hostname) && u.searchParams.get("url")) return u.searchParams.get("url");
        return e;
      } catch (err) { /* not a URL: fall back to the page link */ }
    }
    return s.url;
  }

  function playItem(s, kind, i) {
    if (!s || !s.url || !deck) return;
    // Pressing the item that is already playing stops it (instead of reloading it from 0:00).
    if (playing.kind === kind && playing.i === i) { stop(); return; }
    resetVideos();
    playing = { kind, i };
    const src =
      "https://w.soundcloud.com/player/?url=" + encodeURIComponent(widgetTarget(s)) +
      "&color=%23" + scColor() + "&inverse=true&auto_play=true&show_user=true";
    $(".m-deck__frame", deck).innerHTML = linkOnly
      ? `<a class="m-ext" href="${esc(s.url)}" target="_blank" rel="noopener">Listen on SoundCloud ↗</a>`
      : `<iframe title="SoundCloud player: ${esc(s.title || s.code)}" src="${src}" height="20" scrolling="no" frameborder="no" allow="autoplay"></iframe>`;
    $(".m-deck__title", deck).textContent = `${s.code ? s.code + " — " : ""}${s.title || "Set"}`;
    deck.dataset.state = "playing";
    deck.dataset.kind = kind;
    root.classList.add("is-playing");
    markPlaying();
  }

  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

  function stop() {
    if (!deck) return;
    const was = playing;
    const hadFocus = deck.contains(document.activeElement);
    playing = { kind: "", i: -1 };
    $(".m-deck__frame", deck).innerHTML = "";
    deck.dataset.state = "idle";
    delete deck.dataset.kind;
    root.classList.remove("is-playing");
    markPlaying();
    // The Stop button just disappeared: keep keyboard focus somewhere sensible.
    if (hadFocus) {
      const attr = was.kind === "episode" ? "data-play-episode" : "data-play";
      const scope = sheetOpen ? sheet : document;
      const opener = `[data-open="${was.kind === "episode" ? "radio" : "sets"}"]`;
      const target = [$(".m-deck__go", deck), ...$$(`[${attr}="${was.i}"]`, scope), sheetOpen ? $("[data-m='sheet-close']", sheet) : null, ...$$(opener)]
        .find((el) => shown(el) && (!sheetOpen || sheet.contains(el) || deckOnTop()));
      if (target) target.focus({ preventScroll: true });
    }
  }

  function markPlaying() {
    $$("[data-set]").forEach((li) => li.classList.toggle("is-playing", playing.kind === "set" && Number(li.dataset.set) === playing.i));
    $$("[data-episode]").forEach((li) => li.classList.toggle("is-playing", playing.kind === "episode" && Number(li.dataset.episode) === playing.i));
    // Play buttons of the playing item act as Stop: say so to assistive tech and in visible labels.
    const verb = (el, on) => {
      const l = el.getAttribute("aria-label");
      if (l) el.setAttribute("aria-label", l.replace(/^(Play|Stop)\b/, on ? "Stop" : "Play"));
      const t = $(".m-play-text", el);
      if (t) t.textContent = t.textContent.replace(/^(Play|Stop)\b/, on ? "Stop" : "Play");
    };
    $$("[data-play]").forEach((b) => b.dataset.play !== "first" && verb(b, playing.kind === "set" && Number(b.dataset.play) === playing.i));
    $$("[data-play-episode]").forEach((b) => verb(b, playing.kind === "episode" && Number(b.dataset.playEpisode) === playing.i));
  }

  /* ---------- sheet (expanded view of any module) ---------- */
  // No prototype, so hashes such as #toString or #constructor are not mistaken for sheets.
  const TITLES = Object.assign(Object.create(null), { sets: "Sets", videos: "Visuals", gigs: "Dates", posts: "Transmissions", post: "Transmission", insta: "Instagram", juliet: "Juliet", radio: "Radio", episode: "Episode" });
  let sheet, sheetBody, sheetTitle, lastFocus, closeTimer;
  let sheetOpen = false;
  let pushed = 0; // history entries this page added for open sheets
  let unwinding = false; // true while close() walks back through those entries

  function sheetContent(type, arg) {
    const sc = D.soundcloud || {};
    switch (type) {
      case "sets":
        return `<div class="m-sheet__sets">${R.sets()}<p class="m-sheet__foot">${sc.profile ? ext(sc.profile, "All sets on SoundCloud ↗") : ""}</p></div>`;
      case "videos":
        return R.videoPlayer(arg);
      case "gigs": {
        const b = (D.artist && D.artist.booking) || {};
        return `<div class="m-sheet__gigs">${R.gigs()}<p class="m-sheet__foot">${b.url ? ext(b.url, esc(b.label || "Bookings") + " ↗") : ""}</p></div>`;
      }
      case "posts":
        return `<div class="m-sheet__posts">${R.posts()}</div>`;
      case "post":
        return R.post(arg);
      case "insta":
        return `<div class="m-sheet__insta"><p class="m-sheet__handles">${R.handles()}</p>${((D.instagram || {}).images || []).length ? R.insta() : `<p class="m-empty">Photos and stories live on Instagram.</p>`}</div>`;
      case "juliet":
        return R.juliet();
      case "radio":
        return R.radio();
      case "episode":
        return R.episode(arg);
      default:
        return "";
    }
  }

  function open(type, arg, fromHistory) {
    if (!sheet || !TITLES[type]) return;
    clearTimeout(closeTimer);
    if (sheet.hidden) lastFocus = document.activeElement;
    if (type === "videos") {
      resetVideos();
      if (playing.kind) stop(); // the sheet's video autoplays: one source at a time
    }
    sheet.dataset.type = type;
    sheetTitle.textContent = TITLES[type];
    sheetBody.innerHTML = sheetContent(type, arg);
    tick();
    sheetBody.scrollTop = 0;
    markPlaying();
    sheet.hidden = false;
    sheetOpen = true;
    root.classList.add("has-sheet");
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("is-open")));
    const closeBtn = $("[data-m='sheet-close']", sheet);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
    if (!fromHistory) {
      const hash = type === "post" ? `post-${arg}` : type === "episode" ? `episode-${arg}` : type === "videos" && arg ? `videos-${arg}` : type;
      try { history.pushState({ sheet: type, arg }, "", "#" + hash); pushed++; } catch (e) { /* sandboxed */ }
    }
  }

  function close(fromHistory) {
    if (!sheet || sheet.hidden || !sheet.classList.contains("is-open")) return;
    sheet.classList.remove("is-open");
    sheetOpen = false;
    root.classList.remove("has-sheet");
    closeTimer = setTimeout(() => {
      sheet.hidden = true;
      sheetBody.innerHTML = ""; // stops any playing video
    }, reduced ? 0 : 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (fromHistory) return;
    try {
      if (pushed > 0) { unwinding = true; history.go(-pushed); }
      else if (location.hash) history.replaceState({}, "", location.pathname + location.search);
    } catch (e) { unwinding = false; /* sandboxed */ }
    pushed = 0;
  }

  function openFromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return close(true);
    if (h.startsWith("post-")) return open("post", h.slice(5), true);
    if (h.startsWith("videos-")) return open("videos", h.slice(7), true);
    if (h.startsWith("episode-")) return open("episode", h.slice(8), true);
    if (TITLES[h] && h !== "post" && h !== "episode") return open(h, undefined, true);
    return close(true); // any other fragment (#onair, #top, …) means no sheet
  }

  /* ---------- keep keyboard focus inside an open sheet (role=dialog aria-modal) ---------- */
  // A design may raise the playing deck above the sheet (Signal on phones); it stays reachable then.
  function deckOnTop() {
    if (!deck || deck.dataset.state !== "playing") return false;
    const b = $(".m-deck__stop", deck);
    if (!shown(b)) return false;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && deck.contains(hit);
  }
  const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex='-1'])";
  function trapList() {
    const list = $$(FOCUSABLE, sheet).filter(shown);
    if (deckOnTop()) list.push(...$$("button:not([disabled])", $(".m-deck__live", deck) || deck).filter(shown));
    return list;
  }
  function inTrap(el) {
    return !!el && (sheet.contains(el) || (deck && deck.contains(el) && deckOnTop()));
  }

  /* ---------- quote rotator ---------- */
  function quoteRotator(el) {
    const list = quotes();
    if (!list.length) return;
    const effect = el.dataset.effect || "fade";
    const interval = Number(el.dataset.interval) || 9000;
    el.innerHTML = `<p class="m-quote__text"></p><p class="m-quote__by"></p>`;
    const text = $(".m-quote__text", el);
    const by = $(".m-quote__by", el);
    const counters = $$("[data-m='quote-index']");
    let i = Math.floor(Math.random() * list.length);
    let typer;

    const show = (q) => {
      by.textContent = q.by ? q.by : "";
      counters.forEach((c) => (c.textContent = `${pad(i + 1)}/${pad(list.length)}`));
      if (effect === "type" && !reduced) {
        clearInterval(typer);
        text.textContent = "";
        el.classList.add("is-typing");
        let k = 0;
        typer = setInterval(() => {
          text.textContent = q.text.slice(0, ++k);
          if (k >= q.text.length) { clearInterval(typer); el.classList.remove("is-typing"); }
        }, 34);
      } else {
        text.textContent = q.text;
      }
    };
    show(list[i]);
    if (list.length < 2) return;
    setInterval(() => {
      if (document.hidden) return;
      el.classList.add("is-out");
      setTimeout(() => {
        i = (i + 1) % list.length;
        show(list[i]);
        el.classList.remove("is-out");
      }, reduced ? 0 : 650);
    }, interval);
  }

  /* ---------- clocks ---------- */
  const tickers = [];
  function tick() {
    const now = new Date();
    $$("[data-m='clock']").forEach((el) => {
      el.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}${el.dataset.seconds === "false" ? "" : ":" + pad(now.getSeconds())}`;
    });
    const next = upcomingGigs()[0];
    $$("[data-m='countdown']").forEach((el) => {
      if (!next) { if (!el.querySelector(".m-cd--tba")) el.innerHTML = `<span class="m-cd m-cd--tba"><b>TBA</b></span>`; return; }
      let s = Math.floor((gigStart(next) - now.getTime()) / 1000);
      if (s <= 0) { if (el.textContent !== "On now") el.textContent = "On now"; return; } // started today
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      el.innerHTML = `<span class="m-cd"><b>${pad(d)}</b><i>D</i></span><span class="m-cd"><b>${pad(h)}</b><i>H</i></span><span class="m-cd"><b>${pad(m)}</b><i>M</i></span><span class="m-cd"><b>${pad(s)}</b><i>S</i></span>`;
    });
    // UNKNOWN radio: on-air state, next broadcast and countdown
    const b = broadcast(now.getTime());
    root.classList.toggle("radio-live", !!(b && b.live));
    root.classList.toggle("radio-tba", !b);
    $$("[data-m='radio-status']").forEach((el) => {
      const live = !!(b && b.live);
      if (el.dataset.live !== String(live)) { el.dataset.live = String(live); el.innerHTML = R.onair(live); }
    });
    $$("[data-m='radio-countdown-label']").forEach((el) => {
      el.textContent = !b ? (el.dataset.tbaText || "Next broadcast") : b.live ? (el.dataset.liveText || "On air · ends in") : (el.dataset.offText || "Next broadcast in");
    });
    $$("[data-m='radio-countdown']").forEach((el) => {
      if (!b) { if (!el.querySelector(".m-cd--tba")) el.innerHTML = `<span class="m-cd m-cd--tba"><b>TBA</b></span>`; return; }
      let s = Math.max(0, Math.floor(((b.live ? b.end : b.next) - now.getTime()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      el.innerHTML = `${d ? `<span class="m-cd"><b>${pad(d)}</b><i>D</i></span>` : ""}<span class="m-cd"><b>${pad(h)}</b><i>H</i></span><span class="m-cd"><b>${pad(m)}</b><i>M</i></span><span class="m-cd"><b>${pad(s)}</b><i>S</i></span>`;
    });
    $$("[data-m='radio-next']").forEach((el) => {
      if (!b || !b.next) { const t = el.dataset.tbaText || "To be announced"; if (el.textContent !== t) el.textContent = t; return; }
      const t = new Date(b.live ? b.start : b.next);
      const txt = `${DAYS[t.getDay()]} ${pad(t.getDate())} ${MONTHS[t.getMonth()]} · ${pad(t.getHours())}:${pad(t.getMinutes())}`;
      if (el.textContent !== txt) el.textContent = txt;
    });
    tickers.forEach((fn) => fn(now));
  }

  /* ---------- artboard fit (desktop layouts are drawn on a fixed board) ---------- */
  const boards = [];
  function fitBoards() {
    boards.forEach((b) => {
      const s = Math.min(innerWidth / b.w, innerHeight / b.h, b.max);
      b.el.style.setProperty("--s", s.toFixed(4));
      M.scale = s;
    });
  }
  function fitBoard(el, w, h, max) {
    boards.push({ el, w: w || 1280, h: h || 800, max: max || 1.5 });
    fitBoards();
  }

  /* ---------- pointer parallax (sets --mx / --my from -1 to 1) ---------- */
  function parallax() {
    if (reduced || !finePointer) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      root.style.setProperty("--mx", x.toFixed(4));
      root.style.setProperty("--my", y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener("pointermove", (e) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }

  /* ---------- fill slots ---------- */
  function fill() {
    const a = D.artist || {};
    root.style.setProperty("--beat", (60 / (Number(a.bpm) || 130)).toFixed(4) + "s");

    $$("[data-m]").forEach((el) => {
      const kind = el.dataset.m;
      const limit = Number(el.dataset.limit) || 0;
      switch (kind) {
        case "sets": el.innerHTML = R.sets(limit); break;
        case "videos": el.innerHTML = R.videos(limit); break;
        case "video-player": el.innerHTML = R.videoInline(el.dataset.index); break;
        case "insta": el.innerHTML = R.insta(limit); break;
        case "handles": el.innerHTML = R.handles(); break;
        case "gigs": el.innerHTML = R.gigs(limit); break;
        case "posts": el.innerHTML = R.posts(limit); break;
        case "quote": quoteRotator(el); break;
        case "deck": buildDeck(el); break;
        case "bpm": el.textContent = `${a.bpm || ""} BPM`; break;
        case "juliet-code": el.textContent = (D.juliet && D.juliet.code) || ""; break;
        case "juliet-version": el.textContent = (D.juliet && D.juliet.version) || ""; break;
        case "juliet-line": el.textContent = ((D.juliet && D.juliet.lines) || [])[Number(el.dataset.i) || 0] || ""; break;
        case "count-sets": {
          const list = setsFromRadio() ? episodes() : sets();
          el.textContent = pad(list.filter((s) => s.url).length) + "/" + pad(list.length);
          break;
        }
        case "count-posts": el.textContent = pad(posts().length); break;
        case "count-gigs": el.textContent = pad(upcomingGigs().length); break;
        case "next-gig": {
          const g = upcomingGigs()[0];
          if (!g) { el.innerHTML = `<span class="m-tba">Dates to be announced</span>`; break; }
          const p = parts(g.date, g.time);
          el.innerHTML = `<span class="m-next__date">${p.d} ${p.m}</span><span class="m-next__city">${esc(g.city)}</span>${g.sample ? `<span class="m-flag">Sample</span>` : ""}`;
          break;
        }
        case "year": el.textContent = new Date().getFullYear(); break;
        case "radio-name": el.textContent = radio().name || "UNKNOWN"; break;
        case "radio-desc": el.textContent = radio().descriptor || "Radio show"; break;
        case "radio-host": el.textContent = radio().host || ""; break;
        case "radio-tagline": el.textContent = radio().tagline || ""; break;
        case "radio-schedule": el.innerHTML = R.schedule(); break;
        case "radio-station": {
          const r = radio();
          const where = [r.station, r.frequency].filter(Boolean).join(" · ");
          el.textContent = where;
          el.hidden = !where;
          break;
        }
        case "radio-live-link": {
          const u = radio().live && radio().live.url;
          if (u) el.innerHTML = ext(u, el.dataset.label || "Listen live ↗"); else el.hidden = true;
          break;
        }
        case "radio-latest": el.innerHTML = R.radioLatest(); break;
        case "episodes": el.innerHTML = R.episodes(limit); break;
        case "count-episodes": el.textContent = pad(episodes().length); break;
      }
    });

    sheet = $("[data-m='sheet']");
    if (sheet) {
      sheetBody = $("[data-m='sheet-body']", sheet);
      sheetTitle = $("[data-m='sheet-title']", sheet);
    }
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-play],[data-play-episode],[data-show-episode],[data-play-video],[data-video],[data-post],[data-open],[data-m='sheet-close']");
      if (!t) {
        if (sheet && !sheet.hidden && e.target === sheet) close();
        return;
      }
      if (t.matches("[data-m='sheet-close']")) return close();
      if (t.dataset.play != null) return play(t.dataset.play);
      if (t.dataset.playEpisode != null) return playEpisode(t.dataset.playEpisode);
      if (t.dataset.showEpisode != null) return open("episode", t.dataset.showEpisode);
      if (t.dataset.playVideo != null) return playVideo(Number(t.dataset.playVideo), t);
      if (t.dataset.video != null) return open("videos", t.dataset.video);
      if (t.dataset.post != null) return open("post", t.dataset.post);
      if (t.dataset.open) return open(t.dataset.open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !sheetOpen) return;
      const list = trapList();
      if (!list.length) return;
      // Move explicitly: the deck a design raises above the sheet is not next to it in DOM order.
      const k = list.indexOf(document.activeElement);
      const n = list.length;
      e.preventDefault();
      list[k === -1 ? (e.shiftKey ? n - 1 : 0) : (k + (e.shiftKey ? n - 1 : 1)) % n].focus({ preventScroll: true });
    });
    // Focus that still slips out (e.g. tabbing out of an embedded player) goes back to the sheet.
    document.addEventListener("focusin", (e) => {
      if (!sheetOpen || inTrap(e.target)) return;
      const c = $("[data-m='sheet-close']", sheet);
      if (c) c.focus({ preventScroll: true });
    });
    addEventListener("popstate", () => {
      if (unwinding) {
        // close() walked back to the entry the visitor arrived on; if that was a
        // deep link (#radio, #post-…), drop the hash instead of reopening it.
        unwinding = false;
        if (location.hash) {
          try { history.replaceState({}, "", location.pathname + location.search); } catch (e) { /* sandboxed */ }
        }
        return;
      }
      pushed = Math.max(0, pushed - 1);
      openFromHash();
    });
    addEventListener("resize", fitBoards);
  }

  const M = {
    data: D, $, $$, esc, asset, pad, parts, reduced, finePointer, desktopQuery,
    upcomingGigs, render: R, play, playEpisode, playVideo, resetVideos, stop, open, close, fitBoard, parallax,
    broadcast, episodes,
    onTick: (fn) => tickers.push(fn), scale: 1,
  };
  window.M = M;

  /* Preview the ON AIR look without waiting for the real slot: add ?onair=1 or #onair
     to any page. Only the in-memory schedule changes; content.js stays as written. */
  function previewOnAir() {
    const q = /(^|[?&])onair=1(&|$)/.test(location.search.slice(1));
    if (!q && location.hash !== "#onair") return;
    const r = D.radio;
    if (!r) return;
    const start = new Date(Date.now() - 10 * 60000);
    r.schedule = Object.assign({}, r.schedule, {
      day: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][start.getDay()],
      time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      durationMin: Math.max(Number(r.schedule && r.schedule.durationMin) || 120, 60),
      timezone: "", // the visitor's own zone
      city: "",
    });
    root.classList.add("is-onair-preview");
  }

  function init() {
    previewOnAir();
    fill();
    loadVideoMeta();
    bind();
    tick();
    setInterval(tick, 1000);
    if (location.hash) openFromHash();
    requestAnimationFrame(() => root.classList.add("is-ready"));
    document.dispatchEvent(new CustomEvent("maroata:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
