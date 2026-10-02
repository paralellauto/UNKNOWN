# MAROATA

A one-page, no-scroll website for MAROATA and the **UNKNOWN** radio show he hosts, with Juliet as its muse. UNKNOWN episodes (every MAROATA set is one) with tracklists, a YouTube player, a blog ("Transmissions"), quotes, upcoming dates and a link to Instagram all float on a single screen. Each panel expands in place.

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

- **UNKNOWN episodes** (`radio.episodes`): every MAROATA set is an UNKNOWN episode, so this one list fills the Sets window, the UNKNOWN console and the archive. Newest first. Each episode has a `code` (also its link, e.g. `#episode-EP-13`), a `title`, its SoundCloud `url`, and optionally `embed` (the `src="…"` from SoundCloud's Share › Embed code, needed for private or unlisted tracks), `date`, `guest` and a `tracklist` (one line per track; `"ID — ID"` marks an unidentified track). "Play latest episode" plays the first one.
- **UNKNOWN schedule** (`radio.schedule`): `null` while it is to be announced; the site then shows TBA instead of a countdown. When it is set (`day`, `time`, `durationMin`, `timezone` such as `"America/Mexico_City"`, short `city` label), the site converts it to each visitor's local time, counts down to the next broadcast and shows ON AIR while it is live. The logo is set live in Bebas Neue, the typeface of your UNKNOWN image; the original image is in `assets/img/unknown/`.
- **YouTube** (`youtube`): paste any YouTube link as `url` (or the 11-character `id`). The page pulls the real title and channel from YouTube by itself; add `title` only to override it. Videos play inside the page, never on YouTube. The first one plays in the Visuals window; with more than one, an "All picks" button opens the full list.
- **Instagram** (`instagram`): your account, shown as a link. There is no photo grid.
- **Quotes** (`quotes`): shown one at a time, rotating.
- **Dates** (`gigs`): empty while dates are to be announced. Each gig has `date` (`YYYY-MM-DD`), `time` (`HH:MM`), `city`, `venue`, and optionally `link` (tickets) and `timezone` (the venue's, so the countdown is exact for visitors elsewhere). Past dates disappear on their own.
- **Transmissions** (`blog`): each post has a `slug` (used in its link, e.g. `#post-four-am`), a title, date, tag, short excerpt and `body` paragraphs. The three posts there now are samples.
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
