/*
  MAROATA — site content
  ----------------------------------------------------------------------------
  This is the only file you need to edit. All three design options read from it.

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

  /* UNKNOWN — the radio show.
     The logo is set in Bebas Neue (self-hosted); the original image is in
     assets/img/unknown/.

     schedule: when the show airs, in the show's own time zone. The site
     converts it to each visitor's local time, counts down to the next
     broadcast, and shows ON AIR while it is live.
     timezone uses IANA names: "America/Mexico_City", "Europe/Berlin", ...
     day: "sun" "mon" "tue" "wed" "thu" "fri" "sat".

     episodes: newest first. `url` is the SoundCloud (or Mixcloud) link to
     the recording. Leave it empty until the episode is uploaded.
     Tracklist lines are free text. "ID — ID" is the usual way to mark an
     unreleased or unidentified track. */
  radio: {
    name: "UNKNOWN",
    descriptor: "Radio show",
    host: "MAROATA",
    tagline: "Unreleased records, unidentified tracks, unnamed rooms.", // placeholder line, replace with yours
    station: "", // e.g. "Radio Station Name". Empty hides it.
    frequency: "", // e.g. "98.3 FM". Empty hides it.
    live: { url: "" }, // link to the live stream page. Empty hides "Listen live".
    schedule: {
      day: "fri",
      time: "22:00",
      durationMin: 120,
      timezone: "America/Mexico_City",
      city: "CDMX",
      sample: true, // remove once this is the real slot
    },
    episodes: [
      {
        code: "UNK-003",
        title: "Signal from nowhere",
        guest: "Guest to be announced",
        date: "2026-09-25",
        url: "https://soundcloud.com/eduardo-love", // stand-in: plays the SoundCloud profile
        length: "2:00:00",
        sample: true,
        tracklist: ["ID — ID", "ID — ID", "ID — ID", "ID — ID", "ID — ID", "ID — ID"],
      },
      {
        code: "UNK-002",
        title: "No names after midnight",
        guest: "MAROATA solo",
        date: "2026-09-18",
        url: "",
        length: "2:00:00",
        sample: true,
        tracklist: ["ID — ID", "ID — ID", "ID — ID", "ID — ID"],
      },
      {
        code: "UNK-001",
        title: "Pilot",
        guest: "MAROATA solo",
        date: "2026-09-11",
        url: "",
        length: "1:30:00",
        sample: true,
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

  /* SOUNDCLOUD — newest set first.
     url:   the set's SoundCloud page (used for "Open on SoundCloud" links).
     embed: optional. Paste the src="…" from SoundCloud's Share › Embed code
            (w.soundcloud.com/player/?url=…). Needed for private or unlisted
            tracks; public tracks also play from url alone.
     Leave url empty ("") and the slot shows as "Coming soon" on the site. */
  soundcloud: {
    profile: "https://soundcloud.com/eduardo-love",
    sets: [
      {
        code: "EP-13",
        title: "Hookah Lounge — Road to Teques 6",
        url: "https://soundcloud.com/eduardo-love/episode-13",
        embed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2265452678&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true",
        meta: "Episode 13 · SoundCloud",
      },
      {
        code: "ALL",
        title: "All uploads",
        url: "https://soundcloud.com/eduardo-love",
        meta: "Full SoundCloud stream",
      },
      { code: "EP-14", title: "", url: "", meta: "" },
      { code: "EP-15", title: "", url: "", meta: "" },
    ],
  },

  /* INSTAGRAM — accounts plus a few images.
     Instagram does not allow sites to pull your photos automatically, so save
     the images you want into assets/img/instagram/ and list them here.
     For now the grid uses Juliet images as stand-ins. */
  instagram: {
    accounts: [{ handle: "maroata_", url: "https://www.instagram.com/maroata_/" }],
    images: [
      { src: "assets/img/juliet/juliet-core-01.jpg", alt: "Juliet, System Core poster", url: "https://www.instagram.com/maroata_/" },
      { src: "assets/img/juliet/juliet-mono.jpg", alt: "Juliet in black and white", url: "https://www.instagram.com/maroata_/" },
      { src: "assets/img/juliet/juliet-core-02.jpg", alt: "Juliet in black, red background", url: "https://www.instagram.com/maroata_/" },
      { src: "assets/img/juliet/juliet-cosmic.jpg", alt: "Juliet with galaxy sunglasses", url: "https://www.instagram.com/maroata_/" },
      { src: "assets/img/juliet/juliet-core-03.jpg", alt: "Juliet with gold hoops", url: "https://www.instagram.com/maroata_/" },
      { src: "assets/img/juliet/juliet-core-01-figure.jpg", alt: "Juliet close-up", url: "https://www.instagram.com/maroata_/" },
    ],
  },

  /* YOUTUBE — recommended videos. `id` is the part after watch?v= in the URL.
     The first one plays inline in the Visuals window; with more than one,
     an "All picks" button opens the full list. */
  youtube: [
    {
      id: "ECgC2QOxOFU",
      title: "Recommended transmission", // rename to the real video title
      note: "Selected by MAROATA",
    },
    // Add more picks here: { id: "VIDEO_ID", title: "…", note: "…" }
  ],

  /* QUOTES — yours. These four are placeholders written to show the layout;
     replace them with your own lines. */
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
    { date: "2026-10-24", time: "23:00", city: "Ciudad de México", venue: "Venue to be announced", link: "", sample: true },
    { date: "2026-11-14", time: "00:00", city: "Berlin", venue: "Venue to be announced", link: "", sample: true },
    { date: "2026-12-05", time: "23:30", city: "Guadalajara", venue: "Venue to be announced", link: "", sample: true },
    { date: "2027-01-16", time: "22:00", city: "Tulum", venue: "Venue to be announced", link: "", sample: true },
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
