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
        code: "EP-14",
        title: "Radio Show",
        url: "https://soundcloud.com/eduardo-love/unknown-radio-show-ep-14",
        embed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2412280104&color=%230a0a08&inverse=false&auto_play=false&show_user=true",
        tracklist: [],
      },
      {
        code: "EP-13",
        title: "Hookah Lounge — Road to Teques 6",
        url: "https://soundcloud.com/eduardo-love/episode-13",
        embed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2265452678&color=%23151010&inverse=false&auto_play=false&show_user=true",
        tracklist: [],
      },
      {
        code: "EP-12",
        title: "Session 12",
        url: "https://soundcloud.com/eduardo-love/session-12",
        embed: "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A2181393787&color=%231c1a1b&inverse=false&auto_play=false&show_user=true",
        tracklist: [],
      },
    ],
  },

  /* JULIET — the muse. Images live in assets/img/juliet/

     code, version   her ID and version, shown on her file and in the top bar
     interface       the label in front of the version ("Human interface · v4.2.7")
     lines           her two lines, shown large on her file
     traits          shown as one row on her file
     status          shown as ">> Stable" lines on her file
     tagline         the last line of her file (a final "_" blinks like a cursor)

     scans: the pictures that take turns in the frame on the main screen; the
       beam swaps them one after another, in this order. The first one shows
       when the page opens. Use tall pictures with her face near the top and no
       lettering in them (the site writes its own). Only the one on screen and
       the next one are downloaded, so adding more does not slow the page.
       A picture that cannot be found is skipped.
       If you change the FIRST one, change it in index.html too (the <img> in
       figure id="subject"): that copy shows before this file is read, and if
       the two differ the page downloads both.
         src   the picture
         alt   a short description for people who cannot see it

     gallery: her file's pictures, in this order. The first one is the cover
       (shown large, next to her lines); every picture opens big when tapped.
       The rest are laid out in rows; the order below mixes tall and wide
       pictures so the rows come out even on phones too (a very wide one, like
       Mono Circuit, sits best near the end).
         src      the full-size picture (opens in the viewer)
         thumb    optional: a smaller copy for the grid (about 560 px on the
                  long side); without it the grid loads the full picture
         size     optional: [width, height] of the picture in pixels; keeps the
                  grid steady while pictures load
         caption  its name, shown under it
         alt      optional: a short description (default: "JULIET, " + caption) */
  juliet: {
    name: "JULIET",
    code: "JS-07",
    version: "4.2.7",
    interface: "Human interface",
    lines: ["Beauty is the interface.", "Power is the system."],
    traits: ["Beauty", "Intelligence", "Control", "Freedom"],
    status: ["Stable", "Synced", "Protected"],
    tagline: "A more beautiful system_",
    scans: [
      { src: "assets/img/juliet/juliet-core-03-figure.jpg", alt: "Juliet, the MAROATA muse, in black cat-eye sunglasses and gold hoops" },
      { src: "assets/img/juliet/juliet-signal-04-scan.jpg", alt: "Juliet in red neon light, cat-eye sunglasses pushed down, a chrome choker" },
      { src: "assets/img/juliet/juliet-core-02-figure.jpg", alt: "Juliet in galaxy-lens sunglasses and a black jacket" },
      { src: "assets/img/juliet/juliet-signal-05-scan.jpg", alt: "Juliet crouching in black leather before a circle of red light" },
      { src: "assets/img/juliet/juliet-signal-02-scan.jpg", alt: "Juliet seated in a black leather coat beside a column of red light" },
    ],
    gallery: [
      { src: "assets/img/juliet/juliet-signal-03.jpg", thumb: "assets/img/juliet/juliet-signal-03-thumb.jpg", size: [933, 1400], caption: "System Core / IV", alt: "JULIET System Core poster: Juliet, illustrated, in galaxy-lens sunglasses on red" },
      { src: "assets/img/juliet/juliet-signal-01.jpg", thumb: "assets/img/juliet/juliet-signal-01-thumb.jpg", size: [1145, 1374], caption: "System Core / V", alt: "JULIET System Core poster: Juliet close up, sunglasses pushed down, lit in red" },
      { src: "assets/img/juliet/juliet-core-01.jpg", thumb: "assets/img/juliet/juliet-core-01-thumb.jpg", size: [768, 1024], caption: "System Core / I" },
      { src: "assets/img/juliet/juliet-signal-02.jpg", thumb: "assets/img/juliet/juliet-signal-02-thumb.jpg", size: [933, 1400], caption: "System Core / VI", alt: "JULIET System Core poster: Juliet seated in a black leather coat beside a column of red light" },
      { src: "assets/img/juliet/juliet-signal-04.jpg", thumb: "assets/img/juliet/juliet-signal-04-thumb.jpg", size: [1145, 1374], caption: "Red Neon", alt: "Juliet in red neon light, cat-eye sunglasses pushed down, a chrome choker" },
      { src: "assets/img/juliet/juliet-core-02.jpg", thumb: "assets/img/juliet/juliet-core-02-thumb.jpg", size: [768, 1024], caption: "System Core / II" },
      { src: "assets/img/juliet/juliet-signal-05.jpg", thumb: "assets/img/juliet/juliet-signal-05-thumb.jpg", size: [933, 1400], caption: "System Core / VII", alt: "JULIET System Core poster: Juliet crouching in black leather before a circle of red light" },
      { src: "assets/img/juliet/juliet-mono.jpg", thumb: "assets/img/juliet/juliet-mono-thumb.jpg", size: [792, 360], caption: "Mono Circuit" },
      { src: "assets/img/juliet/juliet-core-03.jpg", thumb: "assets/img/juliet/juliet-core-03-thumb.jpg", size: [768, 1024], caption: "System Core / III" },
      { src: "assets/img/juliet/juliet-cosmic.jpg", size: [402, 360], caption: "Night Lens" },
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

  /* ANALYTICS — Google Analytics through your Google Tag Manager container.
     Google Tag Manager and Google Analytics load only after a visitor presses
     Accept on the small privacy line (or "Allow analytics" in the Privacy
     window). Visitors who decline, or never answer, are not counted at all.
     (The YouTube thumbnails and titles are a separate thing: they load for
     everyone, and the privacy note says so.)

       gtm      your Tag Manager container ID. Leave it empty ("") to switch
                analytics off completely: no privacy line is shown then.
       ga4      your Google Analytics measurement ID. Only used to switch
                Google Analytics off at once when a visitor withdraws.
       domains  analytics only runs on these addresses, never on your own
                computer or on preview links.
       consentVersion  raise it by one (2, 3, …) after a real change to what
                is collected: every visitor is then asked again. */
  analytics: {
    gtm: "GTM-KZKMF3XZ",
    ga4: "G-L2NGNTW3JP",
    domains: ["maroata-unknown.studio", "www.maroata-unknown.studio"],
    consentVersion: 1,
  },

  /* PRIVACY — the text of the Privacy window (the "Privacy" link on every
     screen opens it, and so does maroata-unknown.studio/#privacy).

       controller  who is responsible for the data
       contact     how visitors reach you about their data
       updated     date of the latest change to this text (YYYY-MM-DD)
       prompt      the sentence on the privacy line, next to Accept / Decline
       promptEs    the same sentence in Spanish, next to Aceptar / Rechazar
                   (shown to visitors whose browser is set to Spanish)
       notice      the English privacy note
       aviso       the Spanish "Aviso de privacidad" (for Mexico), switchable
                   in the window with EN / ES

     Each section has a heading and a body. Every string in the body is one
     paragraph; a list in [ ] brackets inside the body becomes bullet points.
     If you change what the site collects, update the text, the date and
     analytics.consentVersion above. */
  privacy: {
    controller: "MAROATA",
    contact: { label: "Instagram @maroata_", url: "https://www.instagram.com/maroata_/" },
    updated: "2026-10-02",
    prompt: "Allow Google Analytics to count this visit and which episodes get played? Google Analytics and Tag Manager load only if you accept. You can change this any time under Privacy.",
    promptEs: "¿Permites que Google Analytics cuente esta visita y qué episodios se escuchan? Google Analytics y Tag Manager solo se cargan si aceptas. Puedes cambiarlo cuando quieras en Privacy.",

    notice: {
      title: "Privacy note",
      intro: "The site works fully without analytics. If you allow it, Google Analytics shows MAROATA which episodes and pages people use. Google Analytics and Tag Manager load only if you accept.",
      sections: [
        {
          heading: "Who is responsible",
          body: [
            "MAROATA, the DJ behind this site and host of the UNKNOWN radio show, is responsible for the data described here. For questions or requests about your data, write via the contact above.",
          ],
        },
        {
          heading: "What Google Analytics records",
          body: [
            "Only after you press Accept (or Allow analytics) does the site load Google Tag Manager, which starts Google Analytics 4. It records:",
            [
              "the pages and sections you open",
              "the page or link you came from, and when and how long you visit",
              "episode plays and how much of an episode you listen to",
              "video plays",
              "clicks on links to Instagram and SoundCloud",
              "your device, operating system, browser and screen size",
              "your approximate location (country, region, city), worked out from your IP address",
            ],
            "Google Analytics 4 does not store full IP addresses of visitors in the EU. The site never sends your name, email address or anything else that identifies you. Google signals and ad personalisation are switched off; nothing is used for advertising.",
          ],
        },
        {
          heading: "Legal basis",
          body: [
            "Your consent: § 25(1) TDDDG for storing and reading cookies on your device, and Art. 6(1)(a) GDPR for the analysis. Declining changes nothing about what you can do on the site.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "Set only after you accept:",
            [
              "_ga: tells visits from the same browser apart; kept for up to 2 years",
              "_ga_L2NGNTW3JP: keeps track of the current visit; kept for up to 2 years",
            ],
          ],
        },
        {
          heading: "Changing your mind",
          body: [
            "Press Privacy on the main screen at any time and choose Don't allow. Google Analytics is switched off straight away, its _ga cookies are deleted and nothing more is sent. You can also delete or block cookies in your browser settings.",
          ],
        },
        {
          heading: "Who receives the data",
          body: [
            "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland, processes the data on MAROATA's behalf. Data may also reach Google LLC in the USA. Google LLC is certified under the EU-US Data Privacy Framework, for which the European Commission has adopted an adequacy decision.",
            "Separately from analytics, GitHub, Inc. (USA) hosts the site and SoundCloud and YouTube deliver the players (see Hosting and Players below).",
          ],
        },
        {
          heading: "How long it is kept",
          body: [
            "Google Analytics deletes event-level data after 2 months. The cookies expire after 2 years at most, or as soon as you choose Don't allow.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can ask for access to your data and for its rectification, erasure or restriction, object to its processing and ask for data portability (Art. 15–21 GDPR). You can withdraw your consent at any time; this does not affect what happened before. You can also complain to a data protection supervisory authority, for example in the country where you live.",
          ],
        },
        {
          heading: "Hosting",
          body: [
            "The site is served by GitHub Pages (GitHub, Inc., USA). Whenever a page is opened, GitHub receives your IP address, the page requested, the time, your browser and the page you came from, and may keep them in its server logs for security and to prevent abuse. This happens for every visit, whatever you choose about analytics, because it is how the page reaches you.",
            "The legal basis is MAROATA's legitimate interest in delivering the site securely (Art. 6(1)(f) GDPR; § 25(2) no. 2 TDDDG). GitHub is certified under the EU-US Data Privacy Framework. MAROATA has no access to these logs.",
          ],
        },
        {
          heading: "Players and links on the page",
          body: [
            "Some parts of the page come from other services and load whatever you choose about analytics, because they are the content itself:",
            [
              "SoundCloud plays the episodes. On phones and tablets the newest episode's player loads with the page, because phone browsers only let music start from a tap inside the player itself; this way one tap starts it. Elsewhere it loads when you press play. SoundCloud receives your IP address and browser details and may set its own cookies.",
              "YouTube: when the page opens, video thumbnails load from i.ytimg.com and video titles are fetched from youtube.com/oembed (or noembed.com as a fallback). The video player itself loads from youtube-nocookie.com only when you press play or open the Visuals window.",
              "Instagram is only linked: nothing loads from Instagram until you follow a link.",
            ],
            "These services act under their own privacy policies. The legal basis is MAROATA's legitimate interest in presenting the music and videos, and in letting one tap start an episode on phones (Art. 6(1)(f) GDPR).",
          ],
        },
        {
          heading: "Stored by the site itself",
          body: [
            "Kept in your browser and never sent anywhere:",
            [
              "mrt-consent: your analytics choice and when you made it",
              "mrt-yt-…: video titles, so they show at once next time (updated on each visit)",
              "mrt-signal-intro: plays the intro once per visit; gone when you close the tab",
            ],
          ],
        },
        {
          heading: "Changes",
          body: [
            "When this note changes in a way that matters, the site asks for your choice again. The date above shows the current version.",
          ],
        },
      ],
    },

    aviso: {
      title: "Aviso de privacidad",
      intro: "El sitio funciona completo sin analítica. Si la permites, Google Analytics le muestra a MAROATA qué episodios y páginas se usan. Google Analytics y Tag Manager solo se cargan si aceptas.",
      sections: [
        {
          heading: "Responsable",
          body: [
            "MAROATA, DJ de este sitio y conductor del programa de radio UNKNOWN, es responsable del tratamiento de los datos descritos aquí, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Para dudas o solicitudes sobre tus datos, escribe al contacto indicado arriba.",
          ],
        },
        {
          heading: "Datos que se tratan",
          body: [
            "Solo después de que eliges Aceptar (o Permitir analítica) el sitio carga Google Tag Manager, que activa Google Analytics 4. Se registran:",
            [
              "las páginas y secciones que abres",
              "la página o enlace del que vienes, y cuándo y cuánto tiempo visitas el sitio",
              "las reproducciones de episodios y cuánto escuchas de cada uno",
              "las reproducciones de video",
              "los clics en enlaces a Instagram y SoundCloud",
              "tu dispositivo, sistema operativo, navegador y tamaño de pantalla",
              "tu ubicación aproximada (país, región, ciudad), obtenida de tu dirección IP",
            ],
            "Google Analytics 4 no guarda direcciones IP completas de visitantes en la UE. El sitio nunca envía tu nombre, tu correo ni nada que te identifique, y no trata datos sensibles. Las señales de Google y la personalización de anuncios están desactivadas.",
          ],
        },
        {
          heading: "Finalidades",
          body: [
            "Medir de forma estadística cómo se usa el sitio y qué episodios se escuchan, para mejorar el programa y el sitio. Es una finalidad opcional: si no la aceptas, puedes usar todo el sitio igual. Los datos no se usan para publicidad.",
          ],
        },
        {
          heading: "Consentimiento",
          body: [
            "El tratamiento se basa en tu consentimiento, que das con el botón Aceptar de la línea de privacidad (o Permitir analítica en la ventana Privacy). Para visitantes de la Unión Europea: § 25(1) TDDDG y art. 6(1)(a) RGPD.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "Solo después de aceptar:",
            [
              "_ga: distingue visitas del mismo navegador; dura hasta 2 años",
              "_ga_L2NGNTW3JP: mantiene el estado de la visita actual; dura hasta 2 años",
            ],
          ],
        },
        {
          heading: "Cómo limitar el uso o revocar tu consentimiento",
          body: [
            "En cualquier momento toca Privacy en la pantalla principal y elige No permitir. Google Analytics se apaga al instante, sus cookies _ga se borran y no se envía nada más. También puedes borrar o bloquear cookies en la configuración de tu navegador.",
          ],
        },
        {
          heading: "Quién recibe los datos",
          body: [
            "Google Ireland Limited (Irlanda) y Google LLC (Estados Unidos) tratan los datos de la analítica por cuenta de MAROATA, como encargados. Google LLC está certificada en el Marco de Privacidad de Datos UE-EE. UU.",
            "Aparte de la analítica, GitHub, Inc. (Estados Unidos) aloja el sitio, y SoundCloud y YouTube entregan los reproductores (ver Alojamiento y Reproductores abajo). Tus datos no se comparten con nadie más.",
          ],
        },
        {
          heading: "Conservación",
          body: [
            "Google Analytics borra los datos de eventos después de 2 meses. Las cookies duran como máximo 2 años, o hasta que elijas No permitir.",
          ],
        },
        {
          heading: "Derechos ARCO",
          body: [
            "Puedes pedir el acceso a tus datos, su rectificación o cancelación, u oponerte a su tratamiento (derechos ARCO), y revocar tu consentimiento. Envía tu solicitud al contacto indicado arriba, con lo que pides y, si lo tienes, el valor de tu cookie _ga para poder localizar tus datos. Responderemos dentro de los plazos que marca la ley. Si no quedas conforme, puedes acudir a la autoridad de protección de datos personales.",
            "Visitantes de la UE: también tienen los derechos de limitación y portabilidad del RGPD y pueden presentar una reclamación ante una autoridad de control.",
          ],
        },
        {
          heading: "Alojamiento",
          body: [
            "El sitio se sirve desde GitHub Pages (GitHub, Inc., Estados Unidos). Cada vez que se abre una página, GitHub recibe tu dirección IP, la página solicitada, la hora, tu navegador y la página de la que vienes, y puede guardarlos en sus registros de servidor por seguridad y para prevenir abusos. Esto ocurre en cada visita, elijas lo que elijas sobre la analítica, porque es la forma en que la página llega a ti.",
            "Para visitantes de la UE, la base es el interés legítimo de MAROATA en entregar el sitio de forma segura (art. 6(1)(f) RGPD; § 25(2) núm. 2 TDDDG). GitHub está certificada en el Marco de Privacidad de Datos UE-EE. UU. MAROATA no tiene acceso a esos registros.",
          ],
        },
        {
          heading: "Reproductores y enlaces",
          body: [
            "Algunas partes de la página vienen de otros servicios y se cargan sin importar lo que elijas sobre la analítica, porque son el contenido mismo:",
            [
              "SoundCloud reproduce los episodios. En teléfonos y tabletas el reproductor del episodio más reciente se carga con la página, porque los navegadores de teléfono solo dejan iniciar música con un toque dentro del propio reproductor; así un solo toque lo inicia. En lo demás se carga al presionar play. SoundCloud recibe tu dirección IP y datos del navegador y puede poner sus propias cookies.",
              "YouTube: al abrir la página se cargan miniaturas desde i.ytimg.com y los títulos de los videos se consultan en youtube.com/oembed (o noembed.com como respaldo). El reproductor de video solo se carga desde youtube-nocookie.com cuando presionas play o abres la ventana Visuals.",
              "Instagram solo está enlazado: nada se carga desde Instagram hasta que sigues un enlace.",
            ],
            "Estos servicios actúan bajo sus propios avisos de privacidad. Para visitantes de la UE, la base es el interés legítimo de MAROATA en presentar la música y los videos (art. 6(1)(f) RGPD).",
          ],
        },
        {
          heading: "Datos guardados por el sitio",
          body: [
            "Se guardan en tu navegador y nunca se envían:",
            [
              "mrt-consent: tu elección sobre la analítica y cuándo la hiciste",
              "mrt-yt-…: títulos de videos, para mostrarlos al instante (se actualizan en cada visita)",
              "mrt-signal-intro: muestra la intro una vez por visita; se borra al cerrar la pestaña",
            ],
          ],
        },
        {
          heading: "Cambios a este aviso",
          body: [
            "Cualquier cambio a este aviso se publica aquí, con la fecha de actualización de arriba. Si el cambio es importante, el sitio te vuelve a pedir tu elección.",
          ],
        },
      ],
    },
  },
};
