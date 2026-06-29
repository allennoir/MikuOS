/* ===========================================================================
   MikuOS — PROCON//2026
   Hatsune Miku "Magical Mirai 2026" Programming Contest entry.

   A fictional desktop OS. Each of the six contest songs is a desktop shortcut;
   double-click one to launch its lyric-player "app" in a draggable window. One
   shared TextAlive Player drives playback (one song at a time, like a real music
   player) — the window you press ▶ in takes over the player and renders the live,
   beat-synced lyrics. A real taskbar, Start menu, system tray with a persistent
   Now-Playing transport, context menus, dialogs, a Media Player jukebox, Explorer,
   Notepad, Control Panel, Credits, a login + shutdown lifecycle, toasts, a 3D-CRT
   bridge and full keyboard / touch / reduced-motion support tie it together.

   Vanilla JS + TextAlive App API (UMD global: TextAliveApp). No build step.
   =========================================================================== */
"use strict";

/* TextAlive App token (value from .env). Embedded in the client per contest
   setup; override at runtime with window.TEXTALIVE_APP_TOKEN. */
const TOKEN = window.TEXTALIVE_APP_TOKEN || "lGGaI9RYoqSyv4BM";

/* All six 2026 contest songs. r = romaji, t = original title, e = english,
   c = accent colour (drives the per-song stage + CRT screen glow).
   Version IDs from https://developer.textalive.jp/events/magicalmirai2026/ */
const SONGS = [
  { t:"こたえて", a:"imie", r:"KOTAETE", e:"ANSWER ME", c:"#39c5bb", url:"https://piapro.jp/t/6W2N/20251215164617",
    v:{ beatId:4827293, chordId:2963754, repetitiveSegmentId:3086261, lyricId:126519, lyricDiffId:28645 } },
  { t:"アフター・ザ・カーテン", a:"Rulmry", r:"AFUTA ZA KATEN", e:"AFTER THE CURTAIN", icon:"❂", c:"#b18cff", url:"https://piapro.jp/t/zoqO/20251214200738",
    v:{ beatId:4827294, chordId:2963755, repetitiveSegmentId:3086262, lyricId:126591, lyricDiffId:28627 } },
  { t:"シャッターチャンス", a:"夜未アガリ", r:"SHATTA CHANSU", e:"SHUTTER CHANCE", icon:"◉", c:"#ffb454", url:"https://piapro.jp/t/PNpQ/20251209170719",
    v:{ beatId:4827295, chordId:2963756, repetitiveSegmentId:3086263, lyricId:126542, lyricDiffId:28628 } },
  { t:"世界最後の音楽隊", a:"夏山よつぎ×ど～ぱみん", r:"SEKAI SAIGO NO ONGAKUTAI", e:"THE LAST MARCH ON EARTH", icon:"♫", c:"#ff6b6b", url:"https://piapro.jp/t/B3yJ/20251215061727",
    v:{ beatId:4827296, chordId:2963757, repetitiveSegmentId:3086264, lyricId:126594, lyricDiffId:28629 } },
  { t:"トリツクロジー", a:"鶴三", r:"TORITSUKUROJI", e:"TORITSUKULOGY", icon:"✺", c:"#7fe06b", url:"https://piapro.jp/t/QBdL/20251215094303",
    v:{ beatId:4827297, chordId:2963758, repetitiveSegmentId:3086265, lyricId:126593, lyricDiffId:28630 } },
  { t:"TAKEOVER", a:"Twinfield", r:"TAKEOVER", e:"", icon:"⌁", c:"#ff7ec2", url:"https://piapro.jp/t/E2i3/20251215092113",
    v:{ beatId:4827298, chordId:2963759, repetitiveSegmentId:3086266, lyricId:126533, lyricDiffId:28631 } },
];

const LOGO = String.raw`
 ╔╦╗╦╦╔═╗╦ ╦  ╔═╗╔═╗
 ║║║║╠╩╗║ ║  ║ ║╚═╗
 ╩ ╩╩╩ ╩╚═╝  ╚═╝╚═╝   v2.6`;

const GLYPHS = "アカサタナハマヤラ0179<>/\\*+=#%&│┤┃▮▯░▒▓⌁⏃⏚".split("");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (ms) => { ms = Math.max(0, ms | 0); const s = (ms / 1000) | 0; return `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`; };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---- icons: inline SVGs (Lucide, MIT — publicly available) ---------------
   ico("name") returns an <svg class="ic …">. currentColor lets CSS drive the
   colour; sizing follows the container's font-size (1em). Transport glyphs are
   filled; the rest are stroked. All songs share the single "music" icon. */
const _ICON_STROKE = {
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  star: '<path d="M11.5 2.7a.5.5 0 0 1 .9 0l2.6 5.3 5.8.8a.5.5 0 0 1 .3.9l-4.2 4 1 5.8a.5.5 0 0 1-.8.5L12 17.3l-5.2 2.7a.5.5 0 0 1-.7-.5l1-5.8-4.2-4a.5.5 0 0 1 .3-.9l5.8-.8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  minimize: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  power: '<path d="M12 2v10"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>',
  restart: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M21 21v-5h-5"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  clapper: '<path d="m20.2 6-17.2 5-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9M12.4 3.4l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
  forward: '<path d="m12 5 7 7-7 7M5 12h14"/>',
  signal: '<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  run: '<path d="m9 18 6-6-6-6"/>',
};
const _ICON_FILL = {
  play: '<path d="M6 4.5v15l13-7.5z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  prev: '<path d="M19 5v14l-9-7zM7 5h2v14H7z"/>',
  next: '<path d="M5 5v14l9-7zM15 5h2v14h-2z"/>',
};
function ico(name, cls) {
  const c = "ic" + (cls ? " " + cls : "");
  if (_ICON_FILL[name]) return `<svg class="${c}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${_ICON_FILL[name]}</svg>`;
  return `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${_ICON_STROKE[name] || ""}</svg>`;
}
const SONG_ICON = "music";   // every song shares the same icon

/* environment flags */
const mqReduce = matchMedia("(prefers-reduced-motion:reduce)");
const coarse = matchMedia("(pointer:coarse)").matches || ("ontouchstart" in window);

/* ---- shell DOM ----------------------------------------------------------- */
const screenEl = $("#crt");
const elDesktop = $("#desktop"), elIcons = $("#icons"), elWindows = $("#windows");
const elTasks = $("#tasks"), elClock = $("#clock"), elNet = $("#netbtn");
const elStart = $("#startbtn"), elStartMenu = $("#startmenu"), elSmList = $("#sm-list");
const elBoot = $("#boot"), elBootLog = $("#bootlog");
const elLogin = $("#login"), elShutdown = $("#shutdown"), elRotate = $("#rotate");
const elNowPlaying = $("#nowplaying"), elVolBtn = $("#volbtn");
$(".boot .logo").textContent = LOGO;
if (coarse) document.body.classList.add("touch");

/* ---- player + global render state ---------------------------------------- */
let player, ready = false, loadedIndex = -1, loadTimer = 0, pendingPlay = false;
let active = null;                 // the App that currently owns the player
const apps = new Map();            // key -> App (windows currently open)
let zTop = 10;
let userStopping = false, isAdvancing = false, nearEnd = false;
let loggedIn = false;

/* per-frame lyric state for the active app */
let phrase = null, chars = [], scrambleTick = -1;
let lastBeat = -1, inChorus = false, bar = 0, lastDown = -1, pct = 0, bpm = "—";
let lastChordMinor = null, lastBeatPos = -1, lastRenderPos = 0;

/* =====================================================================
   Settings — tiny versioned localStorage store
   ===================================================================== */
const Settings = {
  KEY: "mikuos.v1", data: {}, _t: 0,
  load() { try { this.data = JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch { this.data = {}; } return this.data; },
  get(k, d) { return k in this.data ? this.data[k] : d; },
  set(k, v) { this.data[k] = v; clearTimeout(this._t); this._t = setTimeout(() => { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch {} }, 200); },
};
let reduceMotion = mqReduce.matches;

function applySettings() {
  const theme = Settings.get("theme", "blue");
  const wp = Settings.get("wallpaper", "bliss");
  screenEl.className = "screen" + (screenEl.classList.contains("ready") ? " ready" : "") + (screenEl.classList.contains("flat") ? " flat" : "");
  screenEl.classList.add("theme-" + theme);
  elDesktop.className = "desktop wp-" + wp;
  reduceMotion = mqReduce.matches || Settings.get("reduceMotion", false);
  screenEl.classList.toggle("reduce-motion", reduceMotion);
  screenEl.classList.toggle("no-scan", !Settings.get("scanlines", true));
  screenEl.style.setProperty("--vignette-a", Settings.get("vignette", 0.34));
  volume = Settings.get("volume", 80); muted = Settings.get("muted", false);
  Sfx.enabled = Settings.get("sounds", true);
  publishScene();
}
mqReduce.addEventListener && mqReduce.addEventListener("change", () => { reduceMotion = mqReduce.matches || Settings.get("reduceMotion", false); screenEl.classList.toggle("reduce-motion", reduceMotion); publishScene(); });

/* =====================================================================
   window.MikuScene — defensive bridge so scene.js can react to playback.
   Either file may load first; scene.js null-checks every read.
   ===================================================================== */
window.MikuScene = window.MikuScene || {};
function publishScene() {
  const s = window.MikuScene;
  s.playing = !!(player && player.isPlaying);
  s.chorus = inChorus;
  s.reduce = reduceMotion;
  s.songColor = active && active.song != null ? SONGS[active.song].c : "#7fb0ff";
}

/* =====================================================================
   Sfx — synthesized XP-style cues (no assets). Unlocked by first gesture.
   ===================================================================== */
const Sfx = {
  ctx: null, enabled: true, _queued: null,
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch {}
    if (this._queued) { const q = this._queued; this._queued = null; this.play(q); }
  },
  play(name) {
    if (!this.enabled || reduceMotion) return;
    if (!this.ctx) { this._queued = name; return; }
    const ctx = this.ctx, t0 = ctx.currentTime;
    const notes = {
      chime: [[523, 0, .12], [784, .1, .12], [1047, .2, .22]],
      open:  [[660, 0, .06], [990, .04, .07]],
      close: [[660, 0, .06], [440, .04, .08]],
      ding:  [[988, 0, .12], [988, .14, .14]],
      error: [[180, 0, .18], [140, .06, .22]],
      shutdown: [[784, 0, .14], [587, .12, .16], [392, .26, .3]],
    }[name] || [[660, 0, .08]];
    for (const [freq, at, dur] of notes) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = name === "error" ? "sawtooth" : "sine";
      o.frequency.value = freq;
      const start = t0 + at, gain = name === "chime" ? .16 : .09;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + .015);
      g.gain.exponentialRampToValueAtTime(.0001, start + dur);
      o.connect(g).connect(ctx.destination); o.start(start); o.stop(start + dur + .02);
    }
  },
};

/* =====================================================================
   Coordinate helpers — convert client px to the screen's 1280x1025 space.
   The CSS3D plane is scaled, so every direct-manipulation gesture divides
   by the rendered scale (rect.width / 1280), matching the original drag.
   ===================================================================== */
function scrScale() { const r = screenEl.getBoundingClientRect(); return r.width / 1280 || 1; }
function toScreen(clientX, clientY) { const r = screenEl.getBoundingClientRect(); const s = r.width / 1280 || 1; return { x: (clientX - r.left) / s, y: (clientY - r.top) / s }; }

/* =====================================================================
   Volume — one model, surfaced in the tray + every player transport
   ===================================================================== */
let volume = 80, muted = false;
function applyVolume() { if (!player) return; try { player.volume = muted ? 0 : volume; } catch {} }
function updateVolumeUI() {
  const ic = $(".vol-ic", elVolBtn);
  if (ic) ic.textContent = muted || volume === 0 ? "🔇" : volume < 45 ? "🔉" : "🔊";
  for (const a of apps.values()) if (a.el && a.el.vol) a.el.vol.value = muted ? 0 : volume;
  const fly = $("#volflyout .fill"); if (fly) fly.style.height = (muted ? 0 : volume) + "%";
}
function setVolume(v, save = true) { volume = clamp(v | 0, 0, 100); muted = false; applyVolume(); updateVolumeUI(); if (save) { Settings.set("volume", volume); Settings.set("muted", false); } }
function toggleMute() { muted = !muted; applyVolume(); updateVolumeUI(); Settings.set("muted", muted); }

/* =====================================================================
   Generic UI primitives — context menu, modal dialog, toast, flyout
   ===================================================================== */
let openMenu = null, openFlyout = null;
function dismissTransients(e) {
  if (openMenu && !(e && e.target.closest(".ctxmenu"))) { openMenu.remove(); openMenu = null; }
  if (openFlyout && !(e && (e.target.closest(".flyout") || e.target.closest("[data-flyout]")))) { openFlyout.remove(); openFlyout = null; }
  if (!elStartMenu.classList.contains("hidden") && !(e && e.target.closest("#startmenu,#startbtn"))) toggleStart(false);
}

function showContextMenu(clientX, clientY, items) {
  if (openMenu) { openMenu.remove(); openMenu = null; }
  const m = document.createElement("ul"); m.className = "ctxmenu";
  for (const it of items) {
    if (it.sep) { const li = document.createElement("li"); li.className = "sep"; m.appendChild(li); continue; }
    const li = document.createElement("li");
    if (it.disabled) li.className = "disabled";
    li.innerHTML = `<span class="ci">${it.icon || ""}</span><span class="cl">${esc(it.label)}</span>`;
    if (!it.disabled && it.act) li.addEventListener("click", () => { dismissTransients(); it.act(); });
    m.appendChild(li);
  }
  screenEl.appendChild(m);
  const { x, y } = toScreen(clientX, clientY);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = clamp(x, 2, 1280 - w - 2) + "px";
  m.style.top = clamp(y, 2, 1025 - h - 2) + "px";
  openMenu = m;
}

function makeDialog(title, bodyHTML, buttons) {
  return new Promise((resolve) => {
    const scrim = document.createElement("div"); scrim.className = "modal-scrim";
    const dlg = document.createElement("div"); dlg.className = "win dialog"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-label", title);
    dlg.innerHTML =
      `<header class="titlebar"><span class="tb-title">${esc(title)}</span>` +
      `<span class="tb-btns"><button class="x" title="close" aria-label="close"></button></span></header>` +
      `<div class="dlg-body">${bodyHTML}</div>` +
      `<div class="dlg-foot"></div>`;
    const foot = $(".dlg-foot", dlg);
    const done = (id) => { scrim.remove(); dlg.remove(); if (dlgStack[dlgStack.length - 1] === close) dlgStack.pop(); resolve(id); };
    const close = () => done(null);
    (buttons || [{ label: "OK", id: "ok", primary: true }]).forEach((b) => {
      const btn = document.createElement("button"); btn.className = "tbtn" + (b.primary ? " primary" : "");
      btn.textContent = b.label; btn.addEventListener("click", () => done(b.id)); foot.appendChild(btn);
    });
    $(".x", dlg).addEventListener("click", close);
    screenEl.appendChild(scrim); screenEl.appendChild(dlg);
    dlg.style.left = ((1280 - dlg.offsetWidth) / 2) + "px";
    dlg.style.top = clamp((1025 - dlg.offsetHeight) / 2 - 30, 30, 600) + "px";
    dlg.style.zIndex = ++zTop + 600;
    scrim.style.zIndex = zTop + 599;
    dlgStack.push(close);
    const primary = $(".tbtn.primary", foot) || $(".tbtn", foot); primary && primary.focus();
    Sfx.play("open");
  });
}
const dlgStack = [];

let toastTimer = 0;
function toast(msg, kind = "info", action) {
  let b = $("#toast");
  if (!b) { b = document.createElement("div"); b.id = "toast"; b.className = "balloon"; screenEl.appendChild(b); }
  b.className = "balloon " + kind;
  b.innerHTML = `<span class="bl-ic">${kind === "err" ? "✖" : kind === "warn" ? "⚠" : kind === "ok" ? "✓" : "ℹ"}</span><span class="bl-msg">${esc(msg)}</span>`;
  if (action) { const a = document.createElement("button"); a.className = "bl-act"; a.textContent = action.label; a.addEventListener("click", () => { b.remove(); action.act(); }); b.appendChild(a); }
  b.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => b && b.classList.add("hidden"), action ? 9000 : 4200);
}

/* close transients on outside interaction / Esc-less dismissals */
screenEl.addEventListener("pointerdown", dismissTransients, true);
addEventListener("blur", () => dismissTransients());

/* =====================================================================
   App windows
   ===================================================================== */
function cascade() { const n = apps.size; return { x: 150 + (n % 6) * 28, y: 40 + (n % 6) * 26 }; }

function focusWin(app) {
  app.win.style.zIndex = ++zTop;
  for (const a of apps.values()) a.win.classList.toggle("focused", a === app);
  renderTasks();
}

function makeWindow(key, title, icon, extraClass = "") {
  const win = document.createElement("div");
  win.className = "win " + extraClass;
  win.setAttribute("role", "dialog"); win.setAttribute("aria-label", title);
  const { x, y } = cascade();
  win.style.left = x + "px"; win.style.top = y + "px";
  win.innerHTML =
    `<header class="titlebar"><span class="tb-ico">${icon}</span>` +
    `<span class="tb-title">${esc(title)}</span>` +
    `<span class="tb-btns"><button class="min" title="minimize" aria-label="minimize">▁</button>` +
    `<button class="max" title="maximize" aria-label="maximize"></button>` +
    `<button class="x" title="close" aria-label="close"></button></span></header>`;
  elWindows.appendChild(win);

  const app = { key, win, title, icon, min: false, max: false, song: null };
  apps.set(key, app);

  win.addEventListener("pointerdown", () => focusWin(app), true);
  $(".min", win).addEventListener("click", (e) => { e.stopPropagation(); minimize(app); });
  $(".max", win).addEventListener("click", (e) => { e.stopPropagation(); toggleMax(app); });
  $(".x", win).addEventListener("click", (e) => { e.stopPropagation(); closeApp(app); });
  const tb = $(".titlebar", win);
  tb.addEventListener("dblclick", (e) => { if (e.target.closest(".tb-btns")) return; toggleMax(app); });
  tb.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: app.max ? "Restore" : "Maximize", icon: "❒", act: () => toggleMax(app) },
      { label: "Minimize", icon: "▁", act: () => minimize(app) },
      { sep: true },
      { label: "Close", icon: "✕", act: () => closeApp(app) },
    ]);
  });
  makeDraggable(app, tb);

  focusWin(app);
  Sfx.play("open");
  return app;
}

/* drag the title bar — screen-px deltas in the scaled CSS3D plane's own space.
   Dragging to the top edge maximizes; to a side edge snaps to that half (aero-snap-lite). */
let snapGhost = null;
function snapZoneFor(x, y) {
  if (y <= 6) return { zone: "max", left: 0, top: 0, w: 1280, h: 995 };
  if (x <= 6) return { zone: "left", left: 0, top: 0, w: 640, h: 995 };
  if (x >= 1274) return { zone: "right", left: 640, top: 0, w: 640, h: 995 };
  return null;
}
function showSnapGhost(z) {
  if (!z) { if (snapGhost) { snapGhost.remove(); snapGhost = null; } return; }
  if (!snapGhost) { snapGhost = document.createElement("div"); snapGhost.id = "snapghost"; elWindows.appendChild(snapGhost); }
  snapGhost.style.cssText = `left:${z.left}px;top:${z.top}px;width:${z.w}px;height:${z.h}px`;
}
function makeDraggable(app, handle) {
  let dragging = false, grabX = 0, grabY = 0, scale = 1, snap = null;
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tb-btns")) return;
    if (app.max) toggleMax(app);               // un-maximize on drag (XP behaviour)
    dragging = true; snap = null;
    const r = screenEl.getBoundingClientRect();
    scale = r.width / 1280 || 1;
    grabX = (e.clientX - r.left) / scale - app.win.offsetLeft;
    grabY = (e.clientY - r.top) / scale - app.win.offsetTop;
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const r = screenEl.getBoundingClientRect();
    let nx = (e.clientX - r.left) / scale - grabX;
    let ny = (e.clientY - r.top) / scale - grabY;
    nx = clamp(nx, -app.win.offsetWidth + 80, 1280 - 80);
    ny = clamp(ny, 0, 995 - 28);
    app.win.style.left = nx + "px"; app.win.style.top = ny + "px";
    const cur = toScreen(e.clientX, e.clientY);
    snap = snapZoneFor(cur.x, cur.y); showSnapGhost(snap);
  });
  const end = () => {
    if (!dragging) return; dragging = false;
    if (snap) {
      app.normalRect = { left: app.win.style.left, top: app.win.style.top, width: app.win.style.width, height: app.win.style.height };
      app.win.style.left = snap.left + "px"; app.win.style.top = snap.top + "px";
      app.win.style.width = snap.w + "px"; app.win.style.height = snap.h + "px";
      app.max = snap.zone === "max"; app.win.classList.toggle("max", app.max);
    }
    snap = null; showSnapGhost(null);
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

/* corner resize for resizable apps (song players + a few others) */
function makeResizable(app, minW = 360, minH = 240) {
  const g = document.createElement("i"); g.className = "rgrip"; g.title = "resize"; app.win.appendChild(g);
  let on = false, sx = 0, sy = 0, sw = 0, sh = 0, scale = 1;
  g.addEventListener("pointerdown", (e) => {
    if (app.max) return; e.stopPropagation(); on = true;
    scale = scrScale(); sx = e.clientX / scale; sy = e.clientY / scale;
    sw = app.win.offsetWidth; sh = app.win.offsetHeight;
    g.setPointerCapture(e.pointerId);
  });
  g.addEventListener("pointermove", (e) => {
    if (!on) return;
    const nw = clamp(sw + (e.clientX / scale - sx), minW, 1280 - app.win.offsetLeft);
    const nh = clamp(sh + (e.clientY / scale - sy), minH, 995 - app.win.offsetTop);
    app.win.style.width = nw + "px"; app.win.style.height = nh + "px";
  });
  g.addEventListener("pointerup", () => { on = false; });
  g.addEventListener("pointercancel", () => { on = false; });
}

function toggleMax(app) {
  if (!app.max) {
    app.normalRect = { left: app.win.style.left, top: app.win.style.top, width: app.win.style.width, height: app.win.style.height };
    app.max = true; app.win.classList.add("max");
    app.win.style.left = "0px"; app.win.style.top = "0px"; app.win.style.width = "1280px"; app.win.style.height = "995px";
  } else {
    app.max = false; app.win.classList.remove("max");
    const r = app.normalRect || {};
    app.win.style.left = r.left || "150px"; app.win.style.top = r.top || "40px";
    app.win.style.width = r.width || ""; app.win.style.height = r.height || "";
  }
  $(".max", app.win).setAttribute("aria-label", app.max ? "restore" : "maximize");
  focusWin(app);
}

function minimize(app) {
  app.min = true;
  if (!reduceMotion) {
    const tb = [...elTasks.children].find((b) => b.dataset.key === app.key);
    if (tb) {
      const tr = toScreen(tb.getBoundingClientRect().left + tb.offsetWidth / 2, tb.getBoundingClientRect().top);
      app.win.style.transformOrigin = "left top";
      app.win.style.transform = `translate(${tr.x - app.win.offsetLeft}px, ${tr.y - app.win.offsetTop}px) scale(.08)`;
      app.win.style.opacity = "0";
      app.win.style.transition = "transform .16s ease-in, opacity .16s ease-in";
      setTimeout(() => { app.win.classList.add("min"); app.win.style.transition = app.win.style.transform = app.win.style.opacity = ""; }, 160);
    } else app.win.classList.add("min");
  } else app.win.classList.add("min");
  renderTasks();
}
function restore(app) { app.min = false; app.win.classList.remove("min"); focusWin(app); }

function closeApp(app) {
  if (app.song != null && active === app) { userStopping = true; try { player && player.requestStop(); } catch {} active = null; setTimeout(() => userStopping = false, 300); }
  if (cinemaApp === app) exitCinema();
  apps.delete(app.key);
  app.win.remove();
  Sfx.play("close");
  renderTasks();
  updateNowPlaying();
  // closing the browser window ends the whole music-video scenario
  // (closeApp already played the close cue + removed the window, so end quietly then re-arm idle)
  if (app.key === "browser" && Cinema.running) { endScenario(false); resetIdle(); }
}

/* =====================================================================
   Cinema / full-screen karaoke mode (scoped to the focused song window)
   ===================================================================== */
let cinemaApp = null;
function enterCinema(app) {
  if (!app || app.song == null) return;
  cinemaApp = app; focusWin(app);
  screenEl.classList.add("cinema");
  app.win.classList.add("cinema-active");
  toast("Cinema mode — press Esc or F to exit", "info");
}
function exitCinema() {
  if (!cinemaApp) return;
  cinemaApp.win.classList.remove("cinema-active");
  screenEl.classList.remove("cinema");
  cinemaApp = null;
}
function toggleCinema(app) { app = app || active; if (!app) return; cinemaApp === app ? exitCinema() : enterCinema(app); }

/* ---- song app ------------------------------------------------------------ */
function openSong(i) {
  coachDismiss();
  i = (i + SONGS.length) % SONGS.length;
  const key = "song" + i;
  const existing = apps.get(key);
  if (existing) { restore(existing); pushMRU(i); return existing; }

  const s = SONGS[i];
  const app = makeWindow(key, `${s.t} — ${s.a}`, s.icon || "♪", "app-song");
  app.song = i;
  app.win.insertAdjacentHTML("beforeend",
    `<div class="appbody">
       <div class="stage" style="--accent:${s.c}">
         <div class="hero"><div class="titlecard"></div><div class="lyric"></div></div>
         <p class="sr-lyric sr-only" aria-live="polite"></p>
       </div>
       <div class="transport">
         <button class="tbtn prev" title="previous" aria-label="previous">⏮</button>
         <button class="tbtn play" title="play / pause" aria-label="play or pause">▶</button>
         <button class="tbtn next" title="next" aria-label="next">⏭</button>
         <div class="seek" role="slider" aria-label="seek"><div class="fill"></div></div>
         <span class="time">0:00 / 0:00</span>
         <button class="tbtn cine" title="cinema (F)" aria-label="cinema mode">⛶</button>
         <input class="vol" type="range" min="0" max="100" title="volume" aria-label="volume" />
       </div>
       <div class="statusline">● STANDBY — press ▶ to decode</div>
     </div>`);

  app.el = {
    hero: $(".hero", app.win), stage: $(".stage", app.win),
    titlecard: $(".titlecard", app.win), lyric: $(".lyric", app.win), sr: $(".sr-lyric", app.win),
    play: $(".play", app.win), fill: $(".fill", app.win),
    time: $(".time", app.win), status: $(".statusline", app.win), vol: $(".vol", app.win),
  };
  app.lines = [];
  showTitleCard(app, s);
  app.el.vol.value = muted ? 0 : volume;

  $(".play", app.win).addEventListener("click", () => togglePlay(app));
  $(".prev", app.win).addEventListener("click", () => { if (active === app) playNext(-1); else openSong(i - 1); });
  $(".next", app.win).addEventListener("click", () => { if (active === app) playNext(1); else openSong(i + 1); });
  $(".cine", app.win).addEventListener("click", () => toggleCinema(app));
  app.el.vol.addEventListener("input", (e) => setVolume(+e.target.value));
  $(".seek", app.win).addEventListener("pointerdown", (e) => {
    if (active !== app || !player || !player.video) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = clamp((e.clientX - r.left) / r.width, 0, 1);
    try { player.requestMediaSeek(ratio * (player.video.duration || 0)); } catch {}
  });

  makeResizable(app);
  alog(app, `[app] ${s.r} ready · ▶ to load & decode`, "ok");
  pushMRU(i);

  // Preload the first song opened so its ▶ starts audio within the click gesture.
  if (player && loadedIndex === -1) loadSong(app, false);
  return app;
}

function showTitleCard(app, s) {
  const parts = [s.r, s.t, s.e], cls = ["t-rom", "t-jp", "t-en"];
  const u = [...new Set(parts.filter(Boolean))];
  app.el.titlecard.innerHTML = u.map((t, k) => `<div class="${cls[k] || "t-en"}">${esc(t)}</div>`).join("");
}

function alog(app, msg, cls = "") {
  if (!app || !app.el || !app.el.minilog) return;   // minilog removed for the WMP look; player apps never had one
  app.lines.push(`<span class="${cls}">${esc(msg)}</span>`);
  if (app.lines.length > 6) app.lines.shift();
  app.el.minilog.innerHTML = app.lines.join("\n");
}

/* ---- README / about app -------------------------------------------------- */
function openReadme() {
  const key = "readme";
  if (apps.get(key)) { restore(apps.get(key)); return; }
  const app = makeWindow(key, "README.txt", "📄", "app-readme");
  app.win.insertAdjacentHTML("beforeend",
    `<div class="readme">
       <h1>初音ミク MikuOS</h1>
       <div class="by">マジカルミライ 2026 — Programming Contest entry</div>
       <p>Six winning songs, six shortcuts. <span class="accent">Double-click</span> a song on
          the desktop (or pick one from <kbd>START</kbd>) to launch its lyric player — or open
          <b>My Music</b> for the jukebox that plays all six back-to-back.</p>
       <p>Press <kbd>▶</kbd> in a window to take over playback — beat-synced lyrics decode live,
          character by character, in time with the music. Hit <kbd>⛶</kbd> or <kbd>F</kbd> for
          full-screen cinema karaoke.</p>
       <p>Shortcuts: <kbd>1</kbd>–<kbd>6</kbd> open a song · <kbd>Space</kbd> play/pause ·
          <kbd>F</kbd> cinema · <kbd>Esc</kbd> close the focused window. Right-click the desktop,
          icons, or a title bar for menus.</p>
       <p style="color:var(--dim);font-size:12px">powered by TextAlive App API · drag windows by their title bar · resize from the corner</p>
     </div>`);
  makeResizable(app, 320, 200);
}

/* ---- credits / attribution app (contest-required) ------------------------ */
function openCredits() {
  const key = "credits";
  if (apps.get(key)) { restore(apps.get(key)); return; }
  const app = makeWindow(key, "Credits", "★", "app-readme app-credits");
  const rows = SONGS.map((s, i) =>
    `<div class="credits-row">
       <span class="cr-ic" style="--accent:${s.c}">${s.icon || "♪"}</span>
       <span class="cr-meta"><b>${esc(s.t)}</b><span class="cr-rom">${esc(s.r)}${s.e ? " · " + esc(s.e) : ""}</span>
         <span class="cr-by">${esc(s.a)}</span></span>
       <a class="cr-link" href="${esc(s.url)}" target="_blank" rel="noopener">piapro ↗</a>
     </div>`).join("");
  app.win.insertAdjacentHTML("beforeend",
    `<div class="readme credits">
       <h1>Credits &amp; Attribution</h1>
       <div class="by">初音ミク「マジカルミライ 2026」プログラミング・コンテスト</div>
       <p>Lyrics &amp; music sync powered by the <a href="https://developer.textalive.jp/" target="_blank" rel="noopener">TextAlive App API</a>.
          Songs hosted on <a href="https://piapro.jp/" target="_blank" rel="noopener">piapro</a>. All rights belong to their respective creators.</p>
       <div class="credits-list">${rows}</div>
       <p style="color:var(--dim);font-size:11px;margin-top:12px">© MikuOS — a fan-made contest entry. Hatsune Miku © Crypton Future Media, INC.</p>
     </div>`);
  makeResizable(app, 360, 240);
}

/* ---- MikuOS Media Player — playlist jukebox over the shared player -------- */
function openPlayer(startIndex) {
  const key = "player";
  let app = apps.get(key);
  if (app) { restore(app); }
  else {
    app = makeWindow(key, "MikuOS Media Player", "♬", "app-player");
    app.player = true; app.song = null;
    app.win.insertAdjacentHTML("beforeend",
      `<div class="appbody player">
         <div class="pl-stage" style="--accent:#39c5bb">
           <div class="hero"><div class="titlecard"></div><div class="lyric"></div></div>
           <p class="sr-lyric sr-only" aria-live="polite"></p>
           <div class="viz" aria-hidden="true">${Array.from({ length: 16 }, () => "<i></i>").join("")}</div>
         </div>
         <ol class="playlist" role="listbox" aria-label="playlist"></ol>
         <div class="transport">
           <button class="tbtn prev" title="previous" aria-label="previous">⏮</button>
           <button class="tbtn play" title="play / pause" aria-label="play or pause">▶</button>
           <button class="tbtn next" title="next" aria-label="next">⏭</button>
           <button class="tbtn shuffle" title="shuffle" aria-label="shuffle">🔀</button>
           <button class="tbtn repeat" title="repeat" aria-label="repeat">🔁</button>
           <div class="seek" role="slider" aria-label="seek"><div class="fill"></div></div>
           <span class="time">0:00 / 0:00</span>
           <button class="tbtn cine" title="cinema (F)" aria-label="cinema mode">⛶</button>
         </div>
         <div class="statusline">● STANDBY — pick a track</div>
       </div>`);
    app.el = {
      hero: $(".hero", app.win), stage: $(".pl-stage", app.win),
      titlecard: $(".titlecard", app.win), lyric: $(".lyric", app.win), sr: $(".sr-lyric", app.win),
      play: $(".play", app.win), fill: $(".fill", app.win), time: $(".time", app.win),
      status: $(".statusline", app.win), viz: $$(".viz i", app.win), list: $(".playlist", app.win),
    };
    app.lines = []; app.shuffle = false; app.repeat = false;
    SONGS.forEach((s, i) => {
      const li = document.createElement("li"); li.className = "pl-row"; li.dataset.i = i; li.setAttribute("role", "option");
      li.innerHTML = `<span class="pl-ic" style="--accent:${s.c}">${s.icon || "♪"}</span>` +
        `<span class="pl-t">${esc(s.t)}</span><span class="pl-a">${esc(s.a)}</span><span class="pl-n">${i + 1}</span>`;
      li.addEventListener("click", () => playerSelect(app, i, true));
      app.el.list.appendChild(li);
    });
    $(".play", app.win).addEventListener("click", () => { if (active === app && player && player.video) (player.isPlaying ? player.requestPause() : player.requestPlay()); else playerSelect(app, app.song == null ? 0 : app.song, true); });
    $(".prev", app.win).addEventListener("click", () => playNext(-1));
    $(".next", app.win).addEventListener("click", () => playNext(1));
    $(".shuffle", app.win).addEventListener("click", (e) => { app.shuffle = !app.shuffle; e.currentTarget.classList.toggle("on", app.shuffle); });
    $(".repeat", app.win).addEventListener("click", (e) => { app.repeat = !app.repeat; e.currentTarget.classList.toggle("on", app.repeat); });
    $(".cine", app.win).addEventListener("click", () => toggleCinema(app));
    $(".seek", app.win).addEventListener("pointerdown", (e) => {
      if (active !== app || !player || !player.video) return;
      const r = e.currentTarget.getBoundingClientRect();
      try { player.requestMediaSeek(clamp((e.clientX - r.left) / r.width, 0, 1) * (player.video.duration || 0)); } catch {}
    });
    makeResizable(app, 420, 320);
  }
  if (startIndex != null) playerSelect(app, startIndex, true);
  return app;
}
function playerSelect(app, i, play) {
  i = (i + SONGS.length) % SONGS.length;
  app.song = i;
  app.win.setAttribute("aria-label", "MikuOS Media Player — " + SONGS[i].t);
  $$(".pl-row", app.win).forEach((r) => r.classList.toggle("cur", +r.dataset.i === i));
  showTitleCard(app, SONGS[i]);
  app.el.stage.style.setProperty("--accent", SONGS[i].c);
  loadSong(app, play);
  pushMRU(i);
}

/* ---- My Computer / Explorer over a fake filesystem ----------------------- */
function openExplorer(path) {
  const key = "explorer";
  let app = apps.get(key);
  if (!app) {
    app = makeWindow(key, "My Computer", "💻", "app-explorer");
    app.win.insertAdjacentHTML("beforeend",
      `<div class="appbody explorer">
         <div class="ex-bar"><button class="ex-back" title="back" aria-label="back">←</button>
           <span class="ex-crumb"></span></div>
         <div class="ex-body"><nav class="ex-tree"></nav><div class="ex-pane"></div></div>
       </div>`);
    app.el = { crumb: $(".ex-crumb", app.win), pane: $(".ex-pane", app.win), tree: $(".ex-tree", app.win) };
    app.history = [];
    const tree = [["My Music", "🎵"], ["My Documents", "📂"], ["My Pictures", "🖼"], ["Recycle Bin", "🗑"]];
    app.el.tree.innerHTML = tree.map(([n, ic]) => `<button class="ex-t" data-folder="${n}"><span>${ic}</span>${n}</button>`).join("");
    app.el.tree.addEventListener("click", (e) => { const b = e.target.closest(".ex-t"); if (b) exNav(app, b.dataset.folder); });
    $(".ex-back", app.win).addEventListener("click", () => { if (app.history.length > 1) { app.history.pop(); exNav(app, app.history.pop()); } });
    makeResizable(app, 420, 300);
  } else restore(app);
  exNav(app, path || "My Computer");
  return app;
}
function exNav(app, folder) {
  app.history.push(folder);
  app.el.crumb.textContent = "My Computer" + (folder !== "My Computer" ? " ▸ " + folder : "");
  $$(".ex-t", app.win).forEach((b) => b.classList.toggle("on", b.dataset.folder === folder));
  const items = [];
  if (folder === "My Computer") items.push(["My Music", "🎵", () => exNav(app, "My Music")], ["My Documents", "📂", () => exNav(app, "My Documents")], ["My Pictures", "🖼", () => exNav(app, "My Pictures")], ["Recycle Bin", "🗑", () => exNav(app, "Recycle Bin")]);
  else if (folder === "My Music") { items.push(["MikuOS Media Player", "♬", () => openPlayer()]); SONGS.forEach((s, i) => items.push([`${s.t}.mid`, s.icon || "♪", () => openSong(i), s.c])); }
  else if (folder === "My Documents") { items.push(["README.txt", "📄", openReadme], ["Credits.txt", "★", openCredits]); SONGS.forEach((s, i) => items.push([`${s.r} — lyrics.txt`, "📄", () => openNotepad(i)])); }
  else if (folder === "My Pictures") SONGS.forEach((s, i) => items.push([`${s.r}.png`, "🖼", () => openImageViewer(i), s.c]));
  else if (folder === "Recycle Bin") { /* empty */ }
  app.el.pane.innerHTML = items.length ? "" : `<div class="ex-empty">This folder is empty.</div>`;
  items.forEach(([name, ic, act, color]) => {
    const el = document.createElement("div"); el.className = "ex-item"; el.tabIndex = 0;
    el.innerHTML = `<div class="ex-ic"${color ? ` style="--accent:${color}"` : ""}>${ic}</div><div class="ex-lbl">${esc(name)}</div>`;
    el.addEventListener("dblclick", act);
    el.addEventListener("click", () => { $$(".ex-item", app.el.pane).forEach((o) => o.classList.toggle("sel", o === el)); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") act(); });
    app.el.pane.appendChild(el);
  });
}

/* ---- Notepad — lyric viewer / exporter ----------------------------------- */
function openNotepad(i) {
  const key = "notepad-" + i;
  if (apps.get(key)) { restore(apps.get(key)); return; }
  const s = SONGS[i];
  const app = makeWindow(key, `${s.r} — lyrics.txt — Notepad`, "📄", "app-notepad");
  app.notepadSong = i;
  app.win.insertAdjacentHTML("beforeend",
    `<div class="appbody notepad">
       <div class="np-menu"><span>File</span><span>Edit</span><span>Format</span>
         <button class="np-save tbtn" title="save as .txt">Save As…</button></div>
       <pre class="np-text" tabindex="0"></pre>
     </div>`);
  app.el = { text: $(".np-text", app.win) };
  const txt = lyricsText(i);
  app.el.text.textContent = txt;
  $(".np-save", app.win).addEventListener("click", () => downloadText(`${s.r}-lyrics.txt`, app.el.text.textContent));
  makeResizable(app, 320, 240);
  if (player && player.video && active && active.song === i) hydrateNotepad(app, i);
}
function lyricsText(i) {
  const s = SONGS[i];
  let head = `${s.t}\n${s.r}${s.e ? " — " + s.e : ""}\n${s.a}\n${"—".repeat(28)}\n\n`;
  if (player && player.video && active && active.song === i) {
    let body = "", ph = player.video.firstPhrase;
    while (ph) { body += (ph.text || "") + "\n"; ph = ph.next; }
    return head + (body || "(play this song once to load its lyrics)");
  }
  return head + "Play this song once and its lyrics will appear here,\nready to read and export.";
}
function hydrateNotepad(app, i) { app.el.text.textContent = lyricsText(i); }
function downloadText(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---- Image Viewer — pixel Miku / per-song "cover" ------------------------ */
function openImageViewer(i) {
  const key = "imgview";
  let app = apps.get(key);
  if (!app) {
    app = makeWindow(key, "Image Viewer", "🖼", "app-imgview");
    app.win.insertAdjacentHTML("beforeend",
      `<div class="appbody imgview">
         <div class="iv-canvas"><div class="iv-cover"></div><div class="iv-cap"></div></div>
         <div class="transport"><button class="tbtn prev" aria-label="previous">⏮</button>
           <span class="iv-name"></span><button class="tbtn next" aria-label="next">⏭</button></div>
       </div>`);
    app.el = { cover: $(".iv-cover", app.win), cap: $(".iv-cap", app.win), name: $(".iv-name", app.win) };
    $(".prev", app.win).addEventListener("click", () => ivShow(app, app.iv - 1));
    $(".next", app.win).addEventListener("click", () => ivShow(app, app.iv + 1));
    makeResizable(app, 300, 260);
  } else restore(app);
  ivShow(app, i || 0);
  return app;
}
function ivShow(app, i) {
  i = (i + SONGS.length) % SONGS.length; app.iv = i; const s = SONGS[i];
  app.el.cover.style.background = `radial-gradient(120% 120% at 50% 30%, ${s.c}55, #03100d 70%)`;
  app.el.cap.innerHTML = `<b>${esc(s.t)}</b><span>${esc(s.r)}</span>`;
  app.el.name.textContent = `${s.r}.png  (${i + 1}/${SONGS.length})`;
}

/* ---- Control Panel — theme, wallpaper, CRT effects, volume, motion, sound  */
function openControlPanel() {
  const key = "control";
  if (apps.get(key)) { restore(apps.get(key)); return; }
  const app = makeWindow(key, "Display Properties — Control Panel", "🛠️", "app-control");
  const themeOpt = (id, label) => `<button class="cp-swatch th-${id} ${Settings.get("theme", "blue") === id ? "on" : ""}" data-theme="${id}">${label}</button>`;
  const wpOpt = (id, label) => `<button class="cp-swatch wp-prev wp-${id} ${Settings.get("wallpaper", "bliss") === id ? "on" : ""}" data-wp="${id}">${label}</button>`;
  app.win.insertAdjacentHTML("beforeend",
    `<div class="appbody control">
       <fieldset><legend>Theme</legend><div class="cp-row">${themeOpt("blue", "Luna Blue")}${themeOpt("olive", "Olive")}${themeOpt("silver", "Silver")}</div></fieldset>
       <fieldset><legend>Wallpaper</legend><div class="cp-row">${wpOpt("bliss", "Miku")}${wpOpt("teal", "Teal Field")}${wpOpt("night", "Mikunight")}</div></fieldset>
       <fieldset><legend>CRT effects</legend>
         <label><input type="checkbox" id="cp-scan" ${Settings.get("scanlines", true) ? "checked" : ""}/> Scanlines</label>
         <label>Vignette <input type="range" id="cp-vig" min="0" max="60" value="${Math.round(Settings.get("vignette", .34) * 100)}"/></label>
       </fieldset>
       <fieldset><legend>Sound &amp; motion</legend>
         <label>Volume <input type="range" id="cp-vol" min="0" max="100" value="${muted ? 0 : volume}"/></label>
         <label><input type="checkbox" id="cp-snd" ${Settings.get("sounds", true) ? "checked" : ""}/> System sounds</label>
         <label><input type="checkbox" id="cp-rm" ${Settings.get("reduceMotion", false) ? "checked" : ""}/> Reduce motion</label>
         <label><input type="checkbox" id="cp-24" ${Settings.get("clock24", true) ? "checked" : ""}/> 24-hour clock</label>
       </fieldset>
     </div>`);
  app.win.querySelectorAll("[data-theme]").forEach((b) => b.addEventListener("click", () => {
    Settings.set("theme", b.dataset.theme); applySettings(); app.win.querySelectorAll("[data-theme]").forEach((o) => o.classList.toggle("on", o === b));
  }));
  app.win.querySelectorAll("[data-wp]").forEach((b) => b.addEventListener("click", () => {
    Settings.set("wallpaper", b.dataset.wp); applySettings(); app.win.querySelectorAll("[data-wp]").forEach((o) => o.classList.toggle("on", o === b));
  }));
  $("#cp-scan", app.win).addEventListener("change", (e) => { Settings.set("scanlines", e.target.checked); applySettings(); });
  $("#cp-vig", app.win).addEventListener("input", (e) => { Settings.set("vignette", +e.target.value / 100); applySettings(); });
  $("#cp-vol", app.win).addEventListener("input", (e) => setVolume(+e.target.value));
  $("#cp-snd", app.win).addEventListener("change", (e) => { Settings.set("sounds", e.target.checked); Sfx.enabled = e.target.checked; if (e.target.checked) Sfx.play("ding"); });
  $("#cp-rm", app.win).addEventListener("change", (e) => { Settings.set("reduceMotion", e.target.checked); applySettings(); });
  $("#cp-24", app.win).addEventListener("change", (e) => { Settings.set("clock24", e.target.checked); tickClock(); });
}

/* =====================================================================
   Playback — one shared player, the "active" app owns it
   ===================================================================== */
function init() {
  if (!window.TextAliveApp) { netState("err", "✖"); toast("TextAlive failed to load — is axios available? Lyrics unavailable; the desktop still works.", "err"); return; }
  player = new TextAliveApp.Player({
    app: { token: TOKEN }, mediaElement: $("#media"), mediaBannerPosition: "bottom right",
  });
  player.addListener({
    onAppReady() { netState("on", "▰▰▰"); applyVolume(); toast("TextAlive connected", "ok"); },
    onVideoReady() {
      clearTimeout(loadTimer);
      if (!active) return;
      const v = player.video;
      active.el.lyric.classList.remove("loading");
      phrase = null; chars = [];
      alog(active, `[lyric] ${v.phraseCount} phrases / ${v.charCount} chars`, "ok");
      applyVolume();
      setStatus("pause");
      // hydrate any open Notepad for this song
      for (const a of apps.values()) if (a.notepadSong === active.song) hydrateNotepad(a, active.song);
      if (pendingPlay) { pendingPlay = false; try { player.requestPlay(); } catch {} }
    },
    onTimerReady() { if (active) alog(active, "[timer] armed — playing", "ok"); },
    onTimeUpdate: render,
    onPlay() { setStatus("live"); publishScene(); updateNowPlaying(); updateTaskDots(); },
    onPause() { setStatus("pause"); publishScene(); updateNowPlaying(); updateTaskDots(); maybeAdvance(); },
    onStop() { setStatus("pause"); resetRender(); publishScene(); updateNowPlaying(); updateTaskDots(); maybeAdvance(); },
    onError(e) { loadFail(e); },
  });
}

function netState(cls, txt) { if (elNet) { elNet.className = "tray-ic net " + cls; elNet.textContent = txt || "▰▰▰"; } }

/* auto-advance: only on a *natural* finish (we were near the end and the user
   didn't stop/close), guarded so it fires once and doesn't trip the watchdog. */
function maybeAdvance() {
  if (!Settings.get("autoplay", true)) return;
  if (userStopping || isAdvancing || !active || active.song == null) return;
  if (!nearEnd) return;
  nearEnd = false; isAdvancing = true;
  const repeat = active.player && active.repeat;
  setTimeout(() => {
    if (repeat) { if (active.player) playerSelect(active, active.song, true); else loadSong(active, true); }
    else playNext(1);
    setTimeout(() => isAdvancing = false, 1500);
  }, 120);
}

function playNext(dir) {
  if (Cinema.running && active && active.key === "browser") { openNicoPage(active, active.song + dir); return; }
  if (!active) { if (apps.get("player")) playerSelect(apps.get("player"), 0, true); return; }
  if (active.player) {
    let ni = active.shuffle ? (Math.random() * SONGS.length) | 0 : active.song + dir;
    playerSelect(active, ni, true);
  } else {
    const app = openSong(active.song + dir); loadSong(app, true); focusWin(app);
  }
}

function loadSong(app, play) {
  active = app;
  resetRender();
  setStatus("load");
  app.el.lyric.classList.add("loading");
  alog(app, play ? "[load] booting decoder…" : "[load] preloading…", play ? "beat" : "");
  loadedIndex = app.song;
  pendingPlay = play; nearEnd = false;
  if (play) toast("Decoding " + SONGS[app.song].t + " ♪", "info");
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => loadFail(), 20000);
  Promise.resolve(player.createFromSongUrl(SONGS[app.song].url, { video: SONGS[app.song].v })).catch(loadFail);
}

function togglePlay(app) {
  if (!player) { toast("TextAlive isn't available — lyrics can't play.", "err"); return; }
  if (loadedIndex === app.song && app.song != null) {
    active = app;
    if (player.video) player.isPlaying ? player.requestPause() : player.requestPlay();
    else pendingPlay = true;
    return;
  }
  loadSong(app, true);
}

function resetRender() {
  phrase = null; chars = []; scrambleTick = -1;
  lastRenderPos = 0;                 // don't let a previous song's position leak into the next
  lyricFeedReset();
  if (active && active.el) { active.el.lyric.innerHTML = ""; active.el.hero.classList.remove("has-lyric"); active.el.stage && active.el.stage.classList.remove("chorus", "minorchord"); }
  lastBeat = -1; inChorus = false; bar = 0; lastDown = -1; pct = 0; lastChordMinor = null; lastBeatPos = -1;
}

function loadFail(e) {
  clearTimeout(loadTimer);
  if (player && player.video && !e) return;          // late watchdog on a slow-but-OK load
  pendingPlay = false;
  if (!active || !active.el) return;
  active.el.lyric.classList.remove("loading");
  active.el.hero.classList.add("has-lyric");
  const cause = !navigator.onLine ? "offline — check your connection"
    : !window.axios ? "axios (TextAlive peer dep) missing"
    : "no lyric/beat data — check connection & app token";
  active.el.lyric.innerHTML = '<div class="line err">✖ NO SIGNAL</div><div class="next">' + esc(cause) + "</div>";
  active.el.status.className = "statusline err";
  active.el.status.textContent = "● NO SIGNAL — decode failed";
  alog(active, "[err] decode timeout / no song data", "err");
  if (e && e.message) alog(active, `[err] ${e.message}`, "err");
  Sfx.play("error");
  const failApp = active;
  toast("NO SIGNAL — " + cause, "err", { label: "Retry", act: () => loadSong(failApp, true) });
}

function setStatus(state) {
  if (!active || !active.el) return;
  const st = active.el.status, s = active.song != null ? SONGS[active.song] : null;
  st.className = "statusline " + (state === "live" ? "live" : "");
  if (state === "idle") return void (st.textContent = "● STANDBY");
  if (state === "load") return void (st.textContent = "● LOADING…");
  const dot = state === "live" ? "▶" : "❚❚";
  st.textContent = s ? `${dot} ${pct}% · ${s.t} · BPM ${bpm}` : "● STANDBY";
  active.el.play.textContent = state === "live" ? "❚❚" : "▶";
  updateTaskDots();        // light update; do NOT rebuild the whole taskbar every frame
}

/* update only the taskbar play indicators without rebuilding the DOM */
function updateTaskDots() {
  for (const b of elTasks.children) {
    const app = apps.get(b.dataset.key);
    const playing = app === active && player && player.isPlaying;
    const dot = $(".dot", b); if (dot) dot.textContent = playing ? "▶" : "●";
  }
}

/* =====================================================================
   Lyric feed — a running, auto-scrolling transcript broadcast to any number
   of "sinks" (the browser results panel, the terminal, the editor). Driven
   by render() one line per phrase, so every surface follows the song live.
   ===================================================================== */
const LyricFeed = { sinks: new Set() };
/* opts.render(text) -> element lets a sink style each line (e.g. the browser
   renders lyrics AS search-result rows); opts.scrollEl is what gets scrolled to
   follow the lyrics (e.g. the whole browser viewport, not just the list). */
function lyricSinkAdd(el, opts = {}) {
  if (!el) return;
  el.classList.add("lyric-feed");
  el._lf = { last: "", render: opts.render || null, scrollEl: opts.scrollEl || el };
  el.innerHTML = "";                                  // drop any placeholder, start clean
  LyricFeed.sinks.add(el);
}
function lyricSinkRemove(el) { if (el) LyricFeed.sinks.delete(el); }
function lyricSinkClear() { LyricFeed.sinks.clear(); }
function lyricFeedReset() {
  for (const el of LyricFeed.sinks) { el.innerHTML = ""; if (el._lf) el._lf.last = ""; }
}
function lyricFeedPush(text) {
  text = (text || "").trim(); if (!text) return;
  for (const el of LyricFeed.sinks) {
    if (!el.isConnected) { LyricFeed.sinks.delete(el); continue; }   // window closed → self-clean
    const lf = el._lf || (el._lf = { last: "", render: null, scrollEl: el });
    if (lf.last === text) continue;
    lf.last = text;
    const prev = el.querySelector(".lf-line.cur"); if (prev) prev.classList.remove("cur");
    let line;
    if (lf.render) { line = lf.render(text); }
    else { line = document.createElement("div"); line.textContent = text; }
    line.classList.add("lf-line", "cur");
    el.appendChild(line);
    while (el.childElementCount > 80) el.firstElementChild.remove();
    const sc = lf.scrollEl; sc.scrollTop = sc.scrollHeight;          // follow the lyrics as they appear
  }
}

/* ---- per-frame render (active app only) ---------------------------------- */
function render(pos) {
  if (!active || !active.el || !player.video) return;
  lastRenderPos = pos;
  if (active.el.gate) active.el.gate.classList.add("hidden");   // playing → drop the click-to-play gate
  const v = player.video, dur = v.duration || 0;
  pct = dur ? clamp(Math.round((pos / dur) * 100), 0, 100) : 0;
  nearEnd = dur > 0 && pos >= dur - 600;
  active.el.fill.style.width = (dur ? (pos / dur) * 100 : 0) + "%";
  active.el.time.textContent = `${fmt(pos)} / ${fmt(dur)}`;

  const b = player.findBeat(pos);
  if (b) {
    bpm = Math.round(60000 / b.duration);
    if (b.startTime !== lastBeat) {
      lastBeat = b.startTime;
      window.MikuScene.beatAt = performance.now();
      if (active.danmaku) cineBeat();
      if (b.position === 1 && b.startTime !== lastDown) {
        lastDown = b.startTime;
        if (++bar % 4 === 0) alog(active, `[beat] bar ${bar}`, "beat");
      }
    }
  }
  // media-player visualizer (cheap, 16 nodes)
  if (active.player && active.el.viz && b) {
    const phase = clamp((pos - b.startTime) / (b.duration || 1), 0, 1);
    active.el.viz.forEach((bar, k) => { bar.style.transform = `scaleY(${0.18 + 0.82 * Math.abs(Math.sin(phase * Math.PI + k * 0.5))})`; });
  }
  // Nico danmaku-page visualizer — driven by the song's beat grid + chorus
  if (active.el.nicovis && active.el.nicovis.length) {
    const bp = b ? clamp((pos - b.startTime) / (b.duration || 1), 0, 1) : 1;
    const env = 1 - bp;                              // punches on each beat, decays before the next
    const boost = inChorus ? 1 : 0.78;
    const bars = active.el.nicovis, n = bars.length;
    for (let k = 0; k < n; k++) {
      const spatial = Math.abs(Math.sin(k * 0.5 + pos * 0.0042));
      const ripple = 0.5 + 0.5 * Math.sin(k * 1.3 - pos * 0.011);
      const h = clamp(0.12 + boost * (0.5 * spatial * (0.45 + 0.55 * env) + 0.42 * ripple * env), 0.05, 1);
      bars[k].style.transform = `scaleY(${h.toFixed(3)})`;
    }
  }

  // chord colour (major/minor brightness) — update only on change
  if (player.findChord) {
    const ch = player.findChord(pos);
    const minor = ch && /m(?!aj)/.test(ch.name || "");
    if (minor !== lastChordMinor) { lastChordMinor = minor; active.el.stage && active.el.stage.classList.toggle("minorchord", !!minor); }
  }

  const on = !!player.findChorus(pos);
  if (on !== inChorus) {
    inChorus = on;
    active.el.stage && active.el.stage.classList.toggle("chorus", on);
    alog(active, on ? "[sync] chorus LOCKED" : "[sync] released", "cho");
    publishScene();
  }

  setStatus("live");
  updateNowPlaying();

  const ph = v.findPhrase(pos);
  if (ph && ph !== phrase) { buildPhrase(ph); lyricFeedPush(ph.text); if (active.danmaku) spawnDanmaku(ph.text, pos, "lyric"); }
  active.el.hero.classList.toggle("has-lyric", !!ph);
  if (ph && chars.length) {
    const tick = (pos / 80) | 0, scram = tick !== scrambleTick;
    if (scram) scrambleTick = tick;
    for (const c of chars) {
      if (pos >= c.e) setCh(c, "done", c.ch);
      else if (pos >= c.s) setCh(c, "lit", c.ch);
      else if (reduceMotion) setCh(c, "pend", c.ch);
      else if (scram) setCh(c, "pend", rnd(GLYPHS));
    }
  }
}

function setCh(c, cls, txt) {
  if (c.el.textContent !== txt) c.el.textContent = txt;
  if (c.cls !== cls) { c.el.className = cls; c.cls = cls; }
}

function buildPhrase(ph) {
  phrase = ph; chars = [];
  const lyric = active.el.lyric;
  const line = document.createElement("div"); line.className = "line"; line.setAttribute("aria-hidden", "true");
  for (let w = ph.firstWord; w && w.parent === ph; w = w.next)
    for (let c = w.firstChar; c && c.parent === w; c = c.next) {
      const n = document.createElement("ch");
      n.textContent = c.text;
      line.appendChild(n);
      chars.push({ el: n, s: c.startTime, e: c.endTime, ch: c.text, cls: "" });
    }
  lyric.innerHTML = "";
  lyric.appendChild(line);
  if (ph.next) {
    const nx = document.createElement("div"); nx.className = "next"; nx.setAttribute("aria-hidden", "true");
    nx.textContent = ph.next.text || "";
    lyric.appendChild(nx);
  }
  // screen-reader: announce the whole phrase (not the scrambling chars)
  if (active.el.sr) active.el.sr.textContent = ph.text || "";
}

/* =====================================================================
   Now Playing tray transport
   ===================================================================== */
function updateNowPlaying() {
  const has = active && active.song != null && loadedIndex !== -1;
  elNowPlaying.classList.toggle("hidden", !has);
  if (!has) return;
  const s = SONGS[active.song];
  $(".np-label", elNowPlaying).textContent = s.t;
  $(".np-bar i", elNowPlaying).style.width = pct + "%";
  $(".np-play", elNowPlaying).textContent = player && player.isPlaying ? "❚❚" : "▶";
}
$(".np-prev", elNowPlaying).addEventListener("click", () => playNext(-1));
$(".np-next", elNowPlaying).addEventListener("click", () => playNext(1));
$(".np-play", elNowPlaying).addEventListener("click", () => { if (active) togglePlay(active); });
$(".np-title", elNowPlaying).addEventListener("click", () => { if (active) { restore(active); focusWin(active); } });

/* =====================================================================
   Shell — desktop icons, taskbar, start menu, tray flyouts, boot/login
   ===================================================================== */
const EXTRA_ICONS = [
  { key: "browser", icon: "🌐", label: "Internet", sub: "MikuNet", act: () => { const a = openBrowser(); brHome(a); }, cls: "app-browser" },
  { key: "player", icon: "♬", label: "Media Player", sub: "jukebox", act: () => openPlayer(), cls: "app-player" },
  { key: "explorer", icon: "💻", label: "My Computer", sub: "files", act: () => openExplorer(), cls: "app-explorer" },
  { key: "credits", icon: "★", label: "Credits", sub: "attribution", act: openCredits, cls: "app-readme" },
  { key: "readme", icon: "📄", label: "README.txt", sub: "about", act: openReadme, cls: "app-readme" },
];

function buildDesktop() {
  elIcons.innerHTML = "";
  SONGS.forEach((s, i) => {
    const ic = document.createElement("div");
    ic.className = "icon app-song"; ic.tabIndex = 0; ic.setAttribute("role", "button"); ic.setAttribute("aria-label", `${s.t} — ${s.a}`);
    ic.style.setProperty("--accent", s.c);
    ic.innerHTML = `<div class="glyph">${s.icon || "♪"}<span class="num">${i + 1}</span></div>` +
      `<div class="label">${esc(s.t)}</div><div class="sub">${esc(s.a)}</div>`;
    wireIcon(ic, () => startScenario(i), [
      { label: "Play music video ▶", icon: "🎬", act: () => startScenario(i) },
      { label: "Open in player", icon: "▶", act: () => openSong(i) },
      { label: "Add to Media Player", icon: "♬", act: () => openPlayer(i) },
      { label: "View lyrics (Notepad)", icon: "📄", act: () => openNotepad(i) },
      { sep: true }, { label: "Properties", icon: "ℹ", act: () => openImageViewer(i) },
    ]);
    elIcons.appendChild(ic);
  });
  EXTRA_ICONS.forEach((d) => {
    const ic = document.createElement("div");
    ic.className = "icon " + d.cls; ic.tabIndex = 0; ic.setAttribute("role", "button"); ic.setAttribute("aria-label", d.label);
    ic.innerHTML = `<div class="glyph">${d.icon}</div><div class="label">${d.label}</div><div class="sub">${d.sub}</div>`;
    wireIcon(ic, d.act, [{ label: "Open", icon: "▶", act: d.act }]);
    elIcons.appendChild(ic);
  });
}

/* desktop icon: select on click, launch on dblclick / Enter / (touch) single tap */
function wireIcon(ic, launch, ctxItems) {
  ic.addEventListener("click", (e) => {
    e.stopPropagation();
    for (const o of elIcons.children) o.classList.toggle("sel", o === ic);
  });
  // touch: a single tap selects + launches (double-click is awkward on touchscreens)
  if (coarse) ic.addEventListener("click", launch);
  ic.addEventListener("dblclick", launch);
  ic.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); launch(); } });
  ic.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); showContextMenu(e.clientX, e.clientY, ctxItems || [{ label: "Open", act: launch }]); });
}
elDesktop.addEventListener("click", () => { for (const o of elIcons.children) o.classList.remove("sel"); coachDismiss(); });
elDesktop.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".icon")) return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, [
    { label: "Refresh", icon: "↻", act: () => { elDesktop.classList.add("refresh"); setTimeout(() => elDesktop.classList.remove("refresh"), 220); } },
    { label: "Arrange Icons", icon: "▦", act: buildDesktop },
    { sep: true },
    { label: "Media Player", icon: "♬", act: () => openPlayer() },
    { label: "Display Properties", icon: "🛠️", act: openControlPanel },
  ]);
});

/* marquee (rubber-band) multi-select over empty desktop */
let marquee = null, mqStart = null;
elDesktop.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".icon, .win, #taskbar, .startmenu, .ctxmenu, .flyout")) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  mqStart = toScreen(e.clientX, e.clientY);
  marquee = document.createElement("div"); marquee.className = "marquee"; elDesktop.appendChild(marquee);
});
elDesktop.addEventListener("pointermove", (e) => {
  if (!marquee) return;
  const p = toScreen(e.clientX, e.clientY);
  const x = Math.min(p.x, mqStart.x), y = Math.min(p.y, mqStart.y), w = Math.abs(p.x - mqStart.x), h = Math.abs(p.y - mqStart.y);
  marquee.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const ox = elIcons.offsetLeft, oy = elIcons.offsetTop;
  for (const ic of elIcons.children) {
    const il = ox + ic.offsetLeft, it = oy + ic.offsetTop;
    ic.classList.toggle("sel", il < x + w && il + ic.offsetWidth > x && it < y + h && it + ic.offsetHeight > y);
  }
});
const endMarquee = () => { if (marquee) { marquee.remove(); marquee = null; } };
elDesktop.addEventListener("pointerup", endMarquee);
elDesktop.addEventListener("pointercancel", endMarquee);

function renderTasks() {
  elTasks.innerHTML = "";
  for (const app of apps.values()) {
    const b = document.createElement("button");
    b.dataset.key = app.key;
    const isPlaying = app === active && player && player.isPlaying;
    b.className = "task" + (app.win.classList.contains("focused") && !app.min ? " active" : "");
    b.setAttribute("aria-label", app.title);
    b.innerHTML = `<span class="dot">${isPlaying ? "▶" : "●"}</span><span>${app.icon} ${esc(app.title.split(" — ")[0])}</span>`;
    b.addEventListener("click", () => { if (app.min) restore(app); else if (app.win.classList.contains("focused")) minimize(app); else focusWin(app); });
    b.addEventListener("mouseenter", () => taskPreview(b, app));
    b.addEventListener("mouseleave", () => { const p = $("#taskprev"); if (p) p.remove(); });
    elTasks.appendChild(b);
  }
}
function taskPreview(btn, app) {
  const old = $("#taskprev"); if (old) old.remove();
  const p = document.createElement("div"); p.id = "taskprev"; p.className = "taskprev";
  const live = app === active && app.song != null ? ` · ${player && player.isPlaying ? "▶" : "❚❚"} ${pct}% · BPM ${bpm}` : "";
  p.innerHTML = `<b>${esc(app.title)}</b>${live}`;
  screenEl.appendChild(p);
  const pt = toScreen(btn.getBoundingClientRect().left, btn.getBoundingClientRect().top);
  p.style.left = clamp(pt.x, 4, 1280 - p.offsetWidth - 4) + "px";
  p.style.top = (pt.y - p.offsetHeight - 4) + "px";
}

/* ---- start menu ---------------------------------------------------------- */
const MRU = [];
function pushMRU(i) { const x = MRU.indexOf(i); if (x >= 0) MRU.splice(x, 1); MRU.unshift(i); if (MRU.length > 4) MRU.length = 4; buildStartList(); }
function buildStartList() {
  elSmList.innerHTML = "";
  if (MRU.length) {
    const h = document.createElement("li"); h.className = "sm-head-li"; h.textContent = "Recently played"; elSmList.appendChild(h);
    MRU.forEach((i) => elSmList.appendChild(songLi(i)));
    const sep = document.createElement("li"); sep.className = "sm-li-sep"; elSmList.appendChild(sep);
  }
  const h2 = document.createElement("li"); h2.className = "sm-head-li"; h2.textContent = "All songs"; elSmList.appendChild(h2);
  SONGS.forEach((s, i) => elSmList.appendChild(songLi(i)));
}
function songLi(i) {
  const s = SONGS[i];
  const li = document.createElement("li"); li.setAttribute("role", "menuitem"); li.tabIndex = 0;
  li.innerHTML = `<span class="si" style="--accent:${s.c}">${s.icon || "♪"}</span><span class="st">${esc(s.t)}</span>` +
    `<span class="sa">${esc(s.a)}</span><span class="sn">${i + 1}</span>`;
  const go = () => { openSong(i); toggleStart(false); };
  li.addEventListener("click", go);
  li.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  return li;
}
function buildStartMenu() {
  buildStartList();
  const acts = {
    player: () => openPlayer(), documents: () => openExplorer("My Documents"), explorer: () => openExplorer(),
    control: openControlPanel, run: openRun, credits: openCredits, help: openReadme,
  };
  $$(".sm-right .ri", elStartMenu).forEach((ri) => ri.addEventListener("click", () => { const a = acts[ri.dataset.act]; if (a) { a(); toggleStart(false); } }));
  $("#turnoff").addEventListener("click", () => { toggleStart(false); turnOff(); });
  $("#logoff").addEventListener("click", () => { toggleStart(false); logOff(); });
}

function toggleStart(force) {
  const open = force != null ? force : elStartMenu.classList.contains("hidden");
  elStartMenu.classList.toggle("hidden", !open);
  elStart.classList.toggle("open", open);
  elStart.setAttribute("aria-expanded", open ? "true" : "false");
}
elStart.addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });

/* ---- Run… dialog --------------------------------------------------------- */
async function openRun() {
  const r = await makeDialog("Run", `<div class="run"><span class="run-ic">▶</span>
    <div>Type a song number (1–6), name, or a command (readme, credits, player, ver):</div>
    <input id="run-in" type="text" autocomplete="off" placeholder="e.g. takeover" /></div>`,
    [{ label: "OK", id: "ok", primary: true }, { label: "Cancel", id: "cancel" }]);
  if (r !== "ok") return;
  const val = ($("#run-in") && $("#run-in").value || "").trim().toLowerCase();
  if (!val) return;
  if (/^[1-6]$/.test(val)) return void openSong(+val - 1);
  if (val === "readme") return openReadme();
  if (val === "credits") return openCredits();
  if (val === "player" || val === "music") return void openPlayer();
  if (val === "explorer" || val === "files") return void openExplorer();
  if (val === "control" || val === "settings") return openControlPanel();
  if (val === "ver") return void makeDialog("MikuOS", "<p style='padding:6px 2px'>MikuOS v2.6 — マジカルミライ 2026<br>powered by TextAlive App API</p>", [{ label: "OK", id: "ok", primary: true }]);
  if (val === "miku") return void toast("39 39 ♪ miku miku", "ok");
  const i = SONGS.findIndex((s) => (s.t + " " + s.r + " " + s.e).toLowerCase().includes(val));
  if (i >= 0) openSong(i); else toast(`Cannot find "${val}". Try 1–6 or a song name.`, "warn");
}

/* ---- tray flyouts: volume + clock ---------------------------------------- */
elVolBtn.dataset.flyout = "1";
elVolBtn.addEventListener("click", (e) => {
  e.stopPropagation(); dismissTransients();
  const f = document.createElement("div"); f.className = "flyout volflyout"; f.id = "volflyout";
  f.innerHTML = `<div class="vf-title">Volume</div><div class="vf-slider"><div class="fill" style="height:${muted ? 0 : volume}%"></div></div>
    <button class="vf-mute tbtn">${muted ? "Unmute" : "Mute"}</button>`;
  screenEl.appendChild(f);
  positionFlyout(f, elVolBtn);
  const sl = $(".vf-slider", f);
  const setFromY = (cy) => { const r = sl.getBoundingClientRect(); setVolume(clamp(Math.round((1 - (cy - r.top) / r.height) * 100), 0, 100)); $(".fill", sl).style.height = volume + "%"; };
  sl.addEventListener("pointerdown", (ev) => { setFromY(ev.clientY); sl.setPointerCapture(ev.pointerId); sl.onpointermove = (m) => m.buttons && setFromY(m.clientY); });
  sl.addEventListener("pointerup", () => sl.onpointermove = null);
  $(".vf-mute", f).addEventListener("click", () => { toggleMute(); $(".fill", sl).style.height = (muted ? 0 : volume) + "%"; $(".vf-mute", f).textContent = muted ? "Unmute" : "Mute"; });
  openFlyout = f;
});

elClock.dataset.flyout = "1";
elClock.addEventListener("click", (e) => {
  e.stopPropagation(); dismissTransients();
  const f = document.createElement("div"); f.className = "flyout clockflyout"; f.id = "clockflyout";
  const d = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  let grid = days.map((x) => `<span class="cf-dow">${x}</span>`).join("");
  for (let k = 0; k < first; k++) grid += "<span></span>";
  for (let day = 1; day <= dim; day++) grid += `<span class="${day === d.getDate() ? "cf-today" : ""}">${day}</span>`;
  const np = active && active.song != null ? `<div class="cf-np">♪ ${esc(SONGS[active.song].t)} · ${esc(SONGS[active.song].a)}<br>BPM ${bpm} · ${pct}%</div>` : "";
  f.innerHTML = `<div class="cf-date">${d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
    <div class="cf-cal"><div class="cf-mon">${months[d.getMonth()]} ${d.getFullYear()}</div><div class="cf-grid">${grid}</div></div>${np}`;
  screenEl.appendChild(f);
  positionFlyout(f, elClock);
  openFlyout = f;
});
function positionFlyout(f, anchor) {
  const a = toScreen(anchor.getBoundingClientRect().left, anchor.getBoundingClientRect().top);
  f.style.left = clamp(a.x - f.offsetWidth / 2 + anchor.offsetWidth / 2, 4, 1280 - f.offsetWidth - 4) + "px";
  f.style.bottom = "34px";
}

/* ---- Show Desktop -------------------------------------------------------- */
let desktopShown = false, restoreSet = [];
$("#showdesktop").addEventListener("click", () => {
  if (!desktopShown) { restoreSet = [...apps.values()].filter((a) => !a.min).map((a) => a.key); restoreSet.forEach((k) => minimize(apps.get(k))); desktopShown = true; }
  else { restoreSet.forEach((k) => apps.get(k) && restore(apps.get(k))); desktopShown = false; }
});

/* clock — wall clock for OS vibe; date tooltip; respects 12/24h setting */
function tickClock() {
  const d = new Date();
  let h = d.getHours();
  let label;
  if (Settings.get("clock24", true)) label = `${String(h).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  else { const ap = h < 12 ? "AM" : "PM"; const h12 = h % 12 || 12; label = `${h12}:${String(d.getMinutes()).padStart(2, "0")} ${ap}`; }
  elClock.textContent = label;
  elClock.title = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

/* =====================================================================
   Boot → login → desktop, and shutdown / restart / log off
   ===================================================================== */
const BOOT_LINES = [
  "Starting MikuOS …",
  "Linking TextAlive App API …",
  "Loading 6 contest tracks …",
  "Applying personalized settings …",
  "Welcome — click your user name ♪",
];
function boot() {
  elBoot.classList.remove("hidden"); elShutdown.classList.add("hidden");
  document.body.classList.add("powered");
  // power-on bloom (scene.js creates the overlay; it may not exist yet on first paint)
  const pulse = () => { if (window.MikuScene && window.MikuScene.powerOn) window.MikuScene.powerOn(); else setTimeout(pulse, 80); };
  pulse();
  let i = 0, buf = [];
  (function step() {
    if (i < BOOT_LINES.length) {
      buf.push(`<span class="ok">${BOOT_LINES[i++]}</span>`);
      elBootLog.innerHTML = buf.join("\n");
      setTimeout(step, reduceMotion ? 120 : 360);
    } else setTimeout(showLogin, reduceMotion ? 200 : 650);
  })();
}
function showLogin() {
  elBoot.classList.add("hidden");
  buildLogin();
  elLogin.classList.remove("hidden");
}

/* ---- XP multi-account welcome: 6 song "accounts" + Free Play ------------- */
function buildLogin() {
  const list = $("#login-accounts"); if (!list) return;
  list.innerHTML = "";
  SONGS.forEach((s, i) => list.appendChild(loginTile({
    cls: "acct-song", accent: s.c, icon: s.icon || "♪",
    name: s.t, hint: `${s.r}${s.e ? " · " + s.e : ""}`, sub: s.a,
    act: () => chooseAccount(() => startScenario(i)),
  })));
  list.appendChild(loginTile({
    cls: "acct-free", accent: "#8fd6ff", icon: "🖥",
    name: "Free Play", hint: "explore MikuOS freely", sub: "sandbox",
    act: () => chooseAccount(startCoach),
  }));
}
function loginTile({ cls, accent, icon, name, hint, sub, act }) {
  const b = document.createElement("button");
  b.className = "login-acct " + cls; b.style.setProperty("--accent", accent);
  b.innerHTML = `<span class="acct-av">${icon}</span>` +
    `<span class="acct-meta"><b>${esc(name)}</b><span class="acct-hint">${esc(hint)}</span></span>` +
    `<span class="acct-sub">${esc(sub || "")}</span>`;
  b.addEventListener("click", act);
  return b;
}
// every login choice IS the first user gesture → unlock WebAudio here
function chooseAccount(after) {
  Sfx.unlock(); Sfx.play("chime");
  elLogin.classList.add("hidden");
  loggedIn = true;
  setTimeout(after, 140);
}

async function turnOff() {
  const r = await makeDialog("Turn off computer", `<div class="shutdash">
      <button class="sd-opt" data-id="standby"><span>🌙</span>Stand By</button>
      <button class="sd-opt" data-id="off"><span>⏻</span>Turn Off</button>
      <button class="sd-opt" data-id="restart"><span>↻</span>Restart</button></div>`,
    [{ label: "Cancel", id: "cancel" }]);
  // also allow clicking the three buttons directly
  // (makeDialog resolves on footer button; wire the opts here via a second pass)
}
// wire shutdown option buttons whenever the dialog body is present
screenEl.addEventListener("click", (e) => {
  const opt = e.target.closest(".sd-opt"); if (!opt) return;
  const dlg = opt.closest(".dialog"); if (dlg) { dlg.previousElementSibling && dlg.previousElementSibling.remove(); dlg.remove(); dlgStack.pop(); }
  const id = opt.dataset.id;
  try { player && player.requestStop(); } catch {}
  if (id === "off") doShutdown();
  else if (id === "restart") doRestart();
  else if (id === "standby") toast("Standing by… (just kidding — MikuOS never sleeps ♪)", "info");
});
function doShutdown() {
  Sfx.play("shutdown");
  for (const a of [...apps.values()]) { apps.delete(a.key); a.win.remove(); }
  renderTasks(); updateNowPlaying();
  elShutdown.classList.remove("hidden");
}
function powerOn() { elShutdown.classList.add("hidden"); loadedIndex = -1; active = null; boot(); }
elShutdown.addEventListener("click", powerOn);
/* physical bezel buttons on the 3D CRT (scene.js raycaster calls these) */
window.MikuScene.pressPower = () => { elShutdown.classList.contains("hidden") ? doShutdown() : powerOn(); };
window.MikuScene.pressRestart = () => doRestart();
function doRestart() {
  Sfx.play("shutdown");
  for (const a of [...apps.values()]) { apps.delete(a.key); a.win.remove(); }
  loadedIndex = -1; active = null; renderTasks(); updateNowPlaying();
  boot();
}
function logOff() {
  try { player && player.requestStop(); } catch {}
  for (const a of [...apps.values()]) { apps.delete(a.key); a.win.remove(); }
  loadedIndex = -1; active = null; loggedIn = false; renderTasks(); updateNowPlaying();
  elLogin.classList.remove("hidden");
}

/* =====================================================================
   Coach mark + idle attract loop
   ===================================================================== */
let coachEl = null, idleTimer = 0, coachSeen = false;
function startCoach() { if (coachSeen) return; showCoach(); }
function showCoach() {
  if (coachEl || !elIcons.firstChild) return;
  coachEl = document.createElement("div"); coachEl.className = "coach";
  coachEl.innerHTML = `<b>${coarse ? "タップ / tap" : "ダブルクリック / double-click"}</b><span>a song to begin ♪</span>`;
  elDesktop.appendChild(coachEl);
  const ic = elIcons.firstChild;
  coachEl.style.left = (ic.offsetLeft + ic.offsetWidth + 6) + "px";
  coachEl.style.top = (ic.offsetTop + 8) + "px";
}
function coachDismiss() { if (coachEl) { coachEl.remove(); coachEl = null; } resetIdle(); }
function resetIdle() {
  clearTimeout(idleTimer);
  if (!loggedIn) return;
  idleTimer = setTimeout(() => { if (!apps.size && !coachEl) { coachSeen = false; showCoach(); } }, 25000);
}
screenEl.addEventListener("pointerdown", resetIdle, true);

/* =====================================================================
   Cinematic — the scripted "music video" scenario.
   Pick a song account at login (or right-click a song → Play music video):
     fake browser → auto-typed search → an all-lyrics results page →
     a scripted cursor clicks through to a Nico-Nico-style page that plays
     the REAL TextAlive song with danmaku (scrolling-comment) lyrics, while
     the OS comes alive around it (toasts, an error, a terminal, an editor,
     an office app). Esc exits; Space/Skip jumps past the intro.
   ===================================================================== */
const CINE_ABORT = { cineAbort: true };
const REACTIONS = ["888888", "かわいい", "神曲", "ミク最高", "↑↑↑↑", "ここすき", "🎉🎉", "wwwww",
  "沸いた", "好きだ", "コメント職人", "クル", "🔥🔥", "neon", "center", "美しい", "天才", "うぽつ",
  "イントロ好き", "サビ最高", "鳥肌", "尊い", "ありがとう", "🎶", "リピート不可避"];
const LYRIC_SITES = [
  { host: "piapro.jp", tag: "ピアプロ — PIAPRO" },
  { host: "www.j-lyric.net", tag: "J-Lyric.net" },
  { host: "utaten.com", tag: "UtaTen" },
  { host: "vocaloidlyrics.fandom.com", tag: "VOCALOID Lyrics Wiki" },
  { host: "www.uta-net.com", tag: "歌ネット" },
  { host: "petitlyrics.com", tag: "PetitLyrics" },
  { host: "kashinavi.com", tag: "歌詞ナビ" },
  { host: "www.kkbox.com", tag: "KKBOX" },
];
const Cinema = { running: false, phase: "", song: -1, cursor: null, cx: 640, cy: 440, timers: [], rejectors: [], aborted: false, skipping: false, views: 0 };

/* cancelable delay — rejects with CINE_ABORT when the show is skipped/stopped */
function cineSleep(ms) {
  return new Promise((resolve, reject) => {
    if (Cinema.aborted) return reject(CINE_ABORT);
    const wait = reduceMotion ? Math.min(ms, 40) : ms;
    const id = setTimeout(() => {
      Cinema.timers = Cinema.timers.filter((t) => t !== id);
      Cinema.rejectors = Cinema.rejectors.filter((r) => r !== reject);
      resolve();
    }, wait);
    Cinema.timers.push(id); Cinema.rejectors.push(reject);
  });
}
function cineClearTimers() {
  Cinema.timers.forEach(clearTimeout); Cinema.timers = [];
  const rs = Cinema.rejectors; Cinema.rejectors = [];
  rs.forEach((r) => r(CINE_ABORT));
}
function cineGuard() { if (!Cinema.running || Cinema.aborted) throw CINE_ABORT; }

/* ---- fake cursor (lives in the 1280x1025 plane) --------------------------- */
function cineCursor() {
  if (Cinema.cursor) return Cinema.cursor;
  const c = document.createElement("div"); c.className = "cine-cursor";
  c.innerHTML = '<svg viewBox="0 0 20 28" width="20" height="28"><path d="M3 2 L3 22 L8 17 L11.5 24 L14.5 22.6 L11 15.5 L18 15 Z" fill="#fff" stroke="#1b1b1b" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  c.style.left = Cinema.cx + "px"; c.style.top = Cinema.cy + "px";
  screenEl.appendChild(c); Cinema.cursor = c; return c;
}
function cineHideCursor(remove) {
  if (!Cinema.cursor) return;
  if (remove) { Cinema.cursor.remove(); Cinema.cursor = null; }
  else Cinema.cursor.classList.add("idle");
}
function cineMove(x, y, ms = 680) {
  const c = cineCursor();
  c.classList.remove("idle");
  c.style.transition = reduceMotion ? "none" : `left ${ms}ms cubic-bezier(.45,.05,.2,1), top ${ms}ms cubic-bezier(.45,.05,.2,1)`;
  // force the start position to register before moving
  void c.offsetWidth;
  c.style.left = x + "px"; c.style.top = y + "px";
  Cinema.cx = x; Cinema.cy = y;
  return cineSleep(reduceMotion ? 0 : ms);
}
function elCenter(el) {
  const r = el.getBoundingClientRect(), sr = screenEl.getBoundingClientRect(), s = scrScale();
  return { x: (r.left - sr.left) / s + r.width / s / 2, y: (r.top - sr.top) / s + r.height / s / 2 };
}
async function cineClickEl(el, settle = 240) {
  if (!el) return;
  const { x, y } = elCenter(el);
  await cineMove(x, y);
  const c = cineCursor(); c.classList.add("down"); el.classList.add("cine-hot");
  Sfx.play("open");
  await cineSleep(110);
  c.classList.remove("down"); el.classList.remove("cine-hot");
  await cineSleep(settle);
}
async function cineType(input, text, per = 85) {
  const isInput = "value" in input;
  if (isInput) input.value = ""; else input.textContent = "";
  for (const ch of text) {
    cineGuard();
    if (isInput) input.value += ch; else input.textContent += ch;
    await cineSleep(per + Math.random() * per * 0.5);
  }
}

/* ---- the fake browser ---------------------------------------------------- */
function openBrowser() {
  const key = "browser";
  let app = apps.get(key);
  if (app) { restore(app); return app; }
  app = makeWindow(key, "MikuNet Explorer", "🌐", "app-browser");
  app.win.insertAdjacentHTML("beforeend",
    `<div class="appbody browser">
       <div class="br-bar">
         <button class="tbtn br-nav" aria-label="back">◀</button>
         <button class="tbtn br-nav" aria-label="forward">▶</button>
         <button class="tbtn br-nav br-reload" aria-label="reload">↻</button>
         <div class="br-url"><span class="br-lock">🔒</span><span class="br-addr">about:home</span></div>
         <button class="tbtn br-go">Go</button>
       </div>
       <div class="br-prog"><i></i></div>
       <div class="br-view"></div>
     </div>
     <div class="br-engine" aria-hidden="true">
       <div class="stage"><div class="hero"><div class="titlecard"></div><div class="lyric"></div></div></div>
       <p class="sr-lyric"></p>
       <span class="fill"></span><span class="time"></span><span class="statusline"></span><button class="play"></button>
     </div>`);
  // app.el starts wired to the hidden engine so the shared player can drive
  // playback (and the lyric timeline) before the visible lyric panel exists;
  // brResults() re-points the visual fields to the on-page panel, and
  // openNicoPage() re-points them again to the danmaku stage.
  app.el = {
    addr: $(".br-addr", app.win), view: $(".br-view", app.win), prog: $(".br-prog", app.win),
    stage: $(".br-engine .stage", app.win), hero: $(".br-engine .hero", app.win),
    titlecard: $(".br-engine .titlecard", app.win), lyric: $(".br-engine .lyric", app.win),
    sr: $(".br-engine .sr-lyric", app.win), fill: $(".br-engine .fill", app.win),
    time: $(".br-engine .time", app.win), status: $(".br-engine .statusline", app.win),
    play: $(".br-engine .play", app.win),
  };
  makeResizable(app, 560, 380);
  placeWin(app, 80, 44, 1120, 884);   // large, but never fullscreen
  return app;
}
function setAddr(app, url) { if (app.el && app.el.addr) app.el.addr.textContent = url; }
function brProgress(app) {
  if (!app.el || !app.el.prog) return;
  app.el.prog.classList.remove("run"); void app.el.prog.offsetWidth; app.el.prog.classList.add("run");
  setTimeout(() => app.el && app.el.prog && app.el.prog.classList.remove("run"), 950);
}
function brHome(app) {
  setAddr(app, "https://mikusearch.jp");
  app.el.view.innerHTML =
    `<div class="br-home">
       <div class="br-logo"><span class="g1">M</span><span class="g2">i</span><span class="g3">k</span><span class="g4">u</span>Search</div>
       <div class="br-search"><input class="br-q" readonly aria-label="search" placeholder="うたを さがそう ♪"><button class="br-sbtn">検索</button></div>
       <div class="br-tags">歌詞 · lyrics · TextAlive · マジカルミライ 2026</div>
     </div>`;
}
function brResults(app, q, page) {
  const total = 7240 + (q.length * 137);
  const s = SONGS[Cinema.song];
  // a single top result the cursor clicks through; the rest of the results are
  // the live lyrics, which stream in below as the song plays.
  const top = LYRIC_SITES[0];
  app.el.view.innerHTML =
    `<div class="br-results" style="--accent:${esc(s.c)}">
       <div class="br-results-bar"><span class="br-mini">Miku<b>Search</b></span>
         <span class="br-q2">${esc(q)}</span></div>
       <div class="br-stat">約 ${total.toLocaleString()} 件 (0.${30 + page}秒) — すべて歌詞サイト · <b class="br-live">▶ 歌詞を再生中</b></div>
       <div class="br-list">
         <a class="br-result rhide" data-anchor="1" tabindex="0">
           <div class="br-r-url"><span class="br-fav">🎵</span>${esc(top.host)} › lyric/1050</div>
           <div class="br-r-title">${esc(s.t)}「${esc(s.r)}」歌詞 — ${esc(s.a)} | ${esc(top.tag)}</div>
           <div class="br-r-snip">${esc(s.t)} の歌詞ページ。${esc(s.a)} feat. 初音ミク。フルで歌詞を表示 — 再生に合わせて表示中 …</div>
         </a>
         <div class="br-lyric-results lyric-feed" aria-live="polite"></div>
       </div>
     </div>`;
}
/* register the results list as the lyric sink: each phrase streams in as its own
   search-result row, and the whole browser viewport scrolls to follow. Playback
   keeps running on the hidden engine, so render() keeps feeding this. */
function bindBrowserLyrics(app, s) {
  const list = $(".br-lyric-results", app.win); if (!list) return;
  app.danmaku = null;
  let n = 0;
  lyricSinkClear();
  lyricSinkAdd(list, {
    scrollEl: app.el.view,
    render: (text) => {
      n++;
      const site = LYRIC_SITES[n % LYRIC_SITES.length];
      const row = document.createElement("a");
      row.className = "br-result br-lyric-result";
      row.innerHTML =
        `<div class="br-r-url"><span class="br-fav">🎵</span>${esc(site.host)} › 歌詞/${1050 + n}</div>` +
        `<div class="br-r-title">${esc(text)}</div>` +
        `<div class="br-r-snip">「${esc(s.t)}」${esc(s.r)} — ${esc(s.a)} feat. 初音ミク · 歌詞 ${n}行目 …</div>`;
      return row;
    },
  });
}
async function streamResults(app) {
  const rows = $$(".br-result", app.win);
  for (const r of rows) { cineGuard(); r.classList.remove("rhide"); await cineSleep(150); }
}

/* smoothly animate a scroll container to `to` (px) — awaitable, motion-safe */
function cineScrollTo(el, to, ms = 1100) {
  return new Promise((resolve) => {
    if (!el || reduceMotion) { if (el) el.scrollTop = to; return resolve(); }
    const from = el.scrollTop, d = to - from, t0 = performance.now();
    if (Math.abs(d) < 2) { el.scrollTop = to; return resolve(); }
    const ease = (p) => 1 - Math.pow(1 - p, 3);
    requestAnimationFrame(function step(now) {
      if (!Cinema.running || Cinema.aborted) { el.scrollTop = to; return resolve(); }
      const p = Math.min(1, (now - t0) / ms);
      el.scrollTop = from + d * ease(p);
      if (p < 1) requestAnimationFrame(step); else resolve();
    });
  });
}

/* linger on the results page until playback passes `frac` of the song, so the
   live lyrics panel shows at least that much. Bails early if autoplay was
   blocked (so we fall through to the Nico page's click-to-play gate). */
async function cineWaitForFraction(frac) {
  const t0 = performance.now(); let everPlayed = false;
  for (;;) {
    cineGuard();
    const dur = player && player.video ? (player.video.duration || 0) : 0;
    const pos = lastRenderPos;
    if (pos > 0 || (player && player.isPlaying)) everPlayed = true;
    const el = performance.now() - t0;
    if (everPlayed && dur && pos >= dur * frac) return;   // reached the target fraction
    if (!everPlayed && el > 6500) return;                 // never started → autoplay blocked
    if (el > 100000) return;                              // absolute safety cap
    await cineSleep(300);
  }
}

/* a hidden playback surface so the song can load (and later play) before the
   browser window exists — render() drives this until the Nico stage takes over. */
function cineMakeLoader(i) {
  const host = document.createElement("div");
  host.className = "cine-loader"; host.setAttribute("aria-hidden", "true");
  host.innerHTML =
    `<div class="stage"><div class="hero"><div class="titlecard"></div><div class="lyric"></div></div></div>` +
    `<p class="sr-lyric"></p><span class="fill"></span><span class="time"></span>` +
    `<span class="statusline"></span><button class="play"></button>`;
  screenEl.appendChild(host);
  return { key: "cine-loader", win: host, song: i, _loader: true, el: {
    stage: $(".stage", host), hero: $(".hero", host), titlecard: $(".titlecard", host),
    lyric: $(".lyric", host), sr: $(".sr-lyric", host), fill: $(".fill", host),
    time: $(".time", host), status: $(".statusline", host), play: $(".play", host),
  } };
}
function cineRemoveLoader() { const h = $(".cine-loader", screenEl); if (h) h.remove(); }

/* wait until the TextAlive timeline is ready (or give up after a while) */
async function cineWaitForLoad(maxMs = 16000) {
  const t0 = performance.now();
  for (;;) {
    cineGuard();
    if (!player) return false;
    if (player.video) return true;
    if (performance.now() - t0 > maxMs) return false;
    await cineSleep(220);
  }
}

/* the loading terminal — shows while the song decodes, then closes */
function cineLoadingTerminal(i) {
  const s = SONGS[i];
  const app = makeWindow("cine-term0", "miku@mikuos: ~", "💻", "app-term");
  app.win.insertAdjacentHTML("beforeend", `<div class="appbody term"><pre class="term-out"></pre></div>`);
  placeWin(app, 372, 250, 536, 226);
  return app;
}

/* ---- the scripted intro -------------------------------------------------- */
async function introSequence(i) {
  const s = SONGS[i];
  screenEl.classList.add("cine-auto");           // hide the real cursor while auto-driving
  cineCursor();

  // 1) load the song FIRST, on a hidden surface, with a terminal showing progress
  const loader = cineMakeLoader(i);
  if (player) loadSong(loader, false);           // preload only — playback starts at the results page
  const term = cineLoadingTerminal(i);
  const out = $(".term-out", term.win);
  await typePre(out, [
    `miku@mikuos:~$ mikuload --song "${s.r}"`,
    `[ .. ] connecting TextAlive …`,
    `[ ok ] token validated`,
    `[ .. ] fetching beat / chord / 歌詞 timeline …`,
  ], 16);
  await cineWaitForLoad();
  const pc = (player && player.video && player.video.phraseCount) || "—";
  await typePre(out, [`[ ok ] decode ready — ${pc} phrases`, `miku@mikuos:~$ start MikuNet Explorer`], 13);
  await cineSleep(650);
  if (apps.get("cine-term0") === term) closeApp(term);   // loading done → terminal closes

  // 2) the mouse selects the browser on the desktop and opens it
  const icon = $(".icon.app-browser", elIcons);
  if (icon) await cineClickEl(icon, 220);
  const app = openBrowser();
  app.song = i;
  brProgress(app);
  await cineSleep(360);
  brHome(app);
  await cineSleep(560);

  // 3) type the title and search
  const box = $(".br-q", app.win);
  await cineClickEl(box, 160);
  await cineType(box, `${s.t} 歌詞`);             // what we type is still the title
  await cineSleep(280);
  await cineClickEl($(".br-sbtn", app.win), 180);
  brProgress(app);
  await cineSleep(740);

  // 4) results appear → the song starts playing and the lyrics ARE the results
  setAddr(app, `https://mikusearch.jp/search?q=${encodeURIComponent(s.t + " 歌詞")}`);
  brResults(app, `${s.t} 歌詞`, 1);
  bindBrowserLyrics(app, s);
  if (player && player.video) { try { Promise.resolve(player.requestPlay()).catch(() => {}); } catch {} }   // play immediately on the results page
  await streamResults(app);
  await cineWaitForFraction(0.25);                // keep the lyric-results scrolling for ≥1/4 of the song

  // 5) scroll back up and click through to the Nico video page
  lyricSinkClear();
  await cineScrollTo(app.el.view, 0);
  await cineSleep(300);
  await cineClickEl($(".br-result", app.win), 200);
  brProgress(app); await cineSleep(820);
  await openNicoPage(app, i);
}

/* ---- the Nico-Nico-style danmaku page (the centerpiece) ------------------ */
function nicoId(i) { return "sm" + (43000000 + i * 137911 + 421); }
async function openNicoPage(app, i) {
  i = (i + SONGS.length) % SONGS.length;
  const s = SONGS[i];
  Cinema.phase = "play";
  hideSkip();
  const t0 = apps.get("cine-term0"); if (t0) closeApp(t0);   // drop the loading terminal (skip path)
  cineRemoveLoader();                                        // the hidden loader hands off to the Nico stage
  lyricSinkClear();                                          // results feed is about to be replaced
  setAddr(app, `https://www.nicovideo.jp/watch/${nicoId(i)}`);
  const bars = Array.from({ length: 28 }, () => "<i></i>").join("");
  app.el.view.innerHTML =
    `<div class="nico" style="--accent:${s.c}">
       <div class="nico-main">
         <div class="stage nico-stage">
           <div class="nico-vis">${bars}</div>
           <div class="nico-danmaku" aria-hidden="true"></div>
           <div class="hero"><div class="titlecard"></div><div class="lyric"></div></div>
           <p class="sr-lyric sr-only" aria-live="polite"></p>
           <div class="nico-badge">▶ nicovideo</div>
           <div class="nico-gate hidden"><button class="nico-gate-btn" aria-label="play">▶</button><span>クリックで再生 · click to play ♪</span></div>
         </div>
         <div class="nico-ctrl">
           <button class="tbtn play" aria-label="play / pause">❚❚</button>
           <div class="seek" role="slider" aria-label="seek"><div class="fill"></div></div>
           <span class="time">0:00 / 0:00</span>
           <span class="statusline live">● BUFFERING…</span>
         </div>
         <div class="nico-meta">
           <div class="nico-title">${esc(s.t)}</div>
           <div class="nico-sub">${esc(s.r)}${s.e ? " / " + esc(s.e) : ""} — ${esc(s.a)} feat. 初音ミク · ${nicoId(i)}</div>
           <div class="nico-stats"><span>▶ <b class="nico-views">12,034</b> 再生</span><span>💬 <b class="nico-cc">0</b></span><span>♥ マイリスト</span></div>
         </div>
       </div>
       <div class="nico-side"><div class="nico-side-h">コメント</div><div class="nico-cmt-list"></div></div>
     </div>`;
  app.win.classList.add("browsing-nico");
  // (no auto-maximize — the video page stays a normal window)

  // wire the browser app up as a playback surface so render() drives it
  app.song = i;
  app.danmaku = $(".nico-danmaku", app.win);
  app.el.stage = $(".nico-stage", app.win);
  app.el.hero = $(".hero", app.win);
  app.el.titlecard = $(".titlecard", app.win);
  app.el.lyric = $(".lyric", app.win);
  app.el.sr = $(".sr-lyric", app.win);
  app.el.fill = $(".fill", app.win);
  app.el.time = $(".time", app.win);
  app.el.status = $(".statusline", app.win);
  app.el.play = $(".play", app.win);
  app.el.cmtList = $(".nico-cmt-list", app.win);
  app.el.views = $(".nico-views", app.win);
  app.el.cc = $(".nico-cc", app.win);
  app.el.gate = $(".nico-gate", app.win);
  app.el.nicovis = $$(".nico-vis i", app.win);     // bars driven by the song in render()
  app.lines = [];
  Cinema.views = 12034; Cinema.cc = 0;
  showTitleCard(app, s);
  app.el.play.addEventListener("click", () => togglePlay(app));
  // click-to-play gate (a fresh gesture) — shown only if browser autoplay blocks us
  app.el.gate.addEventListener("click", () => { app.el.gate.classList.add("hidden"); togglePlay(app); });
  $(".seek", app.win).addEventListener("pointerdown", (e) => {
    if (!player || !player.video) return;
    const r = e.currentTarget.getBoundingClientRect();
    try { player.requestMediaSeek(clamp((e.clientX - r.left) / r.width, 0, 1) * (player.video.duration || 0)); } catch {}
  });

  screenEl.classList.remove("cine-auto");        // hand control back to the user
  cineHideCursor(true);
  Sfx.play("ding");
  pushMRU(i);

  if (player) {
    // the song was already loaded (and playing) on the results page — keep going
    // from where it is rather than restarting; just rebind to the danmaku stage.
    const continuing = loadedIndex === i && player.video;
    if (continuing) { active = app; phrase = null; chars = []; setStatus("live"); }
    else loadSong(app, true);
    nicoPlayWatch(app, 0);
  }
  else { app.el.status.textContent = "● NO SIGNAL — TextAlive unavailable"; toast("TextAlive unavailable — can't play audio.", "err"); }

  if (!Cinema.flourishOn) startFlourishes(i);     // run the OS-comes-alive sequence once
}
/* if autoplay is blocked, surface a one-click play gate; hide it once playing */
function nicoPlayWatch(app, tries) {
  const id = setTimeout(() => {
    if (apps.get("browser") !== app || !app.el || !app.el.gate) return;
    if (player && player.isPlaying) { app.el.gate.classList.add("hidden"); return; }
    if (player && player.video) app.el.gate.classList.remove("hidden");   // ready but not playing → blocked
    if (tries < 18) nicoPlayWatch(app, tries + 1);
  }, 700);
  Cinema.timers.push(id);
}

/* one scrolling comment per phrase + ambient viewer reactions */
function spawnDanmaku(text, pos, kind) {
  text = (text || "").trim(); if (!text) return;
  const app = active; if (!app || !app.danmaku) return;
  if (!reduceMotion) {
    const c = document.createElement("span");
    c.className = "dm " + (kind || "lyric");
    c.textContent = text;
    const lane = Math.floor(Math.random() * 13);
    c.style.top = (3 + lane * 6.6) + "%";
    const dur = 6200 + Math.floor(Math.random() * 2800);
    c.style.setProperty("--dmdur", dur + "ms");
    if (kind === "lyric") c.style.fontSize = (20 + Math.random() * 8).toFixed(0) + "px";
    app.danmaku.appendChild(c);
    if (app.danmaku.childElementCount > 60) app.danmaku.firstChild.remove();
    const id = setTimeout(() => c.remove(), dur + 250); Cinema.timers.push(id);
  }
  // side comment list
  if (app.el && app.el.cmtList) {
    const row = document.createElement("div"); row.className = "nico-cmt-row";
    row.innerHTML = `<span class="nc-t">${esc(fmt(pos || 0))}</span><span class="nc-x">${esc(text)}</span>`;
    app.el.cmtList.appendChild(row);
    while (app.el.cmtList.childElementCount > 40) app.el.cmtList.firstChild.remove();
    app.el.cmtList.scrollTop = app.el.cmtList.scrollHeight;
    Cinema.cc++; if (app.el.cc) app.el.cc.textContent = Cinema.cc;
  }
}
function cineBeat() {
  const app = active; if (!app || !app.el || !app.el.stage) return;
  app.el.stage.classList.add("beat");
  setTimeout(() => app.el && app.el.stage && app.el.stage.classList.remove("beat"), 90);
}

/* ---- the OS coming alive: a few ambient toasts (extra windows removed) --- */
async function startFlourishes(i) {
  Cinema.flourishOn = true;
  ambientLoop();
  try {
    await cineSleep(2600); cineGuard(); toast(`▶ いま再生中 — ${SONGS[i].t} / ${SONGS[i].a}`, "ok");
    await cineSleep(4400); cineGuard(); toast("MikuOS Update: 新しいビジュアライザ「Danmaku」が利用可能です", "info");
    await cineSleep(5200); cineGuard(); toast("レンダリング快調 · 60fps · GPU: MikuGL", "ok");
  } catch (e) { /* aborted — show is over */ }
}
async function ambientLoop() {
  while (Cinema.running && apps.has("browser")) {
    try { await cineSleep(800 + Math.random() * 900); } catch { break; }
    if (!apps.has("browser")) break;
    if (player && player.isPlaying && !reduceMotion && active && active.danmaku) {
      spawnDanmaku(rnd(REACTIONS), lastRenderPos, "react");
    }
    if (active && active.el && active.el.views) {
      Cinema.views += 1 + Math.floor(Math.random() * 4);
      active.el.views.textContent = Cinema.views.toLocaleString();
    }
  }
}
function placeWin(app, x, y, w, h) {
  app.win.style.left = clamp(x, 0, 1280 - 120) + "px";
  app.win.style.top = clamp(y, 0, 995 - 60) + "px";
  if (w) app.win.style.width = w + "px";
  if (h) app.win.style.height = h + "px";
}
async function typePre(el, lines, per = 24) {
  el.textContent = "";
  for (const ln of lines) {
    for (const ch of ln) { cineGuard(); el.textContent += ch; if (Math.random() < .5) await cineSleep(per); }
    el.textContent += "\n"; el.scrollTop = el.scrollHeight; await cineSleep(per * 6);
  }
}
/* ---- skip control + scenario lifecycle ----------------------------------- */
/* the Skip button was removed; Space/Enter still skips the intro from the keyboard */
function hideSkip() { const b = $("#cine-skip"); if (b) b.remove(); }
function skipIntro() {
  if (!Cinema.running || Cinema.phase !== "intro") return;
  Cinema.skipping = true; Cinema.aborted = true; cineClearTimers();
}
function startScenario(i) {
  if (Cinema.running) endScenario(false);
  // stop any pre-existing Free-Play playback so it doesn't bleed into the intro
  if (active && active.key !== "browser") {
    userStopping = true;
    try { player && player.requestStop(); } catch {}
    setTimeout(() => userStopping = false, 300);
  }
  i = (i + SONGS.length) % SONGS.length;
  coachDismiss();
  Cinema.song = i; Cinema.running = true; Cinema.aborted = false; Cinema.skipping = false; Cinema.flourishOn = false; Cinema.phase = "intro";
  if (reduceMotion) {                              // graceful degrade — skip the theatre, just play
    Cinema.running = false; Cinema.phase = "";
    const app = openSong(i); loadSong(app, true); focusWin(app);
    toast("Reduced-motion is on — playing without the cinematic.", "info");
    return;
  }
  runScenario(i);
}
async function runScenario(i) {
  try {
    await introSequence(i);
  } catch (e) {
    if (e !== CINE_ABORT) { console.error("[cine]", e); return; }
    if (Cinema.skipping && Cinema.running) {       // skipped the intro → jump straight to the player
      Cinema.skipping = false; Cinema.aborted = false; Cinema.timers = []; Cinema.rejectors = [];
      const app = openBrowser();
      try { await openNicoPage(app, i); } catch (_) {}
    }
  }
}
function endScenario(toDesktop = true) {
  if (!Cinema.running) return;
  Cinema.running = false; Cinema.phase = ""; Cinema.flourishOn = false; Cinema.aborted = true;
  cineClearTimers();
  hideSkip(); cineHideCursor(true); cineRemoveLoader();
  lyricSinkClear();
  screenEl.classList.remove("cine-auto");
  ["browser", "cine-term0"].forEach((k) => {
    const a = apps.get(k); if (a) { apps.delete(k); a.win.remove(); }
  });
  // only tear down playback if the cinematic actually owns the player — a
  // pre-existing Free-Play song must keep playing.
  if (active && (active.key === "browser" || active._loader)) {
    try { player && player.requestStop(); } catch {}
    active = null; loadedIndex = -1;
  }
  renderTasks(); updateNowPlaying(); publishScene();
  Cinema.aborted = false;
  if (toDesktop) { Sfx.play("close"); resetIdle(); }
}

/* ---- keyboard ------------------------------------------------------------ */
addEventListener("keydown", (e) => {
  if (e.target.matches("input,textarea")) return;
  if (e.key === "Escape") {                          // precedence: scenario → cinema → menu/flyout → dialog → start → window
    if (Cinema.running) return endScenario();
    if (cinemaApp) return exitCinema();
    if (openMenu || openFlyout) return dismissTransients();
    if (dlgStack.length) return void dlgStack[dlgStack.length - 1]();
    if (!elStartMenu.classList.contains("hidden")) return toggleStart(false);
    const focused = [...apps.values()].find((a) => a.win.classList.contains("focused") && !a.min);
    if (focused) closeApp(focused);
    return;
  }
  if (dlgStack.length) return;                        // a modal owns the keyboard
  if (!loggedIn) return;                               // ignore shortcuts behind the login/welcome screen
  if (Cinema.running) {                                // during the show: Space/Enter skips the intro
    if (Cinema.phase === "intro" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); skipIntro(); }
    else if (e.key === " ") { e.preventDefault(); if (active) togglePlay(active); }
    return;
  }
  if (e.key >= "1" && e.key <= "6") { coachDismiss(); openSong(+e.key - 1); }
  else if (e.key === " ") { e.preventDefault(); if (active) togglePlay(active); }
  else if (e.key.toLowerCase() === "f") { if (active && active.song != null) toggleCinema(active); }
});

/* online / offline */
addEventListener("offline", () => { netState("err", "✖"); toast("You are offline — lyrics unavailable until you reconnect.", "warn"); });
addEventListener("online", () => { netState("on", "▰▰▰"); toast("Back online", "ok"); });

/* ---- go ------------------------------------------------------------------ */
Settings.load();
applySettings();
buildDesktop();
buildStartMenu();
renderTasks();
updateVolumeUI();
tickClock();
{ const d = new Date(); setTimeout(() => { tickClock(); setInterval(tickClock, 60000); }, (60 - d.getSeconds()) * 1000); }
boot();
init();
