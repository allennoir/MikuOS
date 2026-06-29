# PROCON//2026 — Lyric Decoder Terminal

A lyric app for the **Hatsune Miku「マジカルミライ 2026」Programming Contest**, built on the
[TextAlive App API](https://developer.textalive.jp/). It reimagines the contest concept art
as a *live audio-decoder terminal*: a **3D CRT** on a desk in a dark teal-lit room — a real
**Three.js / WebGL** scene (the CRT model is procedural; no external 3D assets) whose screen
"decrypts" each song into its lyrics in real time — characters scramble, then lock to the
beat. A glowing title card
(ROMAJI / 原題 / ENGLISH) gives way to live lyrics while singing, alongside a reactive
system-log feed, a top-bar HUD, and a pixel-art Miku that pulses on every beat.

> Concept → real life: `Gemini_Generated_Image_ov7j4gov7j4gov7j.png`

## Run it

It's a static site (HTML/CSS/JS, no server-side code), but the TextAlive API needs an
HTTP origin — so serve it, don't open `index.html` from disk:

```bash
npx serve .          # then open the printed http://localhost:3000
# or:  python -m http.server 8000
```

Pick a track on the boot screen (or press **1–6**) and hit **space** to play.

## Controls

| Input | Action |
|-------|--------|
| `1`–`6` | load contest track 1–6 |
| `space` | play / pause |
| `n` / `p` | next / previous track |
| `/` | focus the command line |
| commands | `/play` `/pause` `/stop` `/next` `/prev` `/load N` `/seek m:ss` `/tracks` `/boot` `/help` |

## The six 2026 contest songs (all included)

| # | Title | Producer |
|---|-------|----------|
| 1 | こたえて | imie |
| 2 | アフター・ザ・カーテン | Rulmry |
| 3 | シャッターチャンス | 夜未アガリ |
| 4 | 世界最後の音楽隊 | 夏山よつぎ×ど～ぱみん |
| 5 | トリツクロジー | 鶴三 |
| 6 | TAKEOVER | Twinfield |

Each is loaded via `player.createFromSongUrl()` with the contest's official version IDs
(`beatId` / `chordId` / `repetitiveSegmentId` / `lyricId` / `lyricDiffId`) so the timing
data is reproducible during judging.

## How it works

- **TextAlive App API** (`textalive-app-api@0.4.0`, loaded from unpkg as the UMD global
  `TextAliveApp`, with its `axios` peer dependency loaded first) supplies beat, chord, chorus
  and word/character timing.
- `app.js` (~190 lines, no framework) does all of it: one `onTimeUpdate` handler drives the
  HUD, beat grid, chorus state, the per-character decode animation, and the log feed. DOM is
  rebuilt only on phrase change; per-frame work is just text and class toggles.
- Displayed lyrics come straight from TextAlive — no AI-generated text/images/audio in the
  output (per contest rules). The pixel Miku and log messages are UI chrome.
- `scene.js` builds the 3D CRT in **Three.js** (procedural body/bezel/stand, desk, wall,
  lighting with the screen casting a teal glow) and maps the live `#crt` screen onto the
  display with `CSS3DRenderer` — so the terminal stays crisp and clickable, and `app.js`
  needs no knowledge of the 3D. Falls back to a flat screen if WebGL is unavailable.

## Token

The TextAlive App token is read from `window.TEXTALIVE_APP_TOKEN` if set, otherwise it falls
back to the value embedded in [app.js](app.js) (taken from `.env`). Browsers can't read `.env`
at runtime, so for a static deploy the token must live in the client — which is how the contest
expects lyric apps to ship. Rotate it before making the repo public.

> **axios is required.** The TextAlive App API UMD bundle declares `axios` as a peer
> dependency, so `index.html` loads it *before* the TextAlive script. Without it the library
> can't make a single HTTP request — the token never validates and you get a misleading
> "token not correctly specified" warning with the screen stuck on **NO SIGNAL**.
> Verified working: token `lGGaI9RYoqSyv4BM` loads こたえて as 38 phrases / 483 chars and
> decodes in sync.

## Troubleshooting

- **NO SIGNAL / stuck loading** → almost always a missing `axios` tag or no network. Confirm
  both `<script>` tags in `index.html` load (axios first), then reload.
- **No audio until you click** → browsers block autoplay; playback starts on your first
  keypress/click, which the boot screen provides.

## Files

```
index.html   structure + CDN/import-map + mounts
styles.css   the terminal screen (a fixed 1280×800 surface)
app.js       TextAlive player, songs, decode render, controls
scene.js     Three.js 3D CRT + room; maps the screen on via CSS3DRenderer
```
