# MAROATA

A one-page, no-scroll website for MAROATA and **UNKNOWN**, the radio show hosted by MAROATA, with Juliet as its muse. UNKNOWN episodes (every MAROATA set is one) with tracklists, a YouTube player, a blog ("Transmissions"), quotes, upcoming dates and a link to Instagram all float on a single screen. Each panel expands in place.

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
`#sets`, `#gigs`, `#videos`, `#posts`, `#insta`, `#juliet`, `#radio`, `#privacy`, `#post-<slug>`, `#episode-<code>`.

## Deploy

The site is live through GitHub Pages at **https://maroata-unknown.studio/** (the `CNAME` file in the repository tells GitHub which domain it serves). Every push to the deployed branch goes live within a minute or two.

Setup, done once:

1. GitHub › repository Settings › Pages: Source "Deploy from a branch", the branch with the site, folder `/ (root)`. Custom domain: `maroata-unknown.studio`. Tick "Enforce HTTPS" once it is offered.
2. At the domain registrar (DNS):
   - `@` A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `@` AAAA records (optional, IPv6): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `www` CNAME: `paralellauto.github.io`
   - Remove any other A, AAAA or CNAME records on `@` and `www` (parking pages, forwarding).
3. Optional but recommended: GitHub › your account Settings › Pages › "Add a domain" to verify `maroata-unknown.studio` with a TXT record, so nobody else can claim it on GitHub.

Any other static host (Cloudflare Pages, Netlify, Vercel) also works: point it at the repository root; there is nothing to build.

Link previews (WhatsApp, Instagram, iMessage) use `assets/img/og-image.jpg`.

## Analytics

The site counts visits with Google Analytics 4 (GA4), loaded through Google Tag Manager (GTM), **only for visitors who say yes**.

- **Google Tag Manager and Google Analytics load only after a visitor accepts.** On maroata-unknown.studio every visitor sees a small consent line with two equal buttons, Accept and Decline (in Spanish, Aceptar and Rechazar, for visitors whose browser is set to Spanish). The site works the same either way. Until Accept is pressed, no file from Google Tag Manager or Google Analytics is requested and no analytics cookie is set. Declining is remembered and the line goes away. Until they answer, every window that opens (an episode, a post, `#radio`) shows the same line at its top, so visitors who arrive on a shared link can answer without closing it, and the view they landed on is the first one counted.
- **Changing their mind:** the small **Privacy** link, always visible on the main screen (and at `#privacy`), opens the privacy note with "Allow analytics" and "Don't allow". Don't allow switches Google Analytics off at once and deletes its `_ga` cookies, also in any other tab of the site the visitor has open.
- **Previews stay quiet:** analytics only runs on the addresses listed in `content.js`, never on `localhost` or a preview copy.

**What is measured** (never names, emails or anything typed by a visitor):

| Event | When | Details sent |
|---|---|---|
| `page_view` | once when analytics starts, then each time a section opens (radio, an episode, sets, dates, posts, a post, visuals, Instagram, Juliet, privacy) | `page_location` (address with the `#section`), `page_title`, `section` |
| `episode_play` | an episode starts playing in the SoundCloud player (once per play) | `episode_id` (e.g. `EP-13`), `episode_title` |
| `episode_progress` | 25, 50, 75 and 90 % of an episode actually listened to (skipping ahead does not count) | the episode, `percent` |
| `episode_listen` | every 15 minutes listened | the episode, `listened_minutes` (15, 30, 45 …) |
| `episode_complete` | an episode plays to the end | the episode |
| `video_play` | play is pressed on the YouTube video player on the main screen. Videos that start by themselves when the Visuals window opens count only as a `page_view` with `section` `videos` (so on phones, where videos play in the Visuals window, video starts show up as Visuals page views) | `video_id`, `video_title` |
| clicks to Instagram, SoundCloud | measured by GA4 itself ("outbound clicks") | the link |

GA4 adds what it always adds: device and browser type, approximate location (country, city), and how long people stay. It does not store full IP addresses.

**Where the IDs live:** `analytics` in `assets/content.js`:

- `gtm`: the Tag Manager container, `"GTM-KZKMF3XZ"`. Empty (`""`) turns analytics off completely; the consent line disappears too.
- `ga4`: the GA4 measurement ID, `"G-L2NGNTW3JP"`. The site only uses it to switch GA4 off the moment a visitor withdraws; the measuring itself is set up inside GTM (step 1 below).
- `domains`: the addresses where analytics may run.
- `consentVersion`: starts at `1`. Raise it by one after a real change to what is measured, and every visitor is asked again.

**The privacy note** is in `privacy` in `assets/content.js`: `notice` in English (for Germany and the EU) and `aviso`, the Spanish *Aviso de privacidad* for Mexico (visitors switch between them with EN / ES in the Privacy window), each in short sections you can edit like the rest of the file. `prompt` is the sentence on the consent line, `promptEs` the same in Spanish. Change `updated` when you change the note. Right now the note names "MAROATA" and Instagram as the contact; **German law (the Impressum duty and the GDPR) expects a real name and a contact address** (postal address and email) for whoever runs the site, so add them before relying on it. If you ever start measuring something new, the privacy note must say so, and visitors should be asked again: raise `analytics.consentVersion`, and the consent line shows to everyone once more.

### Set it up, once

**1. Google Tag Manager: import the ready-made container**

The file `setup/gtm-container.json` holds everything GTM needs (a folder "MAROATA analytics" with 4 tags, 3 triggers, 10 variables).

1. Open [tagmanager.google.com](https://tagmanager.google.com), container **GTM-KZKMF3XZ**.
2. Admin › **Import Container** › Choose container file › pick `setup/gtm-container.json`.
3. Choose workspace: **Existing** › **Default Workspace**.
4. Choose an import option: **Overwrite** if the container is still empty; otherwise **Merge** › **Rename conflicting tags, triggers, and variables**.
5. Check the summary (4 tags, 3 triggers, 10 variables added) and press **Confirm**.
6. Top right: **Submit** › **Publish** (name it e.g. "GA4 with consent").

If the container already had a GA4 or Google tag of its own (GA4's setup assistant sometimes creates one), pause or delete it, or visits are counted twice.

Do **not** paste GTM's code snippet into `index.html`: the site loads GTM by itself, and only after Accept. (GTM's `<noscript>` part is left out on purpose: it would load GTM without asking.)

**2. GA4: settings that match the site**

In [analytics.google.com](https://analytics.google.com), Admin (gear, bottom left) › Data collection and modification:

1. **Data streams** › the web stream for maroata-unknown.studio › **Enhanced measurement**, the gear icon:
   - **Page views** › Show advanced settings › untick **"Page changes based on browser history events"**. The site sends its own page view for each section; leaving this on counts them twice.
   - **Video engagement**: off (the site sends `video_play` itself; GA4 cannot see inside its player).
   - **Outbound clicks**: keep on (this measures the Instagram and SoundCloud links).
   - Scrolls, site search, form interactions and file downloads never happen on this one-screen site; leave them as they are.
   - Save.
2. **Data collection** › **Google signals data collection**: off. (Optional, for even less data: "Granular location and device data collection" off for the EU.)
3. **Data retention** › Event data retention: **2 months**; **"Reset user data on new activity"**: off. Save.
4. Admin › Account settings › **Account details**:
   - **Data processing terms**: review and **accept** the Data Processing Terms (Google Ads Data Processing Terms). The privacy note says Google processes the data on MAROATA's behalf; this is the agreement that makes it so.
   - **Data sharing settings**: untick **all** of them (Google products & services, Modeling contributions & business insights, Technical support, Recommendations for your business). Otherwise Google may use the data for its own purposes, which the privacy note does not allow. Save.

**3. GA4: make the details readable**

Admin › Data display › **Custom definitions** › **Create custom dimension**, once for each of these, with Scope **Event** and the same text as name and event parameter:

`section`, `episode_id`, `episode_title`, `percent`, `listened_minutes`, `video_id`

(`page_title`, `page_location` and `video_title` are built in, the last as "Video title"; do not add them.) Reports only show these details from the day they are registered on.

**4. Check that it works**

1. In GTM press **Preview**, enter `https://maroata-unknown.studio` and Connect. The site opens in a new tab (with Tag Assistant).
2. Press **Accept** on the consent line. (Already declined in that browser? Open **Privacy** › Allow analytics.) Tag Assistant connects once GTM loads.
3. In Tag Assistant: under *Initialization*, "GA4 - Google tag" fired; under *virtual_page_view*, "GA4 - page_view" fired. Open an episode, press play: *episode_play* with "GA4 - episode events". Press play on the video player on the main screen: *video_play*. (A video that starts by itself when the Visuals window opens counts only as a page view with section `videos`; on phones, where videos play in the Visuals window, video starts show up as Visuals page views.)
4. In GA4: Reports › **Realtime** shows you within a minute; Admin › **DebugView** lists each event with its details while Preview is on.
5. Then open `https://maroata-unknown.studio` in a private window, open the browser's developer tools › **Network**, type `googletagmanager` in the filter, press **Decline** and open a few sections: nothing appears in the list.

**5. Read the results** (standard reports fill in within a day or two)

- Reports › Engagement › **Events**: how many `episode_play`, `episode_progress`, `episode_complete`, `video_play`. Click an event to see its details, e.g. which `episode_title`; for `video_play`, the built-in **Video title** dimension names the video.
- Reports › Engagement › **Pages and screens**, switch the first column to **Page title and screen class**: which sections people open ("UNKNOWN · Radio", "UNKNOWN EP-13 · …", "Transmissions · …").
- **Explore** › Free form: e.g. rows `episode_title`, columns `percent`, values Event count, filter Event name = `episode_progress`, to see how far each episode is listened to; or the sum of `episode_listen` events per episode for listening time (each one is 15 minutes).

### If the import fails: build it by hand

In GTM (Workspace › New for each):

- **Variables › User-Defined**
  - Constant `GA4 Measurement ID` = `G-L2NGNTW3JP`
  - Data Layer Variable (version 2), one per key, named `DLV - <key>`: `page_location`, `page_title`, `section`, `episode_id`, `episode_title`, `percent`, `listened_minutes`, `video_id`, `video_title`
- **Variables › Built-In**: make sure **Event** is ticked.
- **Triggers** (all type Custom Event)
  - `CE - virtual_page_view`: event name `virtual_page_view`
  - `CE - episode events`: event name `^episode_(play|progress|listen|complete)$`, tick "Use regex matching"
  - `CE - video_play`: event name `video_play`
- **Tags**. On every tag: Advanced Settings › Consent Settings › **Require additional consent for tag to fire** › `analytics_storage`.
  - `GA4 - Google tag` (Google Tag): Tag ID `{{GA4 Measurement ID}}`; Configuration settings `send_page_view` = `false`, `allow_google_signals` = `false`, `allow_ad_personalization_signals` = `false`; trigger **Initialization - All Pages**.
  - `GA4 - page_view` (Google Analytics: GA4 Event): Measurement ID `{{GA4 Measurement ID}}`, event name `page_view`, parameters `page_location` = `{{DLV - page_location}}`, `page_title` = `{{DLV - page_title}}`, `section` = `{{DLV - section}}`; trigger `CE - virtual_page_view`.
  - `GA4 - episode events` (GA4 Event): Measurement ID `{{GA4 Measurement ID}}`, event name `{{Event}}`, parameters `episode_id`, `episode_title`, `percent`, `listened_minutes`, each = its `{{DLV - …}}`; trigger `CE - episode events`.
  - `GA4 - video_play` (GA4 Event): Measurement ID `{{GA4 Measurement ID}}`, event name `video_play`, parameters `video_id`, `video_title` from their `{{DLV - …}}`; trigger `CE - video_play`.
- Submit › Publish.

## Notes

- One player at a time: starting a set or an episode stops the YouTube video, and starting the video stops the set.
- Fonts are self-hosted in `assets/fonts/` (Archivo, IBM Plex Mono, Antonio, Martian Mono and Bebas Neue for the UNKNOWN logo, all under the SIL Open Font License), so nothing is fetched from Google Fonts.
- What the site loads from other companies, and when: the YouTube thumbnails (from `i.ytimg.com`) and video titles (from `youtube.com/oembed` and `noembed.com`) load when the page opens; a video itself plays from `youtube-nocookie.com` only when pressed or when the Visuals window is opened. The site itself is served by GitHub Pages, which receives every visitor's IP address with each request; the privacy note says so. SoundCloud is described below. Google Tag Manager and Google Analytics load only after a visitor presses Accept (see Analytics). The privacy note in `content.js` lists all of this for visitors.
- On computers, the SoundCloud and YouTube players load only after a visitor presses play, or, for YouTube, opens the Visuals window.
- On phones and tablets, the newest episode's SoundCloud player loads with the page, without playing. Phones only let a page start music when the tap lands inside SoundCloud's own player, so the page shows that player in the UNKNOWN strip and one tap on its ▶ starts the episode. If a browser still blocks playback after the site's own play button, the page says "Tap ▶ in the player to start". A legal note for you: because this player loads before the visitor does anything, SoundCloud may set its own cookies without being asked. The privacy note explains why (one-tap playback) and relies on your legitimate interest, but a strict reading of German law (§ 25 TDDDG) may expect a visitor's say first. The safer option is to load the player only after the first tap, at the cost of a second tap on phones; that is your call, ideally with a lawyer.
- Visitors who turn on "reduce motion" in their system settings get a still version with no drifting, sweeping or typing.
- Phones and tablets get a dock at the bottom instead of floating windows; the page still never scrolls.
- The desktop layout is drawn on a 1280 × 800 board that scales to fit any window, so the composition stays the same from a 13" laptop to a large monitor.
- The three other design directions (Bunker, System Core, Nocturne) are in the git history if you ever want them back (commit `5f6aa53`).
