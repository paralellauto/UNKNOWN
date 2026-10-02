# MAROATA

A one-page, no-scroll website for MAROATA techno sets, with Juliet as its muse. It holds SoundCloud sets, Instagram, recommended YouTube videos, a blog ("Transmissions"), your quotes, upcoming dates and your radio show UNKNOWN (its weekly slot, an ON AIR light, past episodes and tracklists), all floating on a single screen. Each panel expands in place.

There are **four design directions**. All of them read the same content file, so you can switch at any time without retyping anything.

| Option | Folder | Mood |
| --- | --- | --- |
| 1 · Bunker | `bunker/` | Berlin concrete after dark. Pure black and white, a beam of light that sweeps the room and lights up the wordmark. |
| 2 · System Core | `system-core/` | Juliet's own interface. Poster red, amber type, draggable HUD windows, a short boot sequence. |
| 3 · Nocturne | `nocturne/` | Inside Juliet's lenses. Star field, gold and violet, a Bodoni masthead over a locket portrait, drifting glass cards. |
| 4 · Signal | `signal/` | Bunker × System Core. Juliet's HUD windows running after hours in an oxblood-black room with one beam of light; UNKNOWN as a black broadcast console across the bottom, and red reserved for ON AIR. |

Open `index.html` to compare them side by side.

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

- **SoundCloud sets** (`soundcloud.sets`): paste a set's SoundCloud URL into an open slot and give it a title. Empty slots show as "Coming soon" on the site. The first slot plays your whole profile stream for now.
- **YouTube** (`youtube`): use the id from the URL (`watch?v=THIS_PART`). Rename the first video's title to the real one.
- **Instagram** (`instagram`): Instagram does not let other sites pull your photos, so save the images you want into `assets/img/instagram/` and list them under `images`. The grid uses Juliet images as stand-ins until then. Add more accounts under `accounts`.
- **Quotes** (`quotes`): the four lines there are placeholders that show the layout. Replace them with yours.
- **Dates** (`gigs`): `date` is `YYYY-MM-DD`, `time` is `HH:MM`. Past dates disappear on their own. The countdown always points at the next one. Add `link` for tickets. Add `timezone` (the venue's, e.g. `"Europe/Berlin"`) so the countdown is exact for visitors in other countries.
- **Transmissions** (`blog`): each post has a `slug` (used in its link, e.g. `#post-four-am`), a title, date, tag, short excerpt and `body` paragraphs.
- **UNKNOWN radio** (`radio`): the show's name, tagline, optional station, frequency and live-stream link. `schedule` is the weekly slot (`day`, `time`, `durationMin`) in the show's own `timezone` (an IANA name such as `America/Mexico_City`); the site converts it to each visitor's local time, counts down to the next broadcast and shows ON AIR while it is live. `episodes` are listed newest first, each with a `code` (used in its link, e.g. `#episode-UNK-003`), title, guest, date, recording `url` (leave it empty until the episode is uploaded) and a `tracklist` (one line per track; `"ID — ID"` is the usual way to mark an unreleased or unidentified track). The logo is set live in Bebas Neue, the typeface of your UNKNOWN image; the original image is kept in `assets/img/unknown/`. To preview the ON AIR look at any time, add `?onair=1` to the address (or `#onair`); this only changes what you see, not `content.js`.
- **Juliet** (`juliet`): her code, version, lines and gallery. Images are in `assets/img/juliet/`.

Anything marked `sample: true` shows a small **SAMPLE** tag so it is never mistaken for a real date or post. Remove the flag, or the whole entry, when you replace it.

## Links into a section

Every expanded panel has its own address, so you can share it directly:
`#sets`, `#gigs`, `#videos`, `#posts`, `#insta`, `#juliet`, `#radio`, `#post-<slug>`, `#episode-<code>`.

`#onair` is not a panel: it opens the page with the ON AIR preview turned on (same as `?onair=1`).

## After you choose

1. Copy the chosen folder's `index.html` to the site root, replacing the chooser.
2. In that file, change `data-base="../"` to `data-base=""` and replace every `../assets/` with `assets/`.
3. Delete the three folders you did not choose, plus `assets/previews/`.

## Deploy

Any static host works: GitHub Pages, Netlify, Vercel or Cloudflare Pages. Point it at the repository root; there is nothing to build.

## Notes

- Fonts are self-hosted in `assets/fonts/` (Archivo, IBM Plex Mono, Bebas Neue for the UNKNOWN logo, Antonio, Martian Mono, Bodoni Moda, Syncopate, Jost, all under the SIL Open Font License). The site makes no requests to Google, which matters for GDPR in Germany.
- SoundCloud and YouTube load only after a visitor presses play.
- Visitors who turn on "reduce motion" in their system settings get a still version with no drifting, sweeping or typing.
- Phones and tablets in portrait get a dock at the bottom instead of floating panels; the page still never scrolls.
- Desktop layouts are drawn on a 1280 × 800 board that scales to fit any window, so the composition stays the same from a 13" laptop to a large monitor.
