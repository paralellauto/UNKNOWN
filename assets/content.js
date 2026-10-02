/*
  MAROATA — site content
  ----------------------------------------------------------------------------
  This is the only file you need to edit.

  Paths to images are relative to the site root (the folder with index.html).
  Dates use the format YYYY-MM-DD. Times use 24h "HH:MM".

  Anything marked `sample: true` shows a small SAMPLE tag on the site so it is
  never mistaken for a real date or post. Delete the flag (or the entry) when
  you replace it with your own.
*/
window.MAROATA = {
  artist: {
    name: "MAROATA",
    descriptor: "Techno sets",
    bpm: 132, // drives the pulse animations on every design
    booking: {
      label: "Bookings via Instagram",
      url: "https://www.instagram.com/maroata_/",
    },
  },

  /* UNKNOWN — the radio show, hosted by MAROATA. Every MAROATA set is an
     UNKNOWN episode, so this list also fills the Sets window and the
     "Play latest episode" button.
     The logo is set in Bebas Neue (self-hosted); the original image is in
     assets/img/unknown/.

     schedule: null while the slot is to be announced. When it is set, the site
     converts it to each visitor's local time, counts down to the next
     broadcast and shows ON AIR while it is live. Example:
       schedule: { day: "fri", time: "22:00", durationMin: 120,
                   timezone: "America/Mexico_City", city: "CDMX" },
     (day: "sun" "mon" "tue" "wed" "thu" "fri" "sat"; timezone is an IANA name.)

     episodes: newest first.
       code      short label, also the episode's link (#episode-EP-13)
       title     the episode title
       url       its SoundCloud page
       embed     optional: the src="…" from SoundCloud's Share › Embed code
                 (needed for private or unlisted tracks)
       date      optional, YYYY-MM-DD
       guest     optional
       tracklist optional, one line per track ("ID — ID" for unidentified) */
  radio: {
    name: "UNKNOWN",
    descriptor: "Radio show",
    host: "MAROATA",
    tagline: "Unreleased records, unidentified tracks, unnamed rooms.",
    station: "", // e.g. "Radio Station Name". Empty hides it.
    frequency: "", // e.g. "98.3 FM". Empty hides it.
    live: { url: "" }, // link to the live stream page. Empty hides "Listen live".
    schedule: null, // to be announced
    episodes: [
      {
        code: "EP-13",
        title: "Hookah Lounge — Road to Teques 6",
        url: "https://soundcloud.com/eduardo-love/episode-13",
        embed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2265452678&color=%23151010&inverse=false&auto_play=false&show_user=true",
        tracklist: [],
      },
    ],
  },

  /* JULIET — the muse. Images live in assets/img/juliet/ */
  juliet: {
    name: "JULIET",
    code: "JS-07",
    version: "4.2.7",
    lines: ["Beauty is the interface.", "Power is the system."],
    gallery: [
      { src: "assets/img/juliet/juliet-core-01.jpg", caption: "System Core / I" },
      { src: "assets/img/juliet/juliet-core-02.jpg", caption: "System Core / II" },
      { src: "assets/img/juliet/juliet-core-03.jpg", caption: "System Core / III" },
      { src: "assets/img/juliet/juliet-cosmic.jpg", caption: "Night Lens" },
      { src: "assets/img/juliet/juliet-mono.jpg", caption: "Mono Circuit" },
    ],
  },

  /* SOUNDCLOUD — your profile. Sets are the UNKNOWN episodes above.
     (A separate `sets: [...]` list here would replace them in the Sets window.) */
  soundcloud: {
    profile: "https://soundcloud.com/eduardo-love",
  },

  /* INSTAGRAM — a link to your account (no photo grid). */
  instagram: {
    accounts: [{ handle: "maroata_", url: "https://www.instagram.com/maroata_/" }],
    images: [],
  },

  /* YOUTUBE — recommended videos. Paste any YouTube link as `url` (or the
     11-character `id`). The title and channel are pulled from YouTube
     automatically; add `title: "…"` only to override them. Videos play inside
     the page. The first one plays in the Visuals window; with more than one,
     an "All picks" button opens the full list. */
  youtube: [
    {
      url: "https://www.youtube.com/watch?v=ECgC2QOxOFU&list=RDECgC2QOxOFU&start_radio=1",
      note: "Selected by MAROATA",
    },
  ],

  /* QUOTES — shown one at a time, rotating. Add or replace lines any time. */
  quotes: [
    { text: "The kick drum is the only clock I trust after midnight.", by: "MAROATA" },
    { text: "A good set is one long sentence with no full stop.", by: "MAROATA" },
    { text: "Darkness is the room making space for the sound.", by: "MAROATA" },
    { text: "Juliet does not dance. She listens until the room does.", by: "MAROATA" },
  ],

  /* GIGS — next dates. Past dates hide automatically.
     `link` is optional (tickets / event page).
     `timezone` is optional: the venue's IANA zone (e.g. "Europe/Berlin") makes
     the countdown exact for visitors in other countries. */
  gigs: [
    // To be announced. Example:
    // { date: "2026-11-14", time: "23:00", city: "Berlin", venue: "…", timezone: "Europe/Berlin", link: "https://…" },
  ],

  /* BLOG — "Transmissions". Each paragraph is one string in `body`.
     These three are sample posts that show the reader; replace them. */
  blog: [
    {
      slug: "four-am",
      title: "Why 4 a.m. sounds different",
      date: "2026-09-18",
      tag: "Field notes",
      sample: true,
      excerpt: "The room changes after the last train. So does the low end.",
      body: [
        "Something happens to a room after the last train leaves. The people who stay are not there to be seen. They are there to disappear for a while, and the music has to make that possible.",
        "At that hour I take the mids out and give the kick more room. Fewer hi-hats, longer blends, tracks that repeat until repetition stops feeling like repetition.",
        "The trick is patience. A peak-time set asks for attention. A 4 a.m. set earns trust, one bar at a time.",
      ],
    },
    {
      slug: "backwards",
      title: "Building a set backwards",
      date: "2026-08-30",
      tag: "Craft",
      sample: true,
      excerpt: "Start with the last record. Everything before it is the road there.",
      body: [
        "I pick the closing track first. It is the one I want people to walk out humming, so the whole set becomes a route toward it.",
        "From there I work back in blocks of three or four records, each block a little lighter and a little faster than the one before it in the timeline.",
        "When the first track finally lands, it never feels like a beginning. It feels like the first step of something already decided.",
      ],
    },
    {
      slug: "system-core",
      title: "Juliet, system core",
      date: "2026-08-02",
      tag: "Muse",
      sample: true,
      excerpt: "Every project needs a face that is not mine. This is hers.",
      body: [
        "Juliet started as a sketch on the back of a setlist. Cat-eye glasses, a star field in each lens, a look that says she has already heard the next track.",
        "She is the system core of MAROATA: the part that decides what stays in and what gets cut. Beauty is the interface. Power is the system.",
        "You will see her across every set, every flyer and every transmission here.",
      ],
    },
  ],
};
