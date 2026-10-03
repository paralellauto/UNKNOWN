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
  // Phones and tablets only start embedded audio when the tap lands inside the player,
  // so on touch screens the newest episode's SoundCloud player is loaded up front.
  const touchFirst = matchMedia("(hover: none) and (pointer: coarse)").matches;
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

  /* Juliet's file: her ID, lines, traits and status, the first picture as its cover, the rest as a grid in which
     every picture keeps its own shape (rows of equal height), and a viewer for one picture at a time. */
  const julietGallery = () => ((D.juliet && D.juliet.gallery) || []).filter((g) => g && g.src);
  // width / height from content.js `size`; 3:4 until a picture without one has loaded (see bind)
  const julietRatio = (g) => {
    const s = Array.isArray(g.size) ? g.size.map(Number) : [];
    return s[0] > 0 && s[1] > 0 ? s[0] / s[1] : 0;
  };
  const julietAlt = (g) => g.alt || `${(D.juliet && D.juliet.name) || "Juliet"}, ${g.caption || ""}`;
  // "System Core / VII": the numeral never wraps away from its slash
  const capKeep = (c) => esc(c || "").replace(/ \/ /g, " /\u00a0");
  R.juliet = function () {
    const j = D.juliet || {};
    const list = julietGallery();
    const n = list.length;
    const words = (a) => (Array.isArray(a) ? a : []).filter(Boolean);
    const tag = String(j.tagline || "");
    const tile = (g, i) => {
      const r = julietRatio(g);
      const lead = i === 0;
      // the cover is drawn larger than a grid picture: screens with dense pixels get the full picture
      const srcset = lead && g.thumb ? ` srcset="${esc(asset(g.thumb))} 1x, ${esc(asset(g.src))} 2x"` : "";
      return `<figure class="m-juliet__img${lead ? " m-juliet__lead" : ""}" style="--r:${(r || 0.75).toFixed(4)}"${r ? "" : " data-ratio=\"auto\""}>
        <button type="button" class="m-juliet__open" data-juliet-view="${i}" aria-label="View ${esc(g.caption || "picture")}, ${i + 1} of ${n}">
          <img src="${esc(asset(g.thumb || g.src))}"${srcset} alt="${esc(julietAlt(g))}"${lead ? "" : ` loading="lazy"`} decoding="async" draggable="false"></button>
        <figcaption><span class="m-juliet__cap">${capKeep(g.caption)}</span></figcaption></figure>`;
    };
    return `<div class="m-juliet">
      <div class="m-juliet__top">
        <div class="m-juliet__file">
          <p class="m-juliet__id"><span class="m-juliet__sq" aria-hidden="true"></span><span>${esc(j.code || "")}</span><span>${j.interface ? esc(j.interface) + " · " : ""}v${esc(j.version || "")}</span><span class="m-juliet__state">Status <b>Active</b></span></p>
          <p class="m-juliet__lines">${words(j.lines).map((l) => `<span>${esc(l)}</span>`).join("")}</p>
          ${words(j.traits).length || words(j.status).length ? `<dl class="m-juliet__spec">
            ${words(j.traits).length ? `<div class="m-juliet__row"><dt>Traits</dt><dd class="m-juliet__traits">${words(j.traits).map((t) => `<span>${esc(t)}</span>`).join("")}</dd></div>` : ""}
            ${words(j.status).length ? `<div class="m-juliet__row"><dt>System</dt><dd class="m-juliet__status">${words(j.status).map((t) => `<span>${esc(t)}</span>`).join("")}</dd></div>` : ""}
          </dl>` : ""}
          ${tag ? `<p class="m-juliet__tag">${/_$/.test(tag) ? `${esc(tag.slice(0, -1))}<span class="m-juliet__caret" aria-hidden="true">_</span>` : esc(tag)}</p>` : ""}
        </div>
        ${n ? tile(list[0], 0) : ""}
      </div>
      ${n > 1 ? `<h3 class="m-juliet__sub">Archive <span>${pad(n - 1)} ${n - 1 === 1 ? "file" : "files"}</span></h3>
      <div class="m-juliet__gallery">${list.slice(1).map((g, k) => tile(g, k + 1)).join("")}</div>` : ""}
      ${n ? `<div class="m-jv" role="dialog" aria-modal="true" aria-label="${esc(j.name || "Juliet")}: pictures" hidden>
        <div class="m-jv__bar">
          <p class="m-jv__id hud"><span class="m-juliet__sq" aria-hidden="true"></span>${esc(j.code || "")} <span class="m-jv__file"></span></p>
          <p class="m-jv__cap" aria-live="polite"></p>
          <button type="button" class="m-jv__close hud" data-jv="close" aria-label="Back to the file">[ × ] Back</button>
        </div>
        <div class="m-jv__stage"><img class="m-jv__lo" alt="" aria-hidden="true" draggable="false"><img class="m-jv__hi" alt="" draggable="false"></div>
        <div class="m-jv__foot">
          <button type="button" class="m-jv__step m-jv__prev" data-jv="-1" aria-label="Previous picture"><span class="m-jv__arrow" aria-hidden="true"></span><span class="m-jv__word">Prev</span></button>
          <span class="m-jv__count"></span>
          <button type="button" class="m-jv__step m-jv__next" data-jv="1" aria-label="Next picture"><span class="m-jv__word">Next</span><span class="m-jv__arrow" aria-hidden="true"></span></button>
        </div>
      </div>` : ""}
    </div>`;
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
    // A title that wraps breaks at its dash and keeps the dash at the end of the line ("Radio Show —" / "Ep. 14"):
    // each part is one unit (it still wraps inside itself when longer than the line). In the links below, the dash
    // stays on its line too, and the arrow never ends up alone with the last word.
    const heading = (t) => (/ [—–] /.test(t) ? esc(t).replace(/ ([—–]) /g, "\u00a0$1\n").split("\n").map((x) => `<span class="m-ep__part">${x}</span>`).join(" ") : esc(t));
    const keep = (t) => esc(t).replace(/ ([—–] )/g, "\u00a0$1").replace(/ (\S+)$/, "\u00a0$1");
    return `<article class="m-ep" data-episode="${i}">
      <p class="m-ep__meta"><span class="m-unknown m-ep__show">${esc(radio().name || "UNKNOWN")}</span><span>${esc(e.code)}</span>${p ? `<time datetime="${esc(e.date)}">${p.d} ${p.m} ${p.y}</time>` : ""}${e.length ? lengthTag(e.length) : ""}${e.sample ? `<span class="m-flag">Sample</span>` : ""}</p>
      <h2 class="m-ep__title">${heading(e.title || "Untitled")}</h2>
      <p class="m-ep__guest">${e.guest ? esc(e.guest) : radio().host ? "Hosted by " + esc(radio().host) : ""}</p>
      <div class="m-ep__actions">
        ${e.url ? `<button type="button" class="m-ep__play" data-play-episode="${i}"><span class="m-ep__icon" aria-hidden="true"></span><span class="m-play-text">Play episode</span></button>${ext(e.url, "Open on SoundCloud ↗")}` : `<span class="m-ep__soon">Recording not uploaded yet</span>`}
      </div>
      <h3 class="m-ep__sub">Tracklist</h3>
      ${R.tracklist(e)}
      <nav class="m-reader__nav">
        ${older ? `<button type="button" data-show-episode="${esc(older.code)}">←\u00a0${esc(older.code)} ${keep(older.title || "")}</button>` : "<span></span>"}
        ${newer ? `<button type="button" data-show-episode="${esc(newer.code)}">${esc(newer.code)} ${keep(newer.title || "")}\u00a0→</button>` : "<span></span>"}
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
    track("video_play", { video_id: v.id, video_title: vTitle(v) });
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
        <p class="m-deck__hint" role="status" hidden>Tap ▶︎ in the player to start</p>
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

  /* SoundCloud Widget API: lets the page follow what happens inside the player (play,
     pause, end) and ask it to play. Loaded on first use; if it cannot load, playback
     still works and the page simply cannot follow it. */
  let scApi = null;
  function loadScApi() {
    if (!scApi) {
      scApi = new Promise((res, rej) => {
        if (window.SC && window.SC.Widget) return res(window.SC);
        const tag = document.createElement("script");
        tag.src = "https://w.soundcloud.com/player/api.js";
        tag.async = true;
        tag.onload = () => (window.SC && window.SC.Widget ? res(window.SC) : rej(new Error("no SC.Widget")));
        tag.onerror = () => rej(new Error("SoundCloud API blocked"));
        document.head.appendChild(tag);
      });
      scApi.catch(() => {});
    }
    return scApi;
  }

  let scWidget = null; // SC.Widget for the iframe in the deck, once ready
  let mounted = null; // { kind, i } of the item loaded in the deck
  let mountSeq = 0; // bumps on every new iframe so late events from an old one are ignored
  let blockTimer = 0;
  let armTimer = 0;
  let armFailed = false; // SoundCloud did not load for the armed player (e.g. a content blocker): stop arming

  const episodeItem = (e) => ({ url: e.url, embed: e.embed, code: `${radio().name || "UNKNOWN"} ${e.code || ""}`.trim(), title: e.title });
  function firstPlayable() {
    if (setsFromRadio()) {
      const eps = episodes();
      const k = eps.findIndex((e) => e.url);
      return k >= 0 ? { item: episodeItem(eps[k]), kind: "episode", i: k } : null;
    }
    const list = sets();
    const k = list.findIndex((x) => x.url);
    return k >= 0 ? { item: list[k], kind: "set", i: k } : null;
  }
  function latestEpisode() {
    const eps = episodes();
    const k = eps.findIndex((e) => e.url);
    return k >= 0 ? { item: episodeItem(eps[k]), kind: "episode", i: k } : null;
  }

  function setAudio(state) {
    if (!deck) return;
    if (state) deck.dataset.audio = state; else delete deck.dataset.audio;
    const hint = $(".m-deck__hint", deck);
    if (hint) hint.hidden = state !== "blocked";
    const label = $(".m-deck__label", deck);
    if (label) label.textContent = deck.dataset.state === "armed" ? "Tap ▶︎ to play" : state === "paused" ? "Paused" : "Now playing";
  }
  // If the player is ready but nothing plays within 2.5 s, the browser blocked autoplay:
  // say so instead of looking stuck.
  function watchForBlock(seq) {
    clearTimeout(blockTimer);
    blockTimer = setTimeout(() => {
      if (seq === mountSeq && deck && deck.dataset.audio === "waiting" && scWidget) setAudio("blocked");
    }, 2500);
  }

  function onAudioPlay(kind, i) {
    clearTimeout(blockTimer);
    if (playing.kind !== kind || playing.i !== i || deck.dataset.state !== "playing") {
      resetVideos();
      playing = { kind, i };
      deck.dataset.state = "playing";
      deck.dataset.kind = kind;
      root.classList.add("is-playing");
      markPlaying();
    }
    setAudio("on");
  }

  function mountWidget(s, kind, i, autoplay) {
    const seq = ++mountSeq;
    clearTimeout(blockTimer);
    scWidget = null;
    mounted = { kind, i };
    const src =
      "https://w.soundcloud.com/player/?url=" + encodeURIComponent(widgetTarget(s)) +
      "&color=%23" + scColor() + "&inverse=true&auto_play=" + (autoplay ? "true" : "false") + "&show_user=true";
    const frame = $(".m-deck__frame", deck);
    frame.innerHTML = `<iframe title="SoundCloud player: ${esc(s.title || s.code)}" src="${src}" height="20" scrolling="no" frameborder="no" allow="autoplay; encrypted-media"></iframe>`;
    $(".m-deck__title", deck).textContent = `${s.code ? s.code + " — " : ""}${s.title || "Set"}`;
    deck.dataset.kind = kind;
    const ifr = $("iframe", frame);
    const lt = listenTracker(kind, i);
    activeTracker = { seq, lt };
    loadScApi().then((SC) => {
      if (seq !== mountSeq || !ifr.isConnected) return;
      const w = SC.Widget(ifr);
      const E = SC.Widget.Events;
      w.bind(E.READY, () => {
        if (seq !== mountSeq) return;
        scWidget = w;
        clearTimeout(armTimer);
        if (deck.dataset.state === "armed") setAudio("ready");
        if (deck.dataset.audio === "waiting") {
          try { w.play(); } catch (e) { /* ignore */ }
          watchForBlock(seq);
        }
      });
      w.bind(E.PLAY, () => {
        if (seq !== mountSeq) return;
        onAudioPlay(mounted.kind, mounted.i);
        lt.play(w);
      });
      w.bind(E.PAUSE, () => {
        if (seq !== mountSeq) return;
        if (deck.dataset.audio === "on") setAudio("paused");
        lt.hold();
      });
      w.bind(E.FINISH, () => {
        if (seq !== mountSeq) return;
        setAudio("paused");
        lt.finish();
      });
      if (E.PLAY_PROGRESS) w.bind(E.PLAY_PROGRESS, (e) => { if (seq === mountSeq) lt.progress(e); });
      if (E.SEEK) w.bind(E.SEEK, () => { if (seq === mountSeq) lt.hold(); });
    }).catch(() => { if (seq === mountSeq) disarm(); });
  }

  /* Analytics for one loaded episode: episode_play once per load (api.js may report PLAY twice
     at the start, and again on every resume), then 25/50/75/90 % and every 15 minutes of time
     actually listened, not the position: a tick only counts what the wall clock allows, and a
     pause, seek or finish restarts the count from the next tick. Nothing is sent per tick.
     Only time listened while analytics is on counts. Accepted mid-episode: the play is reported
     then and the count starts at that moment. Withdrawn and allowed again on the same page: the
     play already reported is not sent again, and the count and the milestones already sent
     carry on from where they stopped. */
  const MILESTONES = [25, 50, 75, 90];
  let activeTracker = null; // { seq, lt } of the item loaded in the deck
  function listenTracker(kind, i) {
    const item = kind === "episode" ? episodes()[i] : sets()[i];
    const id = (item && item.code) || (kind === "set" ? `MRT-${pad(i)}` : "");
    const base = () => ({ episode_id: id, episode_title: (item && item.title) || "" });
    let started, reported, listened, last, lastAt, dur, sent, nextListen;
    // reported: this play-through's episode_play reached the dataLayer (a replay after FINISH is a new one)
    const reset = () => { started = false; reported = false; listened = 0; last = null; lastAt = 0; dur = 0; sent = {}; nextListen = 15; };
    reset();
    return {
      play(w) {
        last = null;
        if (!dur) {
          try { if (w && typeof w.getDuration === "function") w.getDuration((ms) => { if (Number(ms) > 0) dur = Number(ms); }); } catch (e) { /* ignore */ }
        }
        if (started) return;
        started = true;
        reported = track("episode_play", base());
      },
      hold() { last = null; },
      progress(e) {
        if (!e || !Number.isFinite(Number(e.currentPosition))) return;
        const pos = Number(e.currentPosition);
        const now = Date.now();
        if (last != null && tracking) {
          const d = pos - last;
          if (d > 0 && d <= now - lastAt + 2000) listened += d;
        }
        last = pos;
        lastAt = now;
        if (!dur && Number(e.relativePosition) > 0.01) dur = pos / Number(e.relativePosition);
        if (dur > 0) {
          MILESTONES.forEach((m) => {
            if (!sent[m] && listened >= dur * m / 100) { sent[m] = true; track("episode_progress", Object.assign(base(), { percent: m })); }
          });
        }
        while (listened >= nextListen * 60000) {
          track("episode_listen", Object.assign(base(), { listened_minutes: nextListen }));
          nextListen += 15;
        }
      },
      finish() {
        track("episode_complete", base());
        reset(); // a replay counts again
      },
      // analytics just started (or started again): counting resumes from this moment; the play
      // is reported only if this play-through has not reported it already
      consent() {
        last = null;
        if (started && !reported) reported = track("episode_play", base());
      },
    };
  }

  // Touch screens: load the newest episode's player without playing it, so the first
  // tap on its own ▶ starts the music.
  function armLatest() {
    if (!touchFirst || linkOnly || armFailed || !deck || deck.dataset.state === "playing") return;
    const f = latestEpisode() || firstPlayable();
    if (!f) return;
    deck.dataset.state = "armed";
    mountWidget(f.item, f.kind, f.i, false);
    setAudio("loading");
    // No player after 15 s: give the page's own play button back.
    const seq = mountSeq;
    clearTimeout(armTimer);
    armTimer = setTimeout(() => { if (seq === mountSeq && !scWidget) disarm(); }, 15000);
  }
  // The armed player could not load: unload it and stop arming for this visit.
  function disarm() {
    clearTimeout(armTimer);
    if (!deck || deck.dataset.state !== "armed") return;
    armFailed = true;
    mountSeq++;
    scWidget = null;
    mounted = null;
    $(".m-deck__frame", deck).innerHTML = "";
    deck.dataset.state = "idle";
    delete deck.dataset.kind;
    setAudio("");
  }

  function playItem(s, kind, i) {
    if (!s || !s.url || !deck) return;
    // Pressing the item that is already playing stops it (instead of reloading it from 0:00).
    if (playing.kind === kind && playing.i === i) { stop(); return; }
    resetVideos();
    const wasArmed = deck.dataset.state === "armed" && mounted && mounted.kind === kind && mounted.i === i;
    playing = { kind, i };
    deck.dataset.state = "playing";
    if (linkOnly) {
      $(".m-deck__frame", deck).innerHTML = `<span class="m-deck__preview">No audio in this preview</span> <a class="m-ext" href="${esc(s.url)}" target="_blank" rel="noopener">Listen on SoundCloud ↗</a>`;
      $(".m-deck__title", deck).textContent = `${s.code ? s.code + " — " : ""}${s.title || "Set"}`;
      deck.dataset.kind = kind;
      setAudio("");
    } else if (wasArmed && scWidget) {
      // This item's player is already loaded (touch screens): ask it to play.
      setAudio("waiting");
      try { scWidget.play(); } catch (e) { /* ignore */ }
      watchForBlock(mountSeq);
    } else {
      mountWidget(s, kind, i, true);
      setAudio("waiting");
    }
    root.classList.add("is-playing");
    markPlaying();
  }

  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

  function stop() {
    if (!deck) return;
    const was = playing;
    const hadFocus = deck.contains(document.activeElement);
    playing = { kind: "", i: -1 };
    clearTimeout(blockTimer);
    clearTimeout(armTimer);
    mountSeq++;
    scWidget = null;
    mounted = null;
    $(".m-deck__frame", deck).innerHTML = "";
    deck.dataset.state = "idle";
    delete deck.dataset.kind;
    setAudio("");
    root.classList.remove("is-playing");
    markPlaying();
    if (touchFirst) armLatest(); // keep a tappable player on touch screens
    // The Stop button just disappeared: keep keyboard focus somewhere sensible.
    if (hadFocus) {
      const attr = was.kind === "episode" ? "data-play-episode" : "data-play";
      const scope = sheetOpen ? sheet : document;
      const opener = `[data-open="${was.kind === "episode" ? "radio" : "sets"}"]`;
      const target = [deck.dataset.state === "armed" ? $(".m-deck__frame iframe", deck) : null, $(".m-deck__go", deck), ...$$(`[${attr}="${was.i}"]`, scope), sheetOpen ? $("[data-m='sheet-close']", sheet) : null, ...$$(opener)]
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
  const TITLES = Object.assign(Object.create(null), { sets: "Sets", videos: "Visuals", gigs: "Dates", posts: "Transmissions", post: "Transmission", insta: "Instagram", juliet: "Juliet", radio: "Radio", episode: "Episode", privacy: "Privacy" });
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
      case "privacy":
        return R.privacy();
      default:
        return "";
    }
  }

  /* ---------- Juliet's viewer: one picture large and whole, inside her sheet ----------
     Not a section of its own: no address, no history entry, no page view. Escape, Back or a new sheet closes it;
     only the pictures either side of the one on screen are fetched ahead. */
  let jv = null; // { el, i } while the viewer is open
  function viewJuliet(i) {
    const el = sheet && $(".m-jv", sheet);
    const list = julietGallery();
    if (!el || !list.length) return;
    const n = list.length;
    i = ((Math.round(Number(i)) || 0) % n + n) % n;
    const g = list[i];
    const lo = $(".m-jv__lo", el), hi = $(".m-jv__hi", el), stage = $(".m-jv__stage", el);
    // never drawn larger than the picture itself (a small one stays sharp); from `size`, or once it has loaded
    const fit = (w, h) => {
      stage.style.setProperty("--nw", w > 0 && h > 0 ? `${w}px` : "100%");
      stage.style.setProperty("--nh", w > 0 && h > 0 ? `${h}px` : "100%");
    };
    const r = julietRatio(g);
    fit(r ? Number(g.size[0]) : 0, r ? Number(g.size[1]) : 0);
    hi.classList.remove("is-in");
    hi.onload = () => {
      if (!jv || jv.i !== i) return;
      if (!r) fit(hi.naturalWidth, hi.naturalHeight);
      hi.classList.add("is-in");
    };
    lo.src = asset(g.thumb || g.src); // already in the grid: shows at once, the full picture lands on it
    hi.alt = julietAlt(g);
    hi.src = asset(g.src);
    if (hi.complete && hi.naturalWidth) {
      if (!r) fit(hi.naturalWidth, hi.naturalHeight);
      hi.classList.add("is-in");
    }
    $(".m-jv__cap", el).textContent = g.caption || "";
    $(".m-jv__file", el).textContent = `· File ${pad(i + 1)}`;
    $(".m-jv__count", el).textContent = `${pad(i + 1)} / ${pad(n)}`;
    $$(".m-jv__step", el).forEach((b) => (b.hidden = n < 2));
    if (n > 1) [i - 1, i + 1].forEach((k) => { const im = new Image(); im.decoding = "async"; im.src = asset(list[(k + n) % n].src); });
    if (!jv) {
      jv = { el, i };
      el.hidden = false;
      sheet.classList.add("is-viewing");
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
      const back = $(".m-jv__close", el);
      if (back) back.focus({ preventScroll: true });
    }
    jv.i = i;
  }
  function stepJuliet(d) { if (jv) viewJuliet(jv.i + d); }
  // returns whether a viewer was open; focus goes back to the picture that was on screen
  function closeJuliet(silent) {
    if (!jv) return false;
    const { el, i } = jv;
    jv = null;
    el.classList.remove("is-open");
    el.hidden = true;
    sheet.classList.remove("is-viewing");
    const tile = !silent && $(`[data-juliet-view="${i}"]`, sheet);
    if (tile) {
      tile.focus({ preventScroll: true });
      reveal(tile);
    }
    return true;
  }
  // Focus moved by script (preventScroll: the page itself never scrolls) is brought into view inside the sheet
  // body only: a picture below the fold scrolls up with its caption, the page and the board stay put.
  function reveal(el) {
    const body = el && el.closest(".sheet__body");
    if (!body) return;
    const box = el.closest("figure") || el;
    const b = body.getBoundingClientRect(), r = box.getBoundingClientRect();
    const k = b.height ? body.offsetHeight / b.height : 1; // the board scales the sheet on desktop
    const pad = 16;
    if (r.top < b.top + pad) body.scrollTop -= (b.top + pad - r.top) * k;
    else if (r.bottom > b.bottom - pad) body.scrollTop += Math.min(r.bottom - b.bottom + pad, r.top - b.top - pad) * k;
  }

  function open(type, arg, fromHistory) {
    if (!sheet || !TITLES[type]) return;
    clearTimeout(closeTimer);
    closeJuliet(true);
    if (sheet.hidden) lastFocus = document.activeElement;
    if (type === "videos") {
      resetVideos();
      if (playing.kind) stop(); // the sheet's video autoplays: one source at a time
    }
    sheet.dataset.type = type;
    sheetTitle.textContent = type === "privacy" ? PRIV_UI[privacyLang].sheet : TITLES[type];
    closeLabel(type === "privacy" ? PRIV_UI[privacyLang].close : "Close");
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
    // analytics: every sheet that opens is a page view (deep links and back/forward included)
    view = { section: type, arg };
    pageView();
  }

  // the close button speaks the privacy window's language while it is open in Spanish
  function closeLabel(word) {
    const b = $("[data-m='sheet-close']", sheet);
    if (!b || b.getAttribute("aria-label") === word) return;
    b.textContent = `[ × ] ${word}`;
    b.setAttribute("aria-label", word);
  }

  function close(fromHistory) {
    if (!sheet || sheet.hidden || !sheet.classList.contains("is-open")) return;
    closeJuliet(true);
    sheet.classList.remove("is-open");
    sheetOpen = false;
    view = { section: "home", arg: undefined };
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

  /* ---------- analytics: Google Tag Manager, only after the visitor accepts ----------
     Nothing from Google Tag Manager or Google Analytics loads before Accept: no gtm.js, no
     dataLayer. (YouTube thumbnails and titles are content, not analytics.) It only runs on the
     addresses in content.js analytics.domains (never on localhost, previews or link-only pages).
     The choice lives in localStorage "mrt-consent" as { v, analytics, at }; raising
     analytics.consentVersion asks every visitor again. Storage blocked: kept for this page only. */
  const AN = D.analytics || {};
  const GTM_ID = String(AN.gtm || "").trim();
  const GA4_ID = String(AN.ga4 || "").trim();
  const CONSENT_KEY = "mrt-consent";
  const CONSENT_V = Number(AN.consentVersion) || 1;
  const analyticsOn = !!GTM_ID && !linkOnly && (AN.domains || []).map(String).indexOf(location.hostname) >= 0;
  let consentMem = null; // the choice when storage is blocked
  let gtmStarted = false; // gtm.js is on this page
  let tracking = false; // dataLayer pushes allowed: granted, started and not withdrawn
  let view = { section: "home", arg: undefined }; // what the visitor is looking at, for page views

  function readConsent() {
    let c = consentMem;
    try {
      const s = localStorage.getItem(CONSENT_KEY);
      if (s) c = JSON.parse(s);
    } catch (e) { /* storage blocked: memory only */ }
    return c && c.v === CONSENT_V && (c.analytics === "granted" || c.analytics === "denied") ? c : null;
  }
  function writeConsent(choice) {
    consentMem = { v: CONSENT_V, analytics: choice, at: new Date().toISOString() };
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consentMem)); } catch (e) { /* storage blocked: this page only */ }
  }

  // Google's own helper: it pushes the arguments object, which is what GTM reads.
  function gtag() { window.dataLayer.push(arguments); }

  // Every push carries every key (undefined where it does not apply), so a value from an
  // earlier event never lingers in GTM's data model. A no-op without consent; returns whether
  // the push was made.
  const TRACK_KEYS = ["page_location", "page_title", "section", "episode_id", "episode_title", "percent", "listened_minutes", "video_id", "video_title"];
  function track(event, params) {
    if (!tracking) return false;
    const o = { event };
    TRACK_KEYS.forEach((k) => (o[k] = params && params[k] != null ? params[k] : undefined));
    window.dataLayer.push(o);
    return true;
  }

  // Human-readable, distinct per view: "UNKNOWN EP-13 · Hookah Lounge — …", "Transmissions · Why 4 a.m. …"
  function viewTitle(type, arg) {
    const show = radio().name || "UNKNOWN";
    if (type === "home") return `${(D.artist && D.artist.name) || "MAROATA"} · ${show}`;
    if (type === "radio") return `${show} · Radio`;
    if (type === "episode") {
      const e = episodes().find((x) => x.code === arg);
      return `${show} ${arg || ""}${e && e.title ? " · " + e.title : ""}`;
    }
    if (type === "post") {
      const p = posts().find((x) => x.slug === arg);
      return `Transmissions · ${p ? p.title : arg || ""}`;
    }
    return TITLES[type] || type;
  }
  function pageView() {
    track("virtual_page_view", { page_location: location.href, page_title: viewTitle(view.section, view.arg), section: view.section });
  }
  // an episode already started on this load (before Accept) is reported from now on
  function trackerConsent() {
    if (activeTracker && activeTracker.seq === mountSeq) activeTracker.lt.consent();
  }

  function startAnalytics() {
    if (!analyticsOn || tracking) return;
    if (gtmStarted) {
      // allowed again after a withdrawal on this same page: GTM is still loaded
      if (GA4_ID) window["ga-disable-" + GA4_ID] = false;
      gtag("consent", "update", { analytics_storage: "granted" });
      tracking = true;
      pageView();
      trackerConsent();
      return;
    }
    window.dataLayer = window.dataLayer || [];
    gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
    gtag("set", "ads_data_redaction", true);
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID);
    document.head.appendChild(s);
    gtmStarted = true;
    tracking = true;
    pageView();
    trackerConsent();
  }

  // Expire _ga and _ga_<id> host-only and on every parent domain (GA sets them on the registrable one).
  function clearGaCookies() {
    const names = document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => n === "_ga" || n.indexOf("_ga_") === 0);
    if (!names.length) return;
    const host = location.hostname;
    const labels = host.split(".");
    const domains = [""];
    if (!/^[\d.]+$/.test(host) && host.indexOf(":") < 0) for (let k = labels.length - 2; k >= 0; k--) domains.push(labels.slice(k).join("."));
    names.forEach((n) => domains.forEach((d) => {
      document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/${d ? "; domain=" + d : ""}`;
    }));
  }

  const mediaPlaying = () =>
    (!!deck && deck.dataset.state === "playing" && /^(on|waiting)$/.test(deck.dataset.audio || "")) || root.classList.contains("is-video-playing");

  function stopAnalytics() {
    if (gtmStarted && tracking) gtag("consent", "update", { analytics_storage: "denied" });
    if (GA4_ID) window["ga-disable-" + GA4_ID] = true;
    tracking = false;
    clearGaCookies();
    // Reload so GTM is gone from the page; never in the middle of a song or a video
    // (it then simply does not load on the next visit).
    if (gtmStarted && !mediaPlaying()) location.reload();
  }

  // Two copies, painted and shown together: the line on the main screen, and (when the page
  // has one) the same line at the top of the sheet, for visitors who land on a shared link.
  function showConsentLine(on) {
    // the line's buttons are about to disappear: keep keyboard focus nearby (the sheet's
    // close button inside an open sheet, the Privacy link on the main screen)
    const line = $$("[data-m='consent']").find((el) => !el.hidden && el.contains(document.activeElement));
    $$("[data-m='consent']").forEach((el) => (el.hidden = !on));
    root.classList.toggle("has-consent-line", on);
    if (!on && line) {
      const next = sheet && sheet.contains(line) ? $("[data-m='sheet-close']", sheet) : $$("[data-open='privacy']").find(shown);
      if (next) next.focus({ preventScroll: true });
    }
  }

  function choose(choice) {
    if (!analyticsOn || (choice !== "granted" && choice !== "denied")) return;
    writeConsent(choice);
    root.dataset.analytics = choice;
    showConsentLine(false);
    paintConsent();
    if (choice === "granted") startAnalytics(); else stopAnalytics();
  }

  // The line in the visitor's language (Spanish browsers get Aceptar / Rechazar), the same
  // rule as the privacy window; switching the window's language switches the line too.
  function paintLine() {
    const P = D.privacy || {};
    const t = PRIV_UI[privacyLang];
    const text = (privacyLang === "es" && P.promptEs) || P.prompt || "";
    $$("[data-m='consent']").forEach((line) => {
      line.setAttribute("lang", privacyLang);
      if (text) $$("[data-m='consent-text']", line).forEach((el) => (el.textContent = text));
      $$("[data-m='consent-label']", line).forEach((el) => (el.textContent = t.line));
      $$("[data-m='consent-more']", line).forEach((el) => (el.textContent = t.more));
      $$("[data-consent='granted']", line).forEach((el) => (el.textContent = t.accept));
      $$("[data-consent='denied']", line).forEach((el) => (el.textContent = t.decline));
    });
  }

  function initConsent() {
    const c = analyticsOn ? readConsent() : null;
    root.dataset.analytics = !analyticsOn ? "off" : c ? c.analytics : "unset";
    paintLine();
    showConsentLine(analyticsOn && !c);
    if (c && c.analytics === "granted") startAnalytics();
    // A choice made in another tab of the site applies here too: a withdrawal switches
    // Google Analytics off in every open tab (same path: cookies, ga-disable, reload if idle).
    if (analyticsOn) addEventListener("storage", (e) => {
      if (e.key !== CONSENT_KEY && e.key !== null) return; // null: storage cleared
      try {
        const now = readConsent();
        root.dataset.analytics = now ? now.analytics : "unset";
        showConsentLine(!now);
        paintConsent();
        if (now && now.analytics === "granted") startAnalytics();
        else if (tracking) stopAnalytics();
      } catch (err) { /* ignore */ }
    });
  }

  /* The privacy window: the current choice with two equal buttons, then the notice
     (English) or the aviso (Spanish). Opens in Spanish for Spanish-language browsers. */
  let privacyLang = /^es\b/i.test(navigator.language || "") ? "es" : "en";
  const PRIV_UI = {
    en: { sheet: "Privacy", label: "Analytics · Google", allow: "Allow analytics", deny: "Don't allow", granted: "Allowed", denied: "Not allowed", unset: "Not chosen yet", since: "since",
      off: "Analytics is not active on this copy of the site; nothing is sent to Google Analytics here.", none: "This site does not use analytics.",
      resp: "Responsible", contact: "Contact", updated: "Updated", lang: "Language", close: "Close",
      line: "Privacy · Analytics", more: "Privacy note", accept: "Accept", decline: "Decline" },
    es: { sheet: "Privacidad", label: "Analítica · Google", allow: "Permitir analítica", deny: "No permitir", granted: "Permitida", denied: "No permitida", unset: "Sin elegir todavía", since: "desde",
      off: "La analítica no está activa en esta copia del sitio; aquí no se envía nada a Google Analytics.", none: "Este sitio no usa analítica.",
      resp: "Responsable", contact: "Contacto", updated: "Actualizado", lang: "Idioma", close: "Cerrar",
      line: "Analítica", more: "Aviso de privacidad", accept: "Aceptar", decline: "Rechazar" },
  };
  const numDate = (dt) => `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;

  function consentStateText() {
    const t = PRIV_UI[privacyLang];
    if (!analyticsOn) return GTM_ID ? t.off : t.none;
    const c = readConsent();
    if (!c) return t.unset;
    const at = new Date(c.at);
    return `${t[c.analytics]}${isNaN(at) ? "" : ` ${t.since} ${numDate(at)}`}`;
  }
  function paintConsent() {
    const c = analyticsOn ? readConsent() : null;
    $$("[data-m='consent-state']").forEach((el) => (el.textContent = consentStateText()));
    $$(".m-privacy [data-consent]").forEach((b) => b.setAttribute("aria-pressed", String(!!c && c.analytics === b.dataset.consent)));
  }

  R.privacy = function () {
    const P = D.privacy || {};
    const doc = (privacyLang === "es" ? P.aviso : P.notice) || P.notice || {};
    const t = PRIV_UI[privacyLang];
    const c = analyticsOn ? readConsent() : null;
    const pressed = (v) => String(!!c && c.analytics === v);
    const body = (list) => (list || []).map((b) => Array.isArray(b)
      ? `<ul>${b.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
      : `<p>${esc(b)}</p>`).join("");
    const meta = [
      P.controller ? `<span>${t.resp} <b>${esc(P.controller)}</b></span>` : "",
      P.contact && P.contact.url ? `<span>${t.contact} ${ext(P.contact.url, esc(P.contact.label || P.contact.url) + " ↗")}</span>` : "",
      hasDate(P.updated ? { date: P.updated } : null) ? `<span>${t.updated} <time datetime="${esc(P.updated)}">${numDate(toDate(P.updated))}</time></span>` : "",
    ].filter(Boolean).join("");
    return `<div class="m-privacy" lang="${privacyLang}">
      <div class="m-privacy__choice${analyticsOn ? "" : " is-off"}">
        <p class="m-privacy__now"><span class="m-privacy__label">${t.label}</span><span class="m-privacy__state" data-m="consent-state" role="status">${esc(consentStateText())}</span></p>
        ${analyticsOn ? `<div class="m-privacy__btns">
          <button type="button" class="m-choice" data-consent="granted" aria-pressed="${pressed("granted")}">${t.allow}</button>
          <button type="button" class="m-choice" data-consent="denied" aria-pressed="${pressed("denied")}">${t.deny}</button>
        </div>` : ""}
      </div>
      <div class="m-privacy__top">
        <div class="m-privacy__lang" role="group" aria-label="${t.lang}">
          <button type="button" data-privacy-lang="en" lang="en" aria-pressed="${privacyLang === "en"}">English</button>
          <button type="button" data-privacy-lang="es" lang="es" aria-pressed="${privacyLang === "es"}">Español</button>
        </div>
        ${meta ? `<p class="m-privacy__meta">${meta}</p>` : ""}
      </div>
      <h2 class="m-privacy__title">${esc(doc.title || t.sheet)}</h2>
      ${doc.intro ? `<p class="m-privacy__intro">${esc(doc.intro)}</p>` : ""}
      ${(doc.sections || []).map((s) => `<section class="m-privacy__sec"><h3 class="m-privacy__h">${esc(s.heading || "")}</h3>${body(s.body)}</section>`).join("")}
    </div>`;
  };

  function setPrivacyLang(lang) {
    if (!PRIV_UI[lang] || !sheet || sheet.dataset.type !== "privacy") return;
    privacyLang = lang;
    const top = sheetBody.scrollTop;
    sheetBody.innerHTML = R.privacy();
    sheetTitle.textContent = PRIV_UI[lang].sheet;
    closeLabel(PRIV_UI[lang].close);
    paintLine();
    sheetBody.scrollTop = top;
    const b = $(`[data-privacy-lang="${lang}"]`, sheetBody);
    if (b) b.focus({ preventScroll: true });
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
    const list = $$(FOCUSABLE, jv ? jv.el : sheet).filter(shown); // Juliet's viewer keeps focus to itself
    // The deck's player is reachable too: the blocked hint asks for a press inside it.
    if (deckOnTop()) list.push(...$$("iframe, button:not([disabled])", $(".m-deck__live", deck) || deck).filter(shown));
    return list;
  }
  function inTrap(el) {
    return !!el && ((jv ? jv.el : sheet).contains(el) || (deck && deck.contains(el) && deckOnTop()));
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
      const t = e.target.closest("[data-play],[data-play-episode],[data-show-episode],[data-play-video],[data-video],[data-post],[data-open],[data-consent],[data-privacy-lang],[data-juliet-view],[data-jv],[data-m='sheet-close']");
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
      if (t.dataset.consent) return choose(t.dataset.consent);
      if (t.dataset.privacyLang) return setPrivacyLang(t.dataset.privacyLang);
      if (t.dataset.julietView != null) return viewJuliet(t.dataset.julietView);
      if (t.dataset.jv) return t.dataset.jv === "close" ? closeJuliet() : stepJuliet(Number(t.dataset.jv));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return closeJuliet() || close(); // the viewer first, then the sheet
      if (jv && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.altKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        return stepJuliet(e.key === "ArrowLeft" ? -1 : 1);
      }
      if (e.key !== "Tab" || !sheetOpen) return;
      const list = trapList();
      if (!list.length) return;
      // Move explicitly: the deck a design raises above the sheet is not next to it in DOM order.
      const k = list.indexOf(document.activeElement);
      const n = list.length;
      e.preventDefault();
      const to = list[k === -1 ? (e.shiftKey ? n - 1 : 0) : (k + (e.shiftKey ? n - 1 : 1)) % n];
      to.focus({ preventScroll: true });
      reveal(to);
    });
    // Focus that still slips out (e.g. tabbing out of an embedded player) goes back to the sheet.
    document.addEventListener("focusin", (e) => {
      if (!sheetOpen || inTrap(e.target)) return;
      const c = jv ? $(".m-jv__close", jv.el) : $("[data-m='sheet-close']", sheet);
      if (c) c.focus({ preventScroll: true });
    });
    // Juliet's viewer: a horizontal swipe (finger or pen) steps through the pictures
    let swipe = null;
    document.addEventListener("pointerdown", (e) => {
      swipe = jv && e.isPrimary && e.pointerType !== "mouse" && e.target.closest(".m-jv__stage") ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
    });
    document.addEventListener("pointerup", (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) stepJuliet(dx < 0 ? 1 : -1);
    });
    document.addEventListener("pointercancel", () => (swipe = null));
    // a gallery picture without a `size` in content.js takes its own shape once it has loaded
    document.addEventListener("load", (e) => {
      const img = e.target;
      const fig = img && img.tagName === "IMG" && img.closest("[data-ratio='auto']");
      if (fig && img.naturalWidth && img.naturalHeight) fig.style.setProperty("--r", (img.naturalWidth / img.naturalHeight).toFixed(4));
    }, true);
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
    upcomingGigs, render: R, play, playEpisode, playVideo, resetVideos, stop, open, close, fitBoard, parallax, touchFirst,
    broadcast, episodes, track,
    consent: { choose, read: readConsent, active: analyticsOn },
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
    if (touchFirst) {
      if (document.readyState === "complete") setTimeout(armLatest, 300);
      else addEventListener("load", () => setTimeout(armLatest, 300), { once: true });
    }
    tick();
    setInterval(tick, 1000);
    if (location.hash) openFromHash();
    initConsent(); // after a deep link has opened its sheet, so the first page view is that sheet
    requestAnimationFrame(() => root.classList.add("is-ready"));
    document.dispatchEvent(new CustomEvent("maroata:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
