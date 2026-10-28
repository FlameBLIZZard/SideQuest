# Adding an app

1. Create `apps/<slug>/index.html`. Copy the skeleton below.
2. Add an entry to the `APPS` list in the root `index.html` (slug, name, icon, color, description, tags).
3. Add a row to the app table in `README.md` and a screenshot in `docs/screenshots/`.
4. Run `npm test`.

## Skeleton

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MyToy · Sidequest</title>
<link rel="stylesheet" href="../../shared/sq.css">
<style>
  :root { --accent: #22d3ee; --accent-ink: #001417; } /* pick a color no other app uses */
</style>
</head>
<body>
<header class="sq-top">
  <a class="home" href="../../index.html">← Sidequest</a>
  <h1><span class="dot"></span>MyToy</h1>
  <span class="mute">one-line description</span>
  <div class="spacer"></div>
  <div class="actions"><button class="primary" id="save">Save</button></div>
</header>
<main class="sq-app">
  <aside class="sq-side"><section class="panel"><h2>Controls</h2></section></aside>
  <div class="sq-stage"><canvas id="cv"></canvas></div>
</main>
<script src="../../shared/sq.js"></script>
<script>
const { $, el } = SQ;
// your app here
</script>
</body>
</html>
```

## Helpers in `shared/sq.js`

| Helper | What it does |
|---|---|
| `SQ.$(sel)`, `SQ.$$(sel)` | `querySelector` / `querySelectorAll` (as an array) |
| `SQ.el(tag, attrs, ...children)` | Create an element. `onclick` etc. become listeners, `style` takes an object (CSS variables too). |
| `SQ.toast(msg)` | Small message at the bottom of the screen |
| `SQ.download(blobOrText, filename)` | Save a file |
| `SQ.canvasBlob(canvas, type, quality)` | Promise of a canvas as a Blob |
| `SQ.store.get(key, fallback)` / `.set(key, value)` | JSON in localStorage, never throws |
| `SQ.idb(name)` | Tiny IndexedDB key/value store for big things like audio |
| `SQ.rng(seed)`, `SQ.pick(arr, rng)` | Seeded random numbers |
| `SQ.recorder(canvas, { fps, audio })` | Record a canvas (plus optional audio stream) to MP4/WebM |
| `SQ.encodeWAV(audioBuffer)` | AudioBuffer to WAV Blob |
| `SQ.fmtTime(seconds)` | `125` → `2:05` |
| `SQ.isTyping(event)` | True when the user is typing in a field, so shortcuts can skip |

## Layout classes in `shared/sq.css`

`sq-top` (header bar), `sq-app` (sidebar + stage grid), `sq-side`, `sq-stage`, `panel`, `stack`, `row`, `field`, `check`, `mute`, `mono`, `checker`, and buttons with `primary`, `ghost`, `on`, `icon`. Colors come from CSS variables (`--bg`, `--panel`, `--ink`, `--mute`, `--line`, `--accent`), and light/dark is handled for you.
