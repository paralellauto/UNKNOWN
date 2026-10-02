# MAROATA

A one-page, no-scroll website for MAROATA techno sets and the **UNKNOWN** radio show, with Juliet as its muse. SoundCloud sets, UNKNOWN episodes with tracklists, a YouTube player, Instagram, a blog ("Transmissions"), your quotes and upcoming dates all float on a single screen. Each panel expands in place.

The design is **Signal** (Bunker × System Core): a dark oxblood room with a hairline grid and one sweeping beam of light, Juliet in colour as the framed subject, amber HUD windows you can drag around, and UNKNOWN as a black broadcast console across the bottom. Red only appears while the show is on air.

## Preview locally

The site is plain HTML, CSS and JavaScript. There is no build step. Serve the folder with any static server so the YouTube and SoundCloud players work (they refuse to run from `file://`):

```sh
npx serve .
# or
python3 -m http.server 8000
```

Then open http://localhost:8000 (or the port `serve` prints).

## Edit the content

Everything lives in **`assets/content.js`**. Each section has comments explaining it.

- **SoundCloud sets** (`soundcloud.sets`): newest first. `url` is the set's SoundCloud page. For a private or unlisted track, also paste the `src="…"` from SoundCloud's Share › Embed code into `embed`. Empty slots show as "Coming soon". "Play latest set" plays the first set in the list.
- **YouTube** (`youtube`): use the id from the URL (`watch?v=THIS_PART`). The first video plays inline in the Visuals window; add more and an "All picks" button appears. Rename "Recommended transmission" to the real video title.
- **UNKNOWN radio** (`radio`): the show's name, tagline, optional station, frequency and live-stream link. `schedule` is the weekly slot (`day`, `time`, `durationMin`) in the show's own `timezone` (an IANA name such as `America/Mexico_City`); the site converts it to each visitor's local time, counts down to the next broadcast and shows ON AIR while it is live. `episodes` are listed newest first, each with a `code` (used in its link, e.g. `#episode-UNK-003`), title, guest, date, recording `url` (plus `embed` for private tracks; leave both empty until the episode is uploaded) and a `tracklist` (one line per track; `"ID — ID"` is the usual way to mark an unreleased or unidentified track). The logo is set live in Bebas Neue, the typeface of your UNKNOWN image; the original image is kept in `assets/img/unknown/`.
- **Instagram** (`instagram`): Instagram does not let other sites pull your photos, so save the images you want into `assets/img/instagram/` and list them under `images`. The grid uses Juliet images as stand-ins until then. Add more accounts under `accounts`.
- **Quotes** (`quotes`): the four lines there are placeholders that show the layout. Replace them with yours.
- **Dates** (`gigs`): `date` is `YYYY-MM-DD`, `time` is `HH:MM`. Past dates disappear on their own. The countdown always points at the next one. Add `link` for tickets, and `timezone` (the venue's, e.g. `"Europe/Berlin"`) so the countdown is exact for visitors in other countries.
- **Transmissions** (`blog`): each post has a `slug` (used in its link, e.g. `#post-four-am`), a title, date, tag, short excerpt and `body` paragraphs.
- **Juliet** (`juliet`): her code, version, lines and gallery. Images are in `assets/img/juliet/`.

Anything marked `sample: true` shows a small **SAMPLE** tag so it is never mistaken for a real date, episode or post. Remove the flag, or the whole entry, when you replace it.

## Preview the ON AIR look

Add `?onair=1` to the address (or open it with `#onair`) to see the live state at any time. Only what you see changes; `content.js` stays as written.

## Links into a section

Every expanded panel has its own address, so you can share it directly:
`#sets`, `#gigs`, `#videos`, `#posts`, `#insta`, `#juliet`, `#radio`, `#post-<slug>`, `#episode-<code>`.

## Deploy

Any static host works: GitHub Pages, Netlify, Vercel or Cloudflare Pages. Point it at the repository root; there is nothing to build.

## Notes

- One player at a time: starting a set or an episode stops the YouTube video, and starting the video stops the set.
- Fonts are self-hosted in `assets/fonts/` (Archivo, IBM Plex Mono, Antonio, Martian Mono and Bebas Neue for the UNKNOWN logo, all under the SIL Open Font License). The site makes no requests to Google, which matters for GDPR in Germany.
- SoundCloud and YouTube load only after a visitor presses play.
- Visitors who turn on "reduce motion" in their system settings get a still version with no drifting, sweeping or typing.
- Phones and tablets get a dock at the bottom instead of floating windows; the page still never scrolls.
- The desktop layout is drawn on a 1280 × 800 board that scales to fit any window, so the composition stays the same from a 13" laptop to a large monitor.
- The three other design directions (Bunker, System Core, Nocturne) are in the git history if you ever want them back (commit `5f6aa53`).
