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

  function upcomingGigs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (D.gigs || [])
      .filter((g) => g && g.date && toDate(g.date) >= today)
      .sort((a, b) => toDate(a.date, a.time) - toDate(b.date, b.time));
  }

  const sets = () => (D.soundcloud && D.soundcloud.sets) || [];
  const videos = () => D.youtube || [];
  const posts = () => (D.blog || []).slice().sort((a, b) => toDate(b.date) - toDate(a.date));
  const quotes = () => (D.quotes || []).filter((q) => q && q.text);
  const radio = () => D.radio || {};
  const episodes = () => (radio().episodes || []).slice().sort((a, b) => toDate(b.date) - toDate(a.date));

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
    const list = sets().slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">No sets yet.</p>`;
    return `<ol class="m-sets">${list
      .map((s, i) => {
        const code = esc(s.code || `MRT-${pad(i)}`);
        if (!s.url) {
          return `<li class="m-set is-open-slot"><div class="m-set__btn" aria-disabled="true">
            <span class="m-set__code">${code}</span>
            <span class="m-set__title">Open slot</span>
            <span class="m-set__meta">Add a SoundCloud link in content.js</span>
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

  R.videos = function (limit, exclude) {
    const list = videos()
      .map((v, i) => ({ v, i }))
      .filter((x) => x.i !== exclude)
      .slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">No videos yet.</p>`;
    return `<ul class="m-videos">${list
      .map(({ v, i }) => {
        if (!v.id) {
          return `<li class="m-video is-open-slot"><div class="m-video__btn" aria-disabled="true">
            <span class="m-video__thumb"><span class="m-video__slot">Open slot</span></span>
            <span class="m-video__title">Add a YouTube id in content.js</span></div></li>`;
        }
        return `<li class="m-video"><button type="button" class="m-video__btn" data-video="${i}" aria-label="Watch ${esc(v.title || "video")}">
          <span class="m-video__thumb"><img src="${thumb(v.id)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('is-broken');this.remove()"><span class="m-video__play" aria-hidden="true"></span></span>
          <span class="m-video__title">${esc(v.title || "Recommended")}</span>
          ${v.note ? `<span class="m-video__note">${esc(v.note)}</span>` : ""}</button></li>`;
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
    if (!list.length) return `<p class="m-empty">New dates soon.</p>`;
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
    if (!sc || !sc.day) return "";
    const di = DAY_INDEX[String(sc.day).slice(0, 3).toLowerCase()];
    return `${DAY_PLURAL[di] || esc(sc.day)} · ${esc(sc.time || "")}${sc.city ? " " + esc(sc.city) : ""}${sc.sample ? ` <span class="m-flag">Sample</span>` : ""}`;
  };

  R.episodes = function (limit) {
    const all = episodes();
    const list = all.slice(0, limit || undefined);
    if (!list.length) return `<p class="m-empty">First episode soon.</p>`;
    return `<ol class="m-episodes">${list
      .map((e, i) => {
        const p = parts(e.date);
        const code = esc(e.code || `UNK-${pad(all.length - i).padStart(3, "0")}`);
        const play = e.url
          ? `<button type="button" class="m-episode__play" data-play-episode="${i}" aria-label="Play ${code}"><span aria-hidden="true"></span></button>`
          : `<span class="m-episode__soon">Soon</span>`;
        return `<li class="m-episode${e.sample ? " is-sample" : ""}${e.url ? "" : " is-unreleased"}" data-episode="${i}">
          <button type="button" class="m-episode__btn" data-show-episode="${code}">
            <span class="m-episode__code">${code}</span>
            <span class="m-episode__title">${esc(e.title || "Untitled")}</span>
            <span class="m-episode__meta">${p.num}${e.guest ? " · " + esc(e.guest) : ""}${e.sample ? ` <span class="m-flag">Sample</span>` : ""}</span>
          </button>${play}</li>`;
      })
      .join("")}</ol>`;
  };

  R.radioLatest = function () {
    const all = episodes();
    const i = Math.max(0, all.findIndex((e) => e.url));
    const e = all[i];
    if (!e) return `<p class="m-empty">First episode soon.</p>`;
    const p = parts(e.date);
    return `<div class="m-radio-latest" data-episode="${i}">
      <span class="m-radio-latest__label">Latest episode</span>
      <button type="button" class="m-radio-latest__open" data-show-episode="${esc(e.code)}">
        <span class="m-radio-latest__code">${esc(e.code)}</span>
        <span class="m-radio-latest__title">${esc(e.title || "")}</span>
        <span class="m-radio-latest__meta">${p.num}${e.guest ? " · " + esc(e.guest) : ""}${e.sample ? ` <span class="m-flag">Sample</span>` : ""}</span>
      </button>
      ${e.url ? `<button type="button" class="m-radio-latest__play" data-play-episode="${i}"><span class="m-radio-latest__icon" aria-hidden="true"></span><span>Play episode</span></button>` : ""}
    </div>`;
  };

  R.tracklist = function (e) {
    const t = (e && e.tracklist) || [];
    if (!t.length) return `<p class="m-empty">Tracklist after the broadcast.</p>`;
    return `<ol class="m-tracklist">${t.map((line, k) => `<li><span class="m-tracklist__no">${pad(k + 1)}</span><span class="m-tracklist__track">${esc(line)}</span></li>`).join("")}</ol>`;
  };

  R.radioStatusBlock = function () {
    const r = radio();
    const b = broadcast(Date.now());
    const where = [r.station, r.frequency].filter(Boolean).map(esc).join(" · ");
    return `<div class="m-radio__status">
      <div class="m-radio__row">${R.onair(b && b.live)}<span class="m-radio__schedule">${R.schedule()}</span></div>
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

  R.episode = function (code) {
    const all = episodes();
    const i = all.findIndex((e) => e.code === code);
    const e = all[i];
    if (!e) return `<p class="m-empty">Episode not found.</p>`;
    const p = parts(e.date);
    const older = all[i + 1];
    const newer = all[i - 1];
    return `<article class="m-ep" data-episode="${i}">
      <p class="m-ep__meta"><span class="m-unknown m-ep__show">${esc(radio().name || "UNKNOWN")}</span><span>${esc(e.code)}</span><time datetime="${esc(e.date)}">${p.d} ${p.m} ${p.y}</time>${e.length ? `<span>${esc(e.length)}</span>` : ""}${e.sample ? `<span class="m-flag">Sample</span>` : ""}</p>
      <h2 class="m-ep__title">${esc(e.title || "Untitled")}</h2>
      ${e.guest ? `<p class="m-ep__guest">${esc(e.guest)}</p>` : ""}
      <div class="m-ep__actions">
        ${e.url ? `<button type="button" class="m-ep__play" data-play-episode="${i}"><span class="m-ep__icon" aria-hidden="true"></span><span>Play episode</span></button>${ext(e.url, "Open on SoundCloud ↗")}` : `<span class="m-ep__soon">Recording not uploaded yet</span>`}
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
        : `<iframe src="${src}" title="${esc(v.title || "YouTube video")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`}</div>
      <div class="m-player__info"><h2 class="m-player__title">${esc(v.title || "Recommended")}</h2>
        ${v.note ? `<p class="m-player__note">${esc(v.note)}</p>` : ""}
        ${ext(`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`, "Open on YouTube ↗")}</div>
      ${others.length ? `<div class="m-player__more">${R.videos(0, idx)}</div>` : ""}
    </div>`;
  };

  /* ---------- SoundCloud deck (one player for the whole page) ---------- */
  let deck = null;
  let playing = { kind: "", i: -1 };

  function buildDeck(el) {
    deck = el;
    deck.dataset.state = "idle";
    deck.innerHTML = `
      <div class="m-deck__idle">
        <button type="button" class="m-deck__go" data-play="first"><span class="m-deck__icon" aria-hidden="true"></span><span>Play latest set</span></button>
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
    const list = sets();
    if (i === "first") i = list.findIndex((s) => s.url);
    i = Number(i);
    playItem(list[i], "set", i);
  }

  function playEpisode(i) {
    i = Number(i);
    const e = episodes()[i];
    if (!e) return;
    playItem({ url: e.url, code: `${radio().name || "UNKNOWN"} ${e.code || ""}`.trim(), title: e.title }, "episode", i);
  }

  function playItem(s, kind, i) {
    if (!s || !s.url || !deck) return;
    playing = { kind, i };
    const src =
      "https://w.soundcloud.com/player/?url=" + encodeURIComponent(s.url) +
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

  function stop() {
    if (!deck) return;
    playing = { kind: "", i: -1 };
    $(".m-deck__frame", deck).innerHTML = "";
    deck.dataset.state = "idle";
    delete deck.dataset.kind;
    root.classList.remove("is-playing");
    markPlaying();
  }

  function markPlaying() {
    $$("[data-set]").forEach((li) => li.classList.toggle("is-playing", playing.kind === "set" && Number(li.dataset.set) === playing.i));
    $$("[data-episode]").forEach((li) => li.classList.toggle("is-playing", playing.kind === "episode" && Number(li.dataset.episode) === playing.i));
  }

  /* ---------- sheet (expanded view of any module) ---------- */
  const TITLES = { sets: "Sets", videos: "Visuals", gigs: "Dates", posts: "Transmissions", post: "Transmission", insta: "Instagram", juliet: "Juliet", radio: "Radio", episode: "Episode" };
  let sheet, sheetBody, sheetTitle, lastFocus, closeTimer;
  let pushed = 0; // history entries this page added for open sheets

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
        return `<div class="m-sheet__insta"><p class="m-sheet__handles">${R.handles()}</p>${R.insta()}</div>`;
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
    sheet.dataset.type = type;
    sheetTitle.textContent = TITLES[type];
    sheetBody.innerHTML = sheetContent(type, arg);
    tick();
    sheetBody.scrollTop = 0;
    markPlaying();
    sheet.hidden = false;
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
    root.classList.remove("has-sheet");
    closeTimer = setTimeout(() => {
      sheet.hidden = true;
      sheetBody.innerHTML = ""; // stops any playing video
    }, reduced ? 0 : 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (fromHistory) return;
    try {
      if (pushed > 0) history.go(-pushed);
      else if (location.hash) history.replaceState({}, "", location.pathname + location.search);
    } catch (e) { /* sandboxed */ }
    pushed = 0;
  }

  function openFromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return close(true);
    if (h.startsWith("post-")) return open("post", h.slice(5), true);
    if (h.startsWith("videos-")) return open("videos", h.slice(7), true);
    if (h.startsWith("episode-")) return open("episode", h.slice(8), true);
    if (TITLES[h] && h !== "post" && h !== "episode") return open(h, undefined, true);
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
      if (!next) { el.textContent = "Dates soon"; return; }
      let s = Math.max(0, Math.floor((toDate(next.date, next.time) - now) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      el.innerHTML = `<span class="m-cd"><b>${pad(d)}</b><i>D</i></span><span class="m-cd"><b>${pad(h)}</b><i>H</i></span><span class="m-cd"><b>${pad(m)}</b><i>M</i></span><span class="m-cd"><b>${pad(s)}</b><i>S</i></span>`;
    });
    // UNKNOWN radio: on-air state, next broadcast and countdown
    const b = broadcast(now.getTime());
    root.classList.toggle("radio-live", !!(b && b.live));
    $$("[data-m='radio-status']").forEach((el) => {
      const live = !!(b && b.live);
      if (el.dataset.live !== String(live)) { el.dataset.live = String(live); el.innerHTML = R.onair(live); }
    });
    $$("[data-m='radio-countdown-label']").forEach((el) => {
      el.textContent = b && b.live ? (el.dataset.liveText || "On air · ends in") : (el.dataset.offText || "Next broadcast in");
    });
    $$("[data-m='radio-countdown']").forEach((el) => {
      if (!b) { el.textContent = "Schedule soon"; return; }
      let s = Math.max(0, Math.floor(((b.live ? b.end : b.next) - now.getTime()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      el.innerHTML = `${d ? `<span class="m-cd"><b>${pad(d)}</b><i>D</i></span>` : ""}<span class="m-cd"><b>${pad(h)}</b><i>H</i></span><span class="m-cd"><b>${pad(m)}</b><i>M</i></span><span class="m-cd"><b>${pad(s)}</b><i>S</i></span>`;
    });
    $$("[data-m='radio-next']").forEach((el) => {
      if (!b || !b.next) { el.textContent = ""; return; }
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
        case "count-sets": el.textContent = pad(sets().filter((s) => s.url).length) + "/" + pad(sets().length); break;
        case "count-posts": el.textContent = pad(posts().length); break;
        case "count-gigs": el.textContent = pad(upcomingGigs().length); break;
        case "next-gig": {
          const g = upcomingGigs()[0];
          if (!g) { el.textContent = "New dates soon"; break; }
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
      const t = e.target.closest("[data-play],[data-play-episode],[data-show-episode],[data-video],[data-post],[data-open],[data-m='sheet-close']");
      if (!t) {
        if (sheet && !sheet.hidden && e.target === sheet) close();
        return;
      }
      if (t.matches("[data-m='sheet-close']")) return close();
      if (t.dataset.play != null) return play(t.dataset.play);
      if (t.dataset.playEpisode != null) return playEpisode(t.dataset.playEpisode);
      if (t.dataset.showEpisode != null) return open("episode", t.dataset.showEpisode);
      if (t.dataset.video != null) return open("videos", t.dataset.video);
      if (t.dataset.post != null) return open("post", t.dataset.post);
      if (t.dataset.open) return open(t.dataset.open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    addEventListener("popstate", () => {
      pushed = Math.max(0, pushed - 1);
      openFromHash();
    });
    addEventListener("resize", fitBoards);
  }

  const M = {
    data: D, $, $$, esc, asset, pad, parts, reduced, finePointer, desktopQuery,
    upcomingGigs, render: R, play, playEpisode, stop, open, close, fitBoard, parallax,
    broadcast, episodes,
    onTick: (fn) => tickers.push(fn), scale: 1,
  };
  window.M = M;

  function init() {
    fill();
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
